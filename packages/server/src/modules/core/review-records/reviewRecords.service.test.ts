import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  ReviewRecordsService,
  mapReviewRecordRow,
} from "./reviewRecords.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000003";
const REVIEW_RECORD_ID = "00000000-0000-4000-8000-000000000004";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeReviewRecordRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REVIEW_RECORD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    validation_run_id: VALIDATION_RUN_ID,
    decision: "approved",
    comment: "ok",
    reviewer_user_id: USER_ID,
    reviewed_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePool(
  queryFn: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>,
): Pool {
  const isTxSql = (sql: string) =>
    /^(begin|commit|rollback|select set_config)/.test(sql.trim().toLowerCase());
  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) =>
          isTxSql(sql)
            ? Promise.resolve({ rows: [], rowCount: 0 })
            : queryFn(sql, params),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function makeCases() {
  return {
    service: {
      get: () =>
        Promise.resolve({ id: CASE_ID, status: "S5", caseTypeCode: "visa" }),
    },
  };
}

function svc(pool: Pool, timeline = makeTimeline()) {
  const cases = makeCases();
  return {
    service: new ReviewRecordsService(
      pool,
      cases.service as never,
      timeline.service as never,
    ),
    timeline,
  };
}

void test("mapReviewRecordRow maps DB row to entity", () => {
  const mapped = mapReviewRecordRow(makeReviewRecordRow());
  assert.equal(mapped.id, REVIEW_RECORD_ID);
  assert.equal(mapped.validationRunId, VALIDATION_RUN_ID);
  assert.equal(mapped.decision, "approved");
});

void test("ReviewRecordsService.create inserts review for latest passed validation run", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql });
    if (
      sql.includes("where id = $1 and org_id = $2") &&
      sql.includes("from validation_runs")
    ) {
      return Promise.resolve({
        rows: [
          { id: VALIDATION_RUN_ID, case_id: CASE_ID, result_status: "passed" },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("order by executed_at desc")) {
      return Promise.resolve({
        rows: [{ id: VALIDATION_RUN_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into review_records")) {
      return Promise.resolve({ rows: [makeReviewRecordRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { service, timeline } = svc(pool);

  const created = await service.create(makeCtx(), {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    decision: "approved",
    comment: "looks good",
  });
  assert.equal(created.id, REVIEW_RECORD_ID);
  assert.equal(timeline.writes.length, 1);
  assert.ok(
    calls.some((call) => call.sql.includes("insert into review_records")),
  );
});

void test("ReviewRecordsService.create rejects approval for failed validation run", async () => {
  const pool = makePool((sql) => {
    if (
      sql.includes("where id = $1 and org_id = $2") &&
      sql.includes("from validation_runs")
    ) {
      return Promise.resolve({
        rows: [
          { id: VALIDATION_RUN_ID, case_id: CASE_ID, result_status: "failed" },
        ],
        rowCount: 1,
      });
    }
    if (sql.includes("order by executed_at desc")) {
      return Promise.resolve({
        rows: [{ id: VALIDATION_RUN_ID }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { service } = svc(pool);

  await assert.rejects(
    () =>
      service.create(makeCtx(), {
        caseId: CASE_ID,
        validationRunId: VALIDATION_RUN_ID,
        decision: "approved",
      }),
    /Approved review record requires a passed validation run/,
  );
});

void test("ReviewRecordsService.list filters by case and validation run", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)::text")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from review_records")) {
      return Promise.resolve({ rows: [makeReviewRecordRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { service } = svc(pool);

  const result = await service.list(makeCtx("viewer"), {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.ok(calls.some((call) => call.sql.includes("case_id = $2")));
  assert.ok(calls.some((call) => call.sql.includes("validation_run_id = $3")));
});
