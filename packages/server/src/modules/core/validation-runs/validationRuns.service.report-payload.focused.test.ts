import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { ValidationRunsService } from "./validationRuns.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VR_ID = "00000000-0000-4000-8000-000000000010";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

function makeValidationRunRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VR_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    ruleset_ref: { gate: "submission_readiness" },
    result_status: "passed",
    blocking_count: 0,
    warning_count: 0,
    report_payload: {},
    executed_by: USER_ID,
    executed_at: "2026-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

let capturedPayload: unknown = null;

function makePool(generatedDocCount: number, blockedDocCount: number): Pool {
  const isTxSql = (sql: string) =>
    /^(begin|commit|rollback|select set_config)/.test(sql.trim().toLowerCase());

  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) => {
          if (isTxSql(sql)) {
            return Promise.resolve({ rows: [], rowCount: 0 });
          }
          if (
            sql.includes("from generated_documents") &&
            sql.includes("status not in")
          ) {
            return Promise.resolve({
              rows: [{ count: String(blockedDocCount) }],
              rowCount: 1,
            });
          }
          if (sql.includes("from generated_documents")) {
            return Promise.resolve({
              rows: [{ count: String(generatedDocCount) }],
              rowCount: 1,
            });
          }
          if (sql.includes("insert into validation_runs")) {
            const payloadParam = params?.[6];
            capturedPayload =
              typeof payloadParam === "string"
                ? JSON.parse(payloadParam)
                : payloadParam;

            const parsed = capturedPayload as Record<string, unknown>;
            const blocking = Array.isArray(parsed.blocking)
              ? parsed.blocking
              : [];
            const warnings = Array.isArray(parsed.warnings)
              ? parsed.warnings
              : [];

            return Promise.resolve({
              rows: [
                makeValidationRunRow({
                  result_status: blocking.length > 0 ? "failed" : "passed",
                  blocking_count: blocking.length,
                  warning_count: warnings.length,
                  report_payload: parsed,
                }),
              ],
              rowCount: 1,
            });
          }
          return Promise.resolve({ rows: [], rowCount: 0 });
        },
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function makeCases() {
  return {
    get: () =>
      Promise.resolve({
        id: CASE_ID,
        stage: "S5",
        status: "S5",
        caseTypeCode: "visa",
      }),
  };
}

function makeTimeline() {
  return { write: () => Promise.resolve() };
}

function createService(pool: Pool) {
  return new ValidationRunsService(
    pool,
    makeCases() as never,
    makeTimeline() as never,
  );
}

void test("report_payload.blocking contains items when generatedDocumentCount === 0", async () => {
  capturedPayload = null;
  const pool = makePool(0, 0);
  const service = createService(pool);

  await service.create(makeCtx(), { caseId: CASE_ID });

  assert.ok(capturedPayload, "payload should have been captured");
  const payload = capturedPayload as Record<string, unknown>;

  assert.ok(Array.isArray(payload.blocking), "blocking should be an array");
  const blocking = payload.blocking as Record<string, unknown>[];
  assert.ok(blocking.length >= 1, "blocking should have at least 1 item");

  const first = blocking[0];
  assert.ok(typeof first.code === "string" && first.code.length > 0);
  assert.ok(typeof first.message === "string" && first.message.length > 0);
  assert.equal(
    first.titleKey,
    "cases.validation.checks.generated_documents_present.title",
  );
  assert.equal(
    first.messageKey,
    "cases.validation.checks.generated_documents_present.message",
  );
});

void test("report_payload has empty blocking/warnings and info items when all checks pass", async () => {
  capturedPayload = null;
  const pool = makePool(2, 0);
  const service = createService(pool);

  await service.create(makeCtx(), { caseId: CASE_ID });

  assert.ok(capturedPayload, "payload should have been captured");
  const payload = capturedPayload as Record<string, unknown>;

  assert.ok(Array.isArray(payload.blocking));
  assert.ok(Array.isArray(payload.warnings));
  assert.ok(Array.isArray(payload.info));

  const blocking = payload.blocking as unknown[];
  const warnings = payload.warnings as unknown[];
  const info = payload.info as Record<string, unknown>[];

  assert.equal(blocking.length, 0, "blocking should be empty when all pass");
  assert.equal(warnings.length, 0, "warnings should be empty when all pass");
  assert.equal(info.length, 2, "info should contain the 2 passed checks");

  for (const item of info) {
    assert.ok(typeof item.code === "string" && item.code.length > 0);
    assert.ok(typeof item.message === "string" && item.message.length > 0);
    assert.equal(item.passed, true);
  }
});

void test("report_payload.blocking contains only failed blocking checks, not warnings or passed", async () => {
  capturedPayload = null;
  const pool = makePool(1, 1);
  const service = createService(pool);

  await service.create(makeCtx(), { caseId: CASE_ID });

  assert.ok(capturedPayload, "payload should have been captured");
  const payload = capturedPayload as Record<string, unknown>;

  const blocking = payload.blocking as Record<string, unknown>[];
  const info = payload.info as Record<string, unknown>[];

  assert.equal(blocking.length, 1, "one blocking check failed");
  assert.equal(blocking[0].code, "generated_documents_finalized");
  assert.equal(blocking[0].passed, false);
  assert.equal(
    blocking[0].titleKey,
    "cases.validation.checks.generated_documents_finalized.title",
  );
  assert.equal(
    blocking[0].messageKey,
    "cases.validation.checks.generated_documents_finalized.message",
  );

  assert.equal(info.length, 1, "one check passed → info");
  assert.equal(info[0].code, "generated_documents_present");
  assert.equal(info[0].passed, true);
  assert.equal(
    info[0].titleKey,
    "cases.validation.checks.generated_documents_present.title",
  );
  assert.equal(
    info[0].messageKey,
    "cases.validation.checks.generated_documents_present.message",
  );
});
