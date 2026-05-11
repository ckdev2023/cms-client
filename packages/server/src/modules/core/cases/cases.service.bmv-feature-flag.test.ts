/**
 * 经营管理签建案 feature flag 闸口校验。
 *
 * 修复 lead → case 转化时的「半个 feature flag 守卫」死锁：
 * - customers controller 的 BMV 写入端点（送问卷/生成报价/登记签约）
 *   被 `assertBmvEnabled` 守卫，flag 关闭时返回 403。
 * - 但 cases.service 仅按 `caseTypeCode` 触发 BMV 闸口，忽略 flag。
 *
 * 修复后契约：
 * - flag 关闭 + BMV 案件类型 → 400 CASE_BMV_FEATURE_DISABLED（带统一 blocker）
 * - flag 开启 + BMV 案件类型 → 走原 BMV_GATE_BLOCKED 闸口校验
 * - 非 BMV 案件类型 → 不触发 flag 检查，正常建案
 * - featureFlagsService 未注入（旧测试场景）→ 跳过 flag 检查（向后兼容）
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";
import { BadRequestException, HttpException } from "@nestjs/common";

import { CasesService } from "./cases.service";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CUSTOMER_ID = "00000000-0000-4000-a000-000000000001";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[]; rowCount: number }>;

const ok = (rows: unknown[] = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });

const isTxSql = (s: string) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());

function makePool(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s: string, p?: unknown[]) => (isTxSql(s) ? ok() : qf(s, p)),
        release: () => undefined,
      }),
  };
}

function makeTemplates() {
  return {
    resolve: () => Promise.resolve({ mode: "legacy", used: false } as const),
  };
}

function disabledFlags(): FeatureFlagsService {
  return {
    resolve: () =>
      Promise.resolve({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      }),
  } as unknown as FeatureFlagsService;
}

function enabledFlags(): FeatureFlagsService {
  return {
    resolve: () => Promise.resolve({ key: "bmv", enabled: true, used: true }),
  } as unknown as FeatureFlagsService;
}

function makeService(
  pool: ReturnType<typeof makePool>,
  flags?: FeatureFlagsService,
) {
  return new CasesService(
    pool as unknown as Pool,
    makeTemplates() as never,
    undefined,
    undefined,
    undefined,
    flags,
  );
}

const BASE_INPUT = {
  customerId: CUSTOMER_ID,
  caseTypeCode: "business_manager_visa",
  ownerUserId: USER_ID,
  forceCreate: true,
};

void test("BMV case type + flag disabled → 400 CASE_BMV_FEATURE_DISABLED", async () => {
  let baseProfileQueried = false;
  const pool = makePool((sql) => {
    if (sql.includes("select base_profile from customers")) {
      baseProfileQueried = true;
    }
    return ok();
  });

  await assert.rejects(
    () => makeService(pool, disabledFlags()).create(makeCtx(), BASE_INPUT),
    (err: unknown) => {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.BMV_FEATURE_DISABLED);
      const blockers = body.blockers as { code: string }[];
      assert.equal(blockers.length, 1);
      assert.equal(blockers[0].code, "BMV_FEATURE_DISABLED");
      return true;
    },
  );

  // flag 检查应在 transaction 之前完成，不应触达 base_profile 查询。
  assert.equal(
    baseProfileQueried,
    false,
    "flag check must short-circuit before BMV gate query",
  );
});

void test("BMV case type + flag enabled → 仍走原 BMV_GATE_BLOCKED 闸口", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("select base_profile from customers"))
      return ok([{ base_profile: null }]);
    return ok();
  });

  await assert.rejects(
    () => makeService(pool, enabledFlags()).create(makeCtx(), BASE_INPUT),
    (err: unknown) => {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED);
      assert.ok(Array.isArray(body.blockers));
      return true;
    },
  );
});

void test("非 BMV 案件类型 + flag disabled → 不触发 flag 检查", async () => {
  let flagResolveCalled = false;
  const flags: FeatureFlagsService = {
    resolve: () => {
      flagResolveCalled = true;
      return Promise.resolve({
        key: "bmv",
        enabled: false,
        used: false,
        reason: "disabled",
      });
    },
  } as unknown as FeatureFlagsService;

  const pool = makePool((sql) => {
    if (sql.includes("select id from")) return ok([{ id: "x" }]);
    if (sql.includes("insert into cases"))
      return ok([{ id: "case-1", case_no: "CASE-001" }]);
    return ok();
  });

  // 非 BMV 类型可能因其他依赖（template/insert）失败，
  // 这里只关心 flag.resolve 是否被调用。
  await makeService(pool, flags)
    .create(makeCtx(), { ...BASE_INPUT, caseTypeCode: "tech_humanities" })
    .catch(() => undefined);

  assert.equal(
    flagResolveCalled,
    false,
    "flag resolution must not be invoked for non-BMV case types",
  );
});

void test("featureFlagsService 未注入（旧用例兼容）→ 跳过 flag 检查直接走 BMV 闸口", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("select base_profile from customers"))
      return ok([{ base_profile: null }]);
    return ok();
  });

  await assert.rejects(
    () => makeService(pool).create(makeCtx(), BASE_INPUT),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED);
      return true;
    },
  );
});
