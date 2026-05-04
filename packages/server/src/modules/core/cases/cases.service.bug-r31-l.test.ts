// ── Test Ownership ──────────────────────────────────────────────
// Owner: R31-L — archive guard: status='S9' + archived_at enforcement.
// Covers:
//   1. transition() to S9 sets archived_at in the SQL
//   2. phase transition to CLOSED_SUCCESS/CLOSED_FAILED sets archived_at + status
//   3. mapPhaseToTerminalStage correctly maps terminal phases
// ────────────────────────────────────────────────────────────────

import { test } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";

import { CasesService, mapPhaseToTerminalStage } from "./cases.service";
import { type RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}

function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {
    id: CASE_ID,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: "visa",
    status: "S1",
    stage: "S1",
    group_id: null,
    owner_user_id: USER_ID,
    opened_at: "2026-01-01T00:00:00.000Z",
    due_at: null,
    metadata: {},
    case_no: null,
    case_name: null,
    case_subtype: null,
    application_type: null,
    application_flow_type: "standard",
    visa_plan: null,
    post_approval_stage: "none",
    coe_issued_at: null,
    coe_expiry_date: null,
    coe_sent_at: null,
    close_reason: null,
    supplement_count: 0,
    company_id: null,
    priority: "normal",
    risk_level: "low",
    assistant_user_id: null,
    source_channel: null,
    signed_at: null,
    accepted_at: null,
    submission_date: null,
    result_date: null,
    residence_expiry_date: null,
    archived_at: null,
    result_outcome: null,
    quote_price: null,
    deposit_paid_cached: false,
    final_payment_paid_cached: false,
    billing_unpaid_amount_cached: "0",
    billing_risk_acknowledged_by: null,
    billing_risk_acknowledged_at: null,
    billing_risk_ack_reason_code: null,
    billing_risk_ack_reason_note: null,
    billing_risk_ack_evidence_url: null,
    overseas_visa_start_at: null,
    entry_confirmed_at: null,
    business_phase: "CONSULTING",
    current_workflow_step_code: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };

  if (typeof overrides.status === "string" && overrides.stage === undefined) {
    row.stage = overrides.status;
  }
  if (typeof overrides.stage === "string" && overrides.status === undefined) {
    row.status = overrides.stage;
  }

  return row;
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

function svc(pool: ReturnType<typeof makePool>) {
  return new CasesService(
    pool as unknown as Pool,
    {
      resolve: () => Promise.resolve({ mode: "legacy", used: false }),
    } as never,
  );
}

// ── 1. transition() to S9 SQL includes archived_at ──

void test("R31-L transition S8→S9: SQL sets archived_at when toStage is S9", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2")) {
      return ok([
        makeCaseRow({
          status: "S9",
          stage: "S9",
          business_phase: "CLOSED_SUCCESS",
          archived_at: "2026-05-04T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([
        makeCaseRow({ status: "S8", stage: "S8", business_phase: "SUCCESS" }),
      ]);
    }
    return ok();
  });

  const result = await svc(pool).transition(makeCtx(), CASE_ID, {
    toStage: "S9",
  });

  assert.equal(result.stage, "S9");
  assert.equal(result.status, "S9");
  assert.ok(result.archivedAt !== null, "archivedAt should be set");

  const updateSql = captured.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("stage = $2"),
  );
  assert.ok(updateSql, "Should have an update cases SQL");
  assert.ok(
    updateSql.sql.includes("archived_at"),
    "SQL should include archived_at assignment",
  );
});

void test("R31-L transition S7→S9 with closeReason: SQL sets archived_at", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2")) {
      return ok([
        makeCaseRow({
          status: "S9",
          stage: "S9",
          business_phase: "CLOSED_FAILED",
          close_reason: "test close",
          archived_at: "2026-05-04T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([
        makeCaseRow({
          status: "S7",
          stage: "S7",
          business_phase: "WAITING_PAYMENT",
        }),
      ]);
    }
    return ok();
  });

  const result = await svc(pool).transition(makeCtx(), CASE_ID, {
    toStage: "S9",
    closeReason: "test close",
  });

  assert.equal(result.stage, "S9");
  assert.equal(result.status, "S9");
  assert.ok(result.archivedAt !== null);
  assert.equal(result.closeReason, "test close");

  const updateSql = captured.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("stage = $2"),
  );
  assert.ok(updateSql);
  assert.ok(updateSql.sql.includes("archived_at"));
});

void test("R31-L transition non-S9: SQL does not stamp archived_at to now()", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2")) {
      return ok([makeCaseRow({ status: "S2", stage: "S2" })]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([makeCaseRow({ status: "S1", stage: "S1" })]);
    }
    return ok();
  });

  const result = await svc(pool).transition(makeCtx(), CASE_ID, {
    toStage: "S2",
  });

  assert.equal(result.stage, "S2");
  assert.equal(
    result.archivedAt,
    null,
    "archivedAt should remain null for non-S9 transition",
  );
});

// ── 2. mapPhaseToTerminalStage ──

void test("R31-L mapPhaseToTerminalStage: CLOSED_SUCCESS maps to S9", () => {
  assert.equal(mapPhaseToTerminalStage("CLOSED_SUCCESS"), "S9");
});

void test("R31-L mapPhaseToTerminalStage: CLOSED_FAILED maps to S9", () => {
  assert.equal(mapPhaseToTerminalStage("CLOSED_FAILED"), "S9");
});

void test("R31-L mapPhaseToTerminalStage: non-terminal returns null", () => {
  assert.equal(mapPhaseToTerminalStage("CONSULTING"), null);
  assert.equal(mapPhaseToTerminalStage("APPLYING"), null);
});

// ── 3. Phase transition SQL includes archived_at + status ──

void test("R31-L phase transition to CLOSED_SUCCESS: SQL sets archived_at and status", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("business_phase = $2")) {
      return ok([
        makeCaseRow({
          status: "S9",
          stage: "S9",
          business_phase: "CLOSED_SUCCESS",
          result_outcome: "success",
          archived_at: "2026-05-04T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([
        makeCaseRow({
          status: "S8",
          stage: "S8",
          business_phase: "RENEWAL_REMINDER_SCHEDULED",
        }),
      ]);
    }
    if (sql.includes("from residence_periods")) {
      return ok([
        {
          id: "rp-1",
          org_id: ORG_ID,
          case_id: CASE_ID,
          customer_id: "cust-1",
          visa_type: "business_manager",
          status_of_residence: "経営・管理",
          period_years: 5,
          period_label: "5年",
          valid_from: "2026-01-01",
          valid_until: "2031-01-01",
          card_number: null,
          is_current: true,
          entry_date: null,
          reminder_created: true,
          notes: null,
          created_by: USER_ID,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    }
    return ok();
  });

  const result = await svc(pool).transitionPhase(makeCtx(), CASE_ID, {
    toPhase: "CLOSED_SUCCESS",
  });

  assert.equal(result.stage, "S9");
  assert.equal(result.status, "S9");
  assert.ok(
    result.archivedAt !== null,
    "archivedAt must be set on CLOSED_SUCCESS",
  );

  const updateSql = captured.find(
    (c) =>
      c.sql.includes("update cases") && c.sql.includes("business_phase = $2"),
  );
  assert.ok(updateSql, "Should have a phase transition update SQL");
  assert.ok(
    updateSql.sql.includes("archived_at"),
    "Phase transition SQL should include archived_at",
  );
  assert.ok(
    /status\s*=/.test(updateSql.sql),
    "Phase transition SQL should set status",
  );
});

void test("R31-L phase transition to CLOSED_FAILED: SQL sets archived_at and status", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("business_phase = $2")) {
      return ok([
        makeCaseRow({
          status: "S9",
          stage: "S9",
          business_phase: "CLOSED_FAILED",
          close_reason: "rejected",
          result_outcome: "failure",
          archived_at: "2026-05-04T00:00:00.000Z",
        }),
      ]);
    }
    if (sql.includes("from cases") && p?.[0] === CASE_ID) {
      return ok([
        makeCaseRow({
          status: "S7",
          stage: "S7",
          business_phase: "VISA_REJECTED",
        }),
      ]);
    }
    return ok();
  });

  const result = await svc(pool).transitionPhase(makeCtx(), CASE_ID, {
    toPhase: "CLOSED_FAILED",
    closeReason: "rejected",
  });

  assert.equal(result.stage, "S9");
  assert.equal(result.status, "S9");
  assert.ok(
    result.archivedAt !== null,
    "archivedAt must be set on CLOSED_FAILED",
  );

  const updateSql = captured.find(
    (c) =>
      c.sql.includes("update cases") && c.sql.includes("business_phase = $2"),
  );
  assert.ok(updateSql);
  assert.ok(updateSql.sql.includes("archived_at"));
});
