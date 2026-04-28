/**
 * BUG-063 — S1~S6→S9 跳跃收紧 + closeReason 门禁 + businessPhase 同步推進
 */

import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { CasesService } from "./cases.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

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
    service: {
      resolve: () => Promise.resolve({ mode: "legacy", used: false }),
    },
  };
}
function svc(pool: ReturnType<typeof makePool>) {
  return new CasesService(
    pool as unknown as Pool,
    makeTemplates().service as never,
  );
}
function ctx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" as const };
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
  if (typeof overrides.status === "string" && overrides.stage === undefined)
    row.stage = overrides.status;
  if (typeof overrides.stage === "string" && overrides.status === undefined)
    row.status = overrides.stage;
  return row;
}

// ═══════════════════════════════════════════════════════════════
// §1 S1~S6→S9 跳跃收紧
// ═══════════════════════════════════════════════════════════════

for (const stage of ["S1", "S2", "S3", "S4", "S5", "S6"]) {
  void test(`BUG-063: ${stage}→S9 jump is blocked`, async () => {
    const pool = makePool((sql, p) =>
      sql.includes("from cases") && p?.[0] === CASE_ID
        ? ok([makeCaseRow({ status: stage })])
        : ok(),
    );
    await assert.rejects(
      () => svc(pool).transition(ctx(), CASE_ID, { toStage: "S9" }),
      (e) => e instanceof Error && /not allowed/i.test(e.message),
    );
  });
}

void test("BUG-063: S7→S9 without closeReason is blocked", async () => {
  const pool = makePool((sql, p) =>
    sql.includes("from cases") && p?.[0] === CASE_ID
      ? ok([makeCaseRow({ status: "S7" })])
      : ok(),
  );
  await assert.rejects(
    () => svc(pool).transition(ctx(), CASE_ID, { toStage: "S9" }),
    (e) =>
      e instanceof Error &&
      /closeReason.*required|CLOSE_REASON/i.test(e.message),
  );
});

void test("BUG-063: S7→S9 with closeReason succeeds", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([
        makeCaseRow({
          status: "S9",
          close_reason: "rejected_by_immigration",
          business_phase: "CLOSED_FAILED",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S7" })]);
    return ok();
  });
  const r = await svc(pool).transition(ctx(), CASE_ID, {
    toStage: "S9",
    closeReason: "rejected_by_immigration",
  });
  assert.equal(r.stage, "S9");
});

void test("BUG-063: S8→S9 succeeds without closeReason", async () => {
  const pool = makePool((sql, p) => {
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([
        makeCaseRow({ status: "S9", business_phase: "CLOSED_SUCCESS" }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8", case_type_code: "general" })]);
    return ok();
  });
  const r = await svc(pool).transition(ctx(), CASE_ID, { toStage: "S9" });
  assert.equal(r.stage, "S9");
});

// ═══════════════════════════════════════════════════════════════
// §2 businessPhase 同步推進
// ═══════════════════════════════════════════════════════════════

void test("transition S1→S2 syncs businessPhase to WAITING_MATERIAL", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([
        makeCaseRow({ status: "S2", business_phase: "WAITING_MATERIAL" }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  const r = await svc(pool).transition(ctx(), CASE_ID, { toStage: "S2" });
  assert.equal(r.businessPhase, "WAITING_MATERIAL");
  const updateCall = captured.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
  );
  assert.ok(updateCall, "UPDATE SQL must include business_phase");
  assert.equal(updateCall.params?.[4], "WAITING_MATERIAL");
});

void test("transition S7→S9 with closeReason sets CLOSED_FAILED", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([
        makeCaseRow({
          status: "S9",
          close_reason: "rejected",
          business_phase: "CLOSED_FAILED",
        }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S7" })]);
    return ok();
  });
  const r = await svc(pool).transition(ctx(), CASE_ID, {
    toStage: "S9",
    closeReason: "rejected",
  });
  assert.equal(r.businessPhase, "CLOSED_FAILED");
  const updateCall = captured.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
  );
  assert.ok(updateCall);
  assert.equal(updateCall.params?.[4], "CLOSED_FAILED");
});

void test("transition S8→S9 without closeReason sets CLOSED_SUCCESS", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([
        makeCaseRow({ status: "S9", business_phase: "CLOSED_SUCCESS" }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S8", case_type_code: "general" })]);
    return ok();
  });
  const r = await svc(pool).transition(ctx(), CASE_ID, { toStage: "S9" });
  assert.equal(r.businessPhase, "CLOSED_SUCCESS");
  const updateCall = captured.find(
    (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
  );
  assert.ok(updateCall);
  assert.equal(updateCall.params?.[4], "CLOSED_SUCCESS");
});

void test("timeline payload includes businessPhase on transition", async () => {
  const captured: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, p) => {
    captured.push({ sql, params: p });
    if (sql.includes("update cases") && sql.includes("stage = $2"))
      return ok([
        makeCaseRow({ status: "S2", business_phase: "WAITING_MATERIAL" }),
      ]);
    if (sql.includes("from cases") && p?.[0] === CASE_ID)
      return ok([makeCaseRow({ status: "S1" })]);
    return ok();
  });
  await svc(pool).transition(ctx(), CASE_ID, { toStage: "S2" });
  const timelineCall = captured.find(
    (c) =>
      c.sql.includes("insert into timeline_logs") &&
      c.params?.[3] === "case.transitioned",
  );
  assert.ok(timelineCall, "timeline_logs INSERT must exist");
  const rawPayload = timelineCall.params?.[5];
  assert.ok(typeof rawPayload === "string", "payload must be a string");
  const payload = JSON.parse(rawPayload) as Record<string, unknown>;
  assert.equal(payload.businessPhase, "WAITING_MATERIAL");
});
