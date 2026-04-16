import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  ValidationRunsService,
  mapValidationRunRow,
} from "./validationRuns.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000003";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeValidationRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VALIDATION_RUN_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    ruleset_ref: { gate: "submission_readiness" },
    result_status: "passed",
    blocking_count: 0,
    warning_count: 0,
    report_payload: { checks: [] },
    executed_by: USER_ID,
    executed_at: "2026-01-01T00:00:00.000Z",
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
        Promise.resolve({
          id: CASE_ID,
          stage: "S5",
          status: "S5",
          caseTypeCode: "visa",
        }),
    },
  };
}

function svc(pool: Pool, timeline = makeTimeline()) {
  const cases = makeCases();
  return {
    service: new ValidationRunsService(
      pool,
      cases.service as never,
      timeline.service as never,
    ),
    timeline,
  };
}

void test("mapValidationRunRow maps DB row to entity", () => {
  const mapped = mapValidationRunRow(makeValidationRunRow());
  assert.equal(mapped.id, VALIDATION_RUN_ID);
  assert.equal(mapped.caseId, CASE_ID);
  assert.equal(mapped.resultStatus, "passed");
  assert.deepEqual(mapped.reportPayload, { checks: [] });
});

void test("ValidationRunsService.create inserts passed run and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (
      sql.includes("from generated_documents") &&
      sql.includes("status not in")
    ) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    if (sql.includes("from generated_documents")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("insert into validation_runs")) {
      return Promise.resolve({ rows: [makeValidationRunRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { service, timeline } = svc(pool);

  const created = await service.create(makeCtx(), { caseId: CASE_ID });
  assert.equal(created.resultStatus, "passed");
  assert.equal(timeline.writes.length, 1);
  assert.ok(
    calls.some((call) => call.sql.includes("insert into validation_runs")),
  );
});

void test("ValidationRunsService.create persists failed run when generated documents are missing", async () => {
  const pool = makePool((sql) => {
    if (
      sql.includes("from generated_documents") &&
      sql.includes("status not in")
    ) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    if (sql.includes("from generated_documents")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    if (sql.includes("insert into validation_runs")) {
      return Promise.resolve({
        rows: [
          makeValidationRunRow({
            result_status: "failed",
            blocking_count: 1,
            report_payload: {
              checks: [{ code: "generated_documents_present", passed: false }],
            },
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { service } = svc(pool);

  const created = await service.create(makeCtx(), { caseId: CASE_ID });
  assert.equal(created.resultStatus, "failed");
  assert.equal(created.blockingCount, 1);
});

void test("ValidationRunsService.list filters by org and caseId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)::text")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from validation_runs")) {
      return Promise.resolve({ rows: [makeValidationRunRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const { service } = svc(pool);
  const result = await service.list(makeCtx("viewer"), { caseId: CASE_ID });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.ok(calls.some((call) => call.sql.includes("org_id = $1")));
  assert.ok(calls.some((call) => call.sql.includes("case_id = $2")));
});
