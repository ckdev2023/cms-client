/**
 * Bug D regression test
 *
 * 场景：当案件在 S6 时调用 `SubmissionPackagesService.create`，应在创建
 * SubmissionPackage 行之前预校验 S6→S7 transition gate（计费记录、欠款风险
 * 确认等）。原实现先创建 SP 再调用 `casesService.transition` 推进阶段，
 * 若推进失败则 SP 已经 commit 但 stage 没有前进，造成孤儿 SP。
 *
 * 本测试通过断言：
 * 1. 没有 billing_records 时 `create` 直接抛 SP_CASE / billing 错误；
 * 2. 失败路径下不会执行 `insert into submission_packages`。
 */
import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { SubmissionPackagesService } from "./submissionPackages.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000010";
const REQUIREMENT_ID = "00000000-0000-4000-8000-000000000040";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

function makeCtx(role: RequestContext["role"] = "staff"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function makeTimeline() {
  return {
    write: () => Promise.resolve(),
  };
}

function makeCases(stage: string) {
  return {
    get: () =>
      Promise.resolve({
        id: CASE_ID,
        stage,
        status: stage,
        caseTypeCode: "visa",
      }),
    transition: () =>
      Promise.resolve({ id: CASE_ID, stage: "S7", status: "S7" }),
    incrementSupplementCount: () => Promise.resolve(),
  };
}

function makeTemplatesResolver() {
  return {
    resolve: () => Promise.resolve({ mode: "legacy" as const, used: false }),
  };
}

void test("Bug D: S6→S7 preflight rejects when no billing record exists, without inserting SP", async () => {
  const calls: string[] = [];
  const queryFn: QueryFn = (sql) => {
    calls.push(sql);
    if (sql.includes("from billing_records") && sql.includes("case_id")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };

  const svc = new SubmissionPackagesService(
    makePool(queryFn),
    makeTimeline() as never,
    makeCases("S6") as never,
    makeTemplatesResolver() as never,
  );

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        authorityName: "Tokyo Immigration",
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S6" },
          },
        ],
      }),
    /CASE_STAGE_BILLING_RECORD_REQUIRED/,
  );

  // 关键断言：失败路径下没有执行 SP 插入（避免孤儿数据）。
  assert.equal(
    calls.some((sql) => sql.includes("insert into submission_packages")),
    false,
    "submission_packages insert should not happen when preflight fails",
  );
});

void test("Bug D: S7 case path does NOT trigger preflight (no further stage transition)", async () => {
  const billingChecks: string[] = [];
  const queryFn: QueryFn = (sql) => {
    if (sql.includes("from billing_records")) {
      billingChecks.push(sql);
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("from validation_runs")) {
      return Promise.resolve({
        rows: [],
        rowCount: 0,
      });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };

  const svc = new SubmissionPackagesService(
    makePool(queryFn),
    makeTimeline() as never,
    makeCases("S7") as never,
    makeTemplatesResolver() as never,
  );

  // 在 S7 状态下 SP 应该照常按既有 gate（validation_run 等）拒绝；
  // 关键是不应触发 billing_records 预校验（那是 S6→S7 的 gate）。
  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        submissionKind: "supplement",
        relatedSubmissionId: "00000000-0000-4000-8000-0000000000ff",
        authorityName: "Tokyo Immigration",
        submittedAt: "2026-04-01T10:00:00.000Z",
        items: [
          {
            itemType: "field_snapshot",
            refId: REQUIREMENT_ID,
            snapshotPayload: { stage: "S7" },
          },
        ],
      }),
    Error,
  );

  assert.equal(
    billingChecks.length,
    0,
    "S7 path should not call billing_records preflight",
  );
});
