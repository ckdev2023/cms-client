import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { mapPhaseToTerminalStage } from "./cases.service";
import {
  CASE_ID,
  makeCaseRow,
  makeCtx,
  makePool,
  makeTemplates,
  ok,
  svc,
} from "./cases.final-payment-coe-guard.focused.test-support";

// ════════════════════════════════════════════════════════════════
// BUG-116: 终态 phase → stage=S9 联动
//
// 业务规范：
//   - CLOSED_SUCCESS → stage=S9, result_outcome='success'
//   - CLOSED_FAILED → stage=S9, result_outcome=input||'failure', close_reason=$X
//   - 非终态 phase → stage 不动
// ════════════════════════════════════════════════════════════════

void describe("mapPhaseToTerminalStage: 纯函数映射 (BUG-116)", () => {
  void test("CLOSED_SUCCESS → S9", () => {
    assert.equal(mapPhaseToTerminalStage("CLOSED_SUCCESS"), "S9");
  });

  void test("CLOSED_FAILED → S9", () => {
    assert.equal(mapPhaseToTerminalStage("CLOSED_FAILED"), "S9");
  });

  void test("非终态 phase → null (stage 不动)", () => {
    for (const phase of [
      "CONSULTING",
      "CONTRACTED",
      "WAITING_MATERIAL",
      "REVIEWING",
      "APPLYING",
      "UNDER_REVIEW",
      "APPROVED",
      "WAITING_PAYMENT",
      "COE_SENT",
      "VISA_APPLYING",
      "SUCCESS",
      "VISA_REJECTED",
      "REJECTED",
    ]) {
      assert.equal(
        mapPhaseToTerminalStage(phase),
        null,
        `${phase} should not map to terminal stage`,
      );
    }
  });
});

void describe("transitionPhase: stage sync on terminal phase (BUG-116)", () => {
  void test("推到 CLOSED_SUCCESS → stage=S9, result_outcome=success", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (
        sql.includes("from residence_periods") &&
        sql.includes("is_current = true")
      )
        return ok([
          {
            id: "rp-1",
            org_id: "00000000-0000-4000-8000-000000000000",
            case_id: CASE_ID,
            customer_id: "cust-1",
            visa_type: "business_manager",
            status_of_residence: "経営・管理",
            period_years: 1,
            period_label: "1年",
            valid_from: "2026-01-01",
            valid_until: "2027-01-01",
            card_number: "AB12345678CD",
            is_current: true,
            entry_date: "2026-01-01",
            reminder_created: true,
            notes: null,
            created_by: "user-1",
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ]);
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_SUCCESS",
            stage: "S9",
            status: "S9",
            result_outcome: "success",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({ business_phase: "RENEWAL_REMINDER_SCHEDULED" }),
        ]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "CLOSED_SUCCESS" },
    );

    assert.equal(updated.businessPhase, "CLOSED_SUCCESS");
    assert.equal(updated.stage, "S9");
    assert.equal(updated.resultOutcome, "success");

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall, "should issue update cases statement");

    assert.match(
      updateCall.sql,
      /stage\s*=\s*case\s+when\s+\$2\s+in\s+\('CLOSED_SUCCESS','CLOSED_FAILED'\)\s+then\s+'S9'/,
      "SQL must contain terminal stage sync",
    );

    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "CLOSED_SUCCESS",
      "RENEWAL_REMINDER_SCHEDULED",
      false,
      false,
      false,
      null,
      "success",
    ]);
  });

  void test("推到 CLOSED_FAILED + closeReason → stage=S9, result_outcome=failure, close_reason=$X", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            status: "S9",
            close_reason: "BMV-VISA-REJECTED",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "REJECTED" })]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      {
        toPhase: "CLOSED_FAILED",
        closeReason: "BMV-VISA-REJECTED",
      },
    );

    assert.equal(updated.businessPhase, "CLOSED_FAILED");
    assert.equal(updated.stage, "S9");
    assert.equal(updated.closeReason, "BMV-VISA-REJECTED");
    assert.equal(updated.resultOutcome, "failure");

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    assert.deepEqual(updateCall.params, [
      CASE_ID,
      "CLOSED_FAILED",
      "REJECTED",
      false,
      false,
      false,
      "BMV-VISA-REJECTED",
      "failure",
    ]);
  });

  void test("推到非终态 phase → stage 不动", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "WAITING_MATERIAL",
            stage: "S2",
            status: "S2",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([
          makeCaseRow({
            business_phase: "CONTRACTED",
            stage: "S2",
            status: "S2",
          }),
        ]);
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionPhase(
      makeCtx(),
      CASE_ID,
      { toPhase: "WAITING_MATERIAL" },
    );

    assert.equal(updated.stage, "S2");

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);
    const params = updateCall.params ?? [];
    assert.equal(params[6], null, "closeReason should be null");
    assert.equal(params[7], null, "resultOutcome should be null");
  });

  void test("SQL contains stage sync, close_reason, result_outcome branches", async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const pool = makePool((sql, p) => {
      calls.push({ sql: sql.trim(), params: p });
      if (sql.includes("update cases") && sql.includes("business_phase = $2"))
        return ok([
          makeCaseRow({
            business_phase: "CLOSED_FAILED",
            stage: "S9",
            close_reason: "TEST",
            result_outcome: "failure",
          }),
        ]);
      if (sql.includes("from cases") && p?.[0] === CASE_ID)
        return ok([makeCaseRow({ business_phase: "REJECTED" })]);
      return ok();
    });

    await svc(pool, makeTemplates()).transitionPhase(makeCtx(), CASE_ID, {
      toPhase: "CLOSED_FAILED",
      closeReason: "TEST",
    });

    const updateCall = calls.find(
      (c) => c.sql.includes("update cases") && c.sql.includes("business_phase"),
    );
    assert.ok(updateCall);

    assert.match(
      updateCall.sql,
      /close_reason\s*=\s*case\s+when\s+\$2\s*=\s*'CLOSED_FAILED'\s+then\s+\$7/,
      "SQL must gate close_reason on CLOSED_FAILED",
    );
    assert.match(
      updateCall.sql,
      /result_outcome\s*=\s*case/,
      "SQL must contain result_outcome conditional",
    );
    assert.match(
      updateCall.sql,
      /when\s+\$2\s*=\s*'CLOSED_SUCCESS'\s+then\s+'success'/,
      "SQL must force success for CLOSED_SUCCESS",
    );
    assert.match(
      updateCall.sql,
      /when\s+\$2\s*=\s*'CLOSED_FAILED'\s+then\s+coalesce\(\$8,\s*'failure'\)/,
      "SQL must default to failure for CLOSED_FAILED",
    );
  });
});
