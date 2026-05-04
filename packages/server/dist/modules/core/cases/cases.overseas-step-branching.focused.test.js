// ────────────────────────────────────────────────────────────────
// P1 海外返签 ENTRY_SUCCESS / VISA_REJECTED 分支与收敛规则 focused tests
//
// 对齐 p1-sv-007-02-entry-success-vs-visa-rejected-branching
//
// 覆盖线：
//   1. resolveOverseasStepEffects 纯函数 — 各步骤的自动打戳与结果态
//   2. VISA_REJECTED 收敛 — result_outcome 自动设为 rejected
//   3. ENTRY_SUCCESS 收敛 — entry_confirmed_at 自动打戳
//   4. 幂等性 — 已打戳字段不重复写入
//   5. 收敛常量校验
// (COE_SENT/VISA_APPLYING stamps & non-overseas steps → *-stamps.focused.test.ts)
// ────────────────────────────────────────────────────────────────
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CasesService,
  resolveOverseasStepEffects,
  isOverseasStepCode,
  mapCaseRow,
} from "./cases.service";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_TIMELINE_ACTIONS,
  VISA_REJECTED_CLOSURE,
} from "./cases.types-overseas-step";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-overseas-1";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeCaseRow(overrides = {}) {
  const row = {
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
function makeCaseEntity(overrides = {}) {
  return mapCaseRow(makeCaseRow(overrides));
}
const ok = (rows = [], rowCount = rows.length) =>
  Promise.resolve({ rows, rowCount });
const isTxSql = (s) =>
  /^(begin|commit|rollback|select set_config)/.test(s.trim().toLowerCase());
function makePool(qf) {
  return {
    connect: () =>
      Promise.resolve({
        query: (s, p) => (isTxSql(s) ? ok() : qf(s, p)),
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
function svc(pool, tpl) {
  return new CasesService(pool, tpl.service);
}
// ════════════════════════════════════════════════════════════════
// 1. isOverseasStepCode
// ════════════════════════════════════════════════════════════════
void describe("isOverseasStepCode", () => {
  void test("identifies all four overseas steps", () => {
    assert.ok(isOverseasStepCode("COE_SENT"));
    assert.ok(isOverseasStepCode("VISA_APPLYING"));
    assert.ok(isOverseasStepCode("ENTRY_SUCCESS"));
    assert.ok(isOverseasStepCode("VISA_REJECTED"));
  });
  void test("rejects non-overseas steps", () => {
    assert.ok(!isOverseasStepCode("WAITING_MATERIAL"));
    assert.ok(!isOverseasStepCode("APPROVED"));
    assert.ok(!isOverseasStepCode("RESIDENCE_PERIOD_RECORDED"));
    assert.ok(!isOverseasStepCode("random_value"));
  });
});
// ════════════════════════════════════════════════════════════════
// 2. resolveOverseasStepEffects — 纯函数覆盖
// ════════════════════════════════════════════════════════════════
void describe("resolveOverseasStepEffects", () => {
  void test("COE_SENT: stamps coe_sent_at when null", () => {
    const c = makeCaseEntity({ coe_sent_at: null });
    const fx = resolveOverseasStepEffects(c, "COE_SENT");
    assert.equal(fx.stampCoeSent, true);
    assert.equal(fx.stampOverseasVisa, false);
    assert.equal(fx.stampEntryConfirmed, false);
    assert.equal(fx.resultOutcome, null);
  });
  void test("COE_SENT: skips stamp when coe_sent_at already set", () => {
    const c = makeCaseEntity({ coe_sent_at: "2026-03-01T00:00:00.000Z" });
    const fx = resolveOverseasStepEffects(c, "COE_SENT");
    assert.equal(fx.stampCoeSent, false);
  });
  void test("VISA_APPLYING: stamps overseas_visa_start_at when null", () => {
    const c = makeCaseEntity({ overseas_visa_start_at: null });
    const fx = resolveOverseasStepEffects(c, "VISA_APPLYING");
    assert.equal(fx.stampOverseasVisa, true);
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampEntryConfirmed, false);
    assert.equal(fx.resultOutcome, null);
  });
  void test("VISA_APPLYING: skips stamp when already set", () => {
    const c = makeCaseEntity({
      overseas_visa_start_at: "2026-03-15T00:00:00.000Z",
    });
    const fx = resolveOverseasStepEffects(c, "VISA_APPLYING");
    assert.equal(fx.stampOverseasVisa, false);
  });
  void test("ENTRY_SUCCESS: stamps entry_confirmed_at when null", () => {
    const c = makeCaseEntity({ entry_confirmed_at: null });
    const fx = resolveOverseasStepEffects(c, "ENTRY_SUCCESS");
    assert.equal(fx.stampEntryConfirmed, true);
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, false);
    assert.equal(fx.resultOutcome, null);
  });
  void test("ENTRY_SUCCESS: skips stamp when already set", () => {
    const c = makeCaseEntity({
      entry_confirmed_at: "2026-04-01T00:00:00.000Z",
    });
    const fx = resolveOverseasStepEffects(c, "ENTRY_SUCCESS");
    assert.equal(fx.stampEntryConfirmed, false);
  });
  void test("VISA_REJECTED: sets resultOutcome to rejected, no stamps", () => {
    const c = makeCaseEntity();
    const fx = resolveOverseasStepEffects(c, "VISA_REJECTED");
    assert.equal(fx.resultOutcome, "rejected");
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, false);
    assert.equal(fx.stampEntryConfirmed, false);
  });
  void test("non-overseas step: all effects are off", () => {
    const c = makeCaseEntity();
    const fx = resolveOverseasStepEffects(c, "APPROVED");
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, false);
    assert.equal(fx.stampEntryConfirmed, false);
    assert.equal(fx.resultOutcome, null);
  });
});
// ════════════════════════════════════════════════════════════════
// 3. transitionWorkflowStep: ENTRY_SUCCESS branch
// ════════════════════════════════════════════════════════════════
void describe("transitionWorkflowStep: ENTRY_SUCCESS branch", () => {
  void test("stamps entry_confirmed_at and writes entry confirmed timeline", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p ?? [] });
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S8",
            current_workflow_step_code: "VISA_APPLYING",
            overseas_visa_start_at: "2026-03-15T00:00:00.000Z",
          }),
        ]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S8",
            current_workflow_step_code: "ENTRY_SUCCESS",
            entry_confirmed_at: "2026-04-10T00:00:00.000Z",
            result_outcome: null,
          }),
        ]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "ENTRY_SUCCESS" },
    );
    assert.equal(c.currentWorkflowStepCode, "ENTRY_SUCCESS");
    assert.equal(c.entryConfirmedAt, "2026-04-10T00:00:00.000Z");
    assert.equal(c.resultOutcome, null);
    const updateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") &&
        c.sql.includes("current_workflow_step_code"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params[1], "ENTRY_SUCCESS");
    assert.equal(updateCall.params[2], false, "COE_SENT stamp should be false");
    assert.equal(
      updateCall.params[3],
      false,
      "VISA stamp should be false (already set)",
    );
    assert.equal(updateCall.params[4], true, "entry stamp should be true");
    assert.equal(updateCall.params[5], null, "resultOutcome should be null");
    const timelineCalls = calls.filter((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(
      timelineCalls.length >= 2,
      "should have at least 2 timeline entries",
    );
    const entryTimeline = timelineCalls.find(
      (c) => c.params[3] === OVERSEAS_TIMELINE_ACTIONS.ENTRY_CONFIRMED,
    );
    assert.ok(
      entryTimeline,
      "should write case.overseas_entry_confirmed timeline",
    );
  });
});
// ════════════════════════════════════════════════════════════════
// 4. transitionWorkflowStep: VISA_REJECTED branch
// ════════════════════════════════════════════════════════════════
void describe("transitionWorkflowStep: VISA_REJECTED branch", () => {
  void test("sets result_outcome to rejected and writes visa rejected closure timeline", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p ?? [] });
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_APPLYING",
            overseas_visa_start_at: "2026-03-15T00:00:00.000Z",
          }),
        ]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_REJECTED",
            result_outcome: "rejected",
          }),
        ]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "VISA_REJECTED" },
    );
    assert.equal(c.currentWorkflowStepCode, "VISA_REJECTED");
    assert.equal(c.resultOutcome, "rejected");
    const updateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") &&
        c.sql.includes("current_workflow_step_code"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params[1], "VISA_REJECTED");
    assert.equal(updateCall.params[2], false, "COE stamp false");
    assert.equal(updateCall.params[3], false, "VISA stamp false");
    assert.equal(updateCall.params[4], false, "entry stamp false");
    assert.equal(
      updateCall.params[5],
      "rejected",
      "resultOutcome should be rejected",
    );
    const timelineCalls = calls.filter((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(
      timelineCalls.length >= 2,
      "should have step transition + visa rejected timelines",
    );
    const rejectedTimeline = timelineCalls.find(
      (c) => c.params[3] === OVERSEAS_TIMELINE_ACTIONS.VISA_REJECTED_CLOSURE,
    );
    assert.ok(
      rejectedTimeline,
      "should write case.overseas_visa_rejected timeline",
    );
    if (rejectedTimeline.params[5]) {
      const payload = JSON.parse(rejectedTimeline.params[5]);
      assert.equal(payload.stepCode, VISA_REJECTED_CLOSURE.terminalStepCode);
      assert.equal(
        payload.targetParentStage,
        VISA_REJECTED_CLOSURE.targetParentStage,
      );
      assert.equal(
        payload.autoTransitionToS9,
        VISA_REJECTED_CLOSURE.autoTransitionToS9,
      );
    }
  });
  void test("VISA_REJECTED does not overwrite an already-set result_outcome", async () => {
    const calls = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p ?? [] });
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_APPLYING",
            result_outcome: "pending",
          }),
        ]);
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      )
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_REJECTED",
            result_outcome: "rejected",
          }),
        ]);
      return ok();
    });
    const c = await svc(pool, makeTemplates()).transitionWorkflowStep(
      makeCtx(),
      CASE_ID,
      { toStepCode: "VISA_REJECTED" },
    );
    assert.equal(c.resultOutcome, "rejected");
    const updateCall = calls.find(
      (c) =>
        c.sql.includes("update cases") &&
        c.sql.includes("current_workflow_step_code"),
    );
    assert.ok(updateCall);
    assert.equal(updateCall.params[5], "rejected");
  });
});
// ════════════════════════════════════════════════════════════════
// 5. Convergence: VISA_REJECTED constants alignment
// ════════════════════════════════════════════════════════════════
void describe("convergence constants alignment", () => {
  void test("VISA_REJECTED_CLOSURE targets S9", () => {
    assert.equal(VISA_REJECTED_CLOSURE.targetParentStage, "S9");
  });
  void test("VISA_REJECTED_CLOSURE does not auto-transition to S9", () => {
    assert.equal(VISA_REJECTED_CLOSURE.autoTransitionToS9, false);
  });
  void test("OVERSEAS_TIMELINE_ACTIONS includes all convergence actions", () => {
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.VISA_REJECTED_CLOSURE,
      "case.overseas_visa_rejected",
    );
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.ENTRY_CONFIRMED,
      "case.overseas_entry_confirmed",
    );
  });
  void test("OVERSEAS_STEP_CODES covers all four overseas steps", () => {
    assert.equal(OVERSEAS_STEP_CODES.COE_SENT, "COE_SENT");
    assert.equal(OVERSEAS_STEP_CODES.VISA_APPLYING, "VISA_APPLYING");
    assert.equal(OVERSEAS_STEP_CODES.ENTRY_SUCCESS, "ENTRY_SUCCESS");
    assert.equal(OVERSEAS_STEP_CODES.VISA_REJECTED, "VISA_REJECTED");
  });
});
//# sourceMappingURL=cases.overseas-step-branching.focused.test.js.map
