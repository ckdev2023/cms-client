/**
 * BUG-160 [P2][BE]：POST /api/cases 500 → 400 / 5xx 带 detail。
 *
 * 修复契约：
 * - 已知业务错误（HttpException）原样透传，不被 catch 改写。
 * - PG 约束违例（23503 / 23505 / 23514）→ 400 CASE_CREATE_FAILED + detail。
 * - 未知 throw → 500 CASE_CREATE_FAILED + detail。
 * - BMV 门禁拦截 → 400 CASE_BMV_GATE_BLOCKED + blockers。
 *
 * 覆盖 5 类异常映射场景。
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";
import { BadRequestException, HttpException } from "@nestjs/common";

import { CasesService } from "./cases.service";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { BMV_CASE_CREATION_GATE_CODES } from "./cases.types-bmv-gate";
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

function svc(pool: ReturnType<typeof makePool>) {
  return new CasesService(pool as unknown as Pool, makeTemplates() as never);
}

const BASE_INPUT = {
  customerId: CUSTOMER_ID,
  caseTypeCode: "visa",
  ownerUserId: USER_ID,
};

// ─── (a) biz_mgmt_4m + 空 baseProfile → 400 CASE_BMV_GATE_BLOCKED ───

void test("BUG-160(a): biz_mgmt_4m + 空 baseProfile → 400 CASE_BMV_GATE_BLOCKED with 4 blockers", async () => {
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
    () =>
      svc(pool).create(makeCtx(), {
        ...BASE_INPUT,
        caseTypeCode: "biz_mgmt_4m",
      }),
    (err: unknown) => {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED);
      const blockers = body.blockers as { code: string }[];
      assert.equal(blockers.length, 4);
      const codes = blockers.map((b) => b.code).sort();
      assert.deepEqual(
        codes,
        [
          BMV_CASE_CREATION_GATE_CODES.INTAKE_NOT_READY,
          BMV_CASE_CREATION_GATE_CODES.NOT_SIGNED,
          BMV_CASE_CREATION_GATE_CODES.QUESTIONNAIRE_NOT_RETURNED,
          BMV_CASE_CREATION_GATE_CODES.QUOTE_NOT_CONFIRMED,
        ].sort(),
      );
      return true;
    },
  );
});

// ─── (b) PG 23503 FK 抛错 → 400 CASE_CREATE_FAILED + detail.pgCode=23503 ───

void test("BUG-160(b): PG 23503 FK violation → 400 CASE_CREATE_FAILED + detail.pgCode=23503", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) {
      const pgErr: Error & { code?: string; constraint?: string } =
        Object.assign(new Error("FK violation"), {
          code: "23503",
          constraint: "fk_cases_owner_user",
        });
      throw pgErr;
    }
    return ok();
  });

  await assert.rejects(
    () => svc(pool).create(makeCtx(), BASE_INPUT),
    (err: unknown) => {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.CREATE_FAILED);
      const detail = body.detail as Record<string, unknown>;
      assert.equal(detail.source, "pg");
      assert.equal(detail.pgCode, "23503");
      assert.equal(detail.constraint, "fk_cases_owner_user");
      return true;
    },
  );
});

// ─── (c) PG 23514 check 抛错 → 400 CASE_CREATE_FAILED ───

void test("BUG-160(c): PG 23514 check constraint → 400 CASE_CREATE_FAILED", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) {
      const pgErr: Error & { code?: string; constraint?: string } =
        Object.assign(new Error("check constraint violation"), {
          code: "23514",
          constraint: "chk_cases_stage",
        });
      throw pgErr;
    }
    return ok();
  });

  await assert.rejects(
    () => svc(pool).create(makeCtx(), BASE_INPUT),
    (err: unknown) => {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.CREATE_FAILED);
      const detail = body.detail as Record<string, unknown>;
      assert.equal(detail.source, "pg");
      assert.equal(detail.pgCode, "23514");
      return true;
    },
  );
});

// ─── (d) 非 PG Error → 500 CASE_CREATE_FAILED + detail ───

void test("BUG-160(d): 非 PG Error → 500 CASE_CREATE_FAILED + detail", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("insert into cases")) {
      throw new Error("unexpected disk full");
    }
    return ok();
  });

  await assert.rejects(
    () => svc(pool).create(makeCtx(), BASE_INPUT),
    (err: unknown) => {
      assert.ok(err instanceof HttpException);
      assert.equal(err.getStatus(), 500);
      const body = err.getResponse() as Record<string, unknown>;
      assert.equal(body.code, CASE_WRITE_ERROR_CODES.CREATE_FAILED);
      assert.ok(
        typeof body.detail === "string" &&
          body.detail.includes("unexpected disk full"),
      );
      return true;
    },
  );
});

// ─── (e) 现有 BadRequest（GROUP_NOT_FOUND）原样透传 ───

void test("BUG-160(e): 现有 BadRequest (GROUP_NOT_FOUND) 原样透传不被改写", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("select id from customers") ||
      sql.includes("select id from users")
    )
      return ok([{ id: params?.[0] }]);
    if (sql.includes("FROM customers c") && sql.includes("JOIN groups g"))
      return ok([]);
    if (sql.includes("select id from groups")) return ok([]);
    return ok();
  });

  await assert.rejects(
    () =>
      svc(pool).create(makeCtx(), {
        ...BASE_INPUT,
        groupId: "ghost-group",
      }),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      assert.equal(err.getStatus(), 400);
      const body = err.getResponse();
      const msg =
        typeof body === "string"
          ? body
          : (body as { message?: string }).message;
      assert.ok(
        msg?.includes("CASE_GROUP_NOT_FOUND"),
        `expected CASE_GROUP_NOT_FOUND in message, got: ${msg ?? "(undefined)"}`,
      );
      return true;
    },
  );
});
