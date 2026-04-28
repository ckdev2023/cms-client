// ────────────────────────────────────────────────────────────────
// P1 海外返签 COE_SENT / VISA_APPLYING / non-overseas auto-stamp focused tests
//
// Split from cases.overseas-step-branching.focused.test.ts
// Covers: COE_SENT stamp, VISA_APPLYING stamp, non-overseas no-op
// ────────────────────────────────────────────────────────────────

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { type Pool } from "pg";

import { CasesService } from "./cases.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-overseas-stamp-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeCaseRow(overrides: Record<string, unknown> = {}) {
  const row: Record<string, unknown> = {
    id: CASE_ID,
    org_id: ORG_ID,
    customer_id: "cust-1",
    case_type_code: "business_manager_visa",
    status: "S7",
    stage: "S7",
    group_id: null,
    owner_user_id: USER_ID,
    opened_at: "2026-01-01T00:00:00.000Z",
    due_at: null,
    metadata: {},
    case_no: "CASE-202601-0001",
    case_name: null,
    case_subtype: null,
    application_type: null,
    application_flow_type: "standard",
    visa_plan: "1year",
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
    final_payment_paid_cached: true,
    billing_unpaid_amount_cached: "0",
    billing_risk_acknowledged_by: null,
    billing_risk_acknowledged_at: null,
    billing_risk_ack_reason_code: null,
    billing_risk_ack_reason_note: null,
    billing_risk_ack_evidence_url: null,
    overseas_visa_start_at: null,
    entry_confirmed_at: null,
    current_workflow_step_code: "COE_SENT",
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

function makeTemplates() {
  return {
    service: {
      resolve: () =>
        Promise.resolve({ mode: "legacy" as const, used: false as const }),
    },
  };
}

function svc(pool: ReturnType<typeof makePool>, tpl: { service: unknown }) {
  return new CasesService(pool as unknown as Pool, tpl.service as never);
}

// ════════════════════════════════════════════════════════════════
// 1. COE_SENT stamps coe_sent_at
// ════════════════════════════════════════════════════════════════

void describe("transitionWorkflowStep: COE_SENT auto-stamp", () => {
  void test("stamps coe_sent_at on first transition to COE_SENT", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p ?? [] });
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "WAITING_PAYMENT",
            coe_sent_at: null,
            final_payment_paid_cached: true,
            billing_unpaid_amount_cached: "0",
          }),
        ]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "COE_SENT",
            coe_sent_at: "2026-04-01T00:00:00.000Z",
          }),
        ]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "COE_SENT" },
    );

    assert.equal(c.currentWorkflowStepCode, "COE_SENT");
    assert.equal(c.coeSentAt, "2026-04-01T00:00:00.000Z");

    const updateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") &&
        c.sql.includes("current_workflow_step_code"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params[2], true, "COE stamp should be true");
    assert.equal(updateCall.params[3], false, "VISA stamp should be false");
    assert.equal(updateCall.params[4], false, "entry stamp should be false");
  });
});

// ════════════════════════════════════════════════════════════════
// 2. VISA_APPLYING stamps overseas_visa_start_at
// ════════════════════════════════════════════════════════════════

void describe("transitionWorkflowStep: VISA_APPLYING auto-stamp", () => {
  void test("stamps overseas_visa_start_at on first transition to VISA_APPLYING", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p ?? [] });
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "COE_SENT",
            coe_sent_at: "2026-03-01T00:00:00.000Z",
            overseas_visa_start_at: null,
          }),
        ]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_APPLYING",
            overseas_visa_start_at: "2026-03-15T00:00:00.000Z",
          }),
        ]);
      return ok();
    });

    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "VISA_APPLYING" },
    );

    assert.equal(c.currentWorkflowStepCode, "VISA_APPLYING");
    assert.equal(c.overseasVisaStartAt, "2026-03-15T00:00:00.000Z");

    const updateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") &&
        c.sql.includes("current_workflow_step_code"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params[2], false, "COE stamp should be false");
    assert.equal(updateCall.params[3], true, "VISA stamp should be true");
    assert.equal(updateCall.params[4], false, "entry stamp should be false");
  });
});

// ════════════════════════════════════════════════════════════════
// 3. Non-overseas steps: no side-effects
// ════════════════════════════════════════════════════════════════

void describe("transitionWorkflowStep: non-overseas step has no side-effects", () => {
  void test("APPROVED does not stamp any overseas fields", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p ?? [] });
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S6",
            current_workflow_step_code: "UNDER_REVIEW",
          }),
        ]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S6",
            current_workflow_step_code: "APPROVED",
          }),
        ]);
      return ok();
    });

    await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "APPROVED" },
    );

    const updateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") &&
        c.sql.includes("current_workflow_step_code"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params[2], false, "COE stamp false");
    assert.equal(updateCall.params[3], false, "VISA stamp false");
    assert.equal(updateCall.params[4], false, "entry stamp false");
    assert.equal(updateCall.params[5], null, "resultOutcome null");

    const timelineCalls = calls.filter((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.equal(
      timelineCalls.length,
      1,
      "only the generic step transition timeline",
    );
  });
});
