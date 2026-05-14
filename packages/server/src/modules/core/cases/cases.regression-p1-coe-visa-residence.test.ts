import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  isOverseasStepCode,
  resolveOverseasStepEffects,
} from "./cases.service";
import { BMV_WORKFLOW_STEPS_BLUEPRINT } from "./cases.template-bmv";
import {
  FINAL_PAYMENT_DEFAULT_GATE_MODE,
  FINAL_PAYMENT_GATE_TRIGGER_STEP,
  FINAL_PAYMENT_GUARD_ERROR_CODES,
  FINAL_PAYMENT_MILESTONE,
  decideFinalPaymentGuard,
} from "./cases.types-final-payment";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_TERMINAL_STEPS,
  OVERSEAS_TIMELINE_ACTIONS,
  VISA_REJECTED_CLOSURE,
} from "./cases.types-overseas-step";
import {
  CASE_ID,
  ctx,
  makeCaseEntity,
  makeCaseRow,
  makePool,
  makeTemplates,
  ok,
  svc,
  unsettled,
} from "./cases.regression-p1-coe-visa-residence.test-support";

function billingRow(
  mode: "block" | "warn" | "off",
  status = "due",
  amount = "200000",
  milestone = "尾款",
) {
  return {
    amount_due: amount,
    status,
    milestone_name: milestone,
    gate_effect_mode: mode,
  };
}

function paymentRow(received: string) {
  return { total_received: received };
}

void describe("§18 COE_SENT final payment guard contract", () => {
  const coeSentStep = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
    (step) => step.stepCode === FINAL_PAYMENT_GATE_TRIGGER_STEP,
  );
  assert.ok(coeSentStep, "COE_SENT step blueprint should exist");
  const coeSentBillingGate = coeSentStep.billingGate;
  assert.ok(coeSentBillingGate, "COE_SENT billing gate should exist");

  void test("COE_SENT is the unique workflow-step billing gate trigger", () => {
    assert.equal(FINAL_PAYMENT_GATE_TRIGGER_STEP, "COE_SENT");
    assert.equal(coeSentBillingGate.mode, FINAL_PAYMENT_DEFAULT_GATE_MODE);
    assert.equal(coeSentBillingGate.milestone, FINAL_PAYMENT_MILESTONE);
  });

  void test("workflow-step billing error code aligns with case write error code", () => {
    assert.equal(
      FINAL_PAYMENT_GUARD_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    );
  });

  void test("block decision stays blocked even after risk acknowledgment", () => {
    const decision = decideFinalPaymentGuard(unsettled("block", 300000), true);
    assert.equal(decision.decision, "block");
  });

  void test("warn decision requires ack before passing", () => {
    const warned = decideFinalPaymentGuard(unsettled("warn", 120000), false);
    assert.equal(warned.decision, "warn_requires_ack");

    const passed = decideFinalPaymentGuard(unsettled("warn", 120000), true);
    assert.equal(passed.decision, "pass");
  });

  void test("null or settled guard passes", () => {
    assert.equal(decideFinalPaymentGuard(null, false).decision, "pass");
    assert.equal(
      decideFinalPaymentGuard({ settled: true }, false).decision,
      "pass",
    );
  });
});

void describe("§18 service: COE_SENT workflow-step billing gate", () => {
  void test("transitionWorkflowStep blocks unpaid final payment in block mode", async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      ) {
        return ok([billingRow("block", "due", "250000")]);
      }
      if (sql.includes("from payment_records pr") && sql.includes("any(")) {
        return ok([paymentRow("50000")]);
      }
      if (sql.includes("from cases") && params?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "WAITING_PAYMENT",
            final_payment_paid_cached: false,
            billing_unpaid_amount_cached: "250000",
          }),
        ]);
      }
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(ctx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (error: Error) => {
        assert.ok(
          error.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
          ),
        );
        assert.ok(
          error.message.includes("Billing gate blocks advancing to COE_SENT"),
        );
        return true;
      },
    );
  });

  void test("COE_SENT escalates warn guard to block because blueprint mode is block", async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      ) {
        return ok([billingRow("warn", "due", "200000")]);
      }
      if (sql.includes("from payment_records pr") && sql.includes("any(")) {
        return ok([paymentRow("0")]);
      }
      if (sql.includes("from cases") && params?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "WAITING_PAYMENT",
            final_payment_paid_cached: false,
            billing_unpaid_amount_cached: "200000",
          }),
        ]);
      }
      return ok();
    });

    await assert.rejects(
      () =>
        svc(pool, makeTemplates()).transitionWorkflowStep(ctx(), CASE_ID, {
          toStepCode: "COE_SENT",
        }),
      (error: Error) => {
        assert.ok(
          error.message.includes(
            CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
          ),
        );
        assert.ok(
          error.message.includes("Billing gate blocks advancing to COE_SENT"),
        );
        return true;
      },
    );
  });

  void test("COE_SENT passes when final payment is settled", async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes(
          "select id, amount_due, status, milestone_name, gate_effect_mode",
        )
      ) {
        return ok([billingRow("block", "paid", "200000")]);
      }
      if (sql.includes("from cases") && params?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "WAITING_PAYMENT",
            final_payment_paid_cached: true,
            billing_unpaid_amount_cached: "0",
            coe_sent_at: null,
          }),
        ]);
      }
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      ) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "COE_SENT",
            coe_sent_at: "2026-03-01T00:00:00.000Z",
            final_payment_paid_cached: true,
          }),
        ]);
      }
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionWorkflowStep(
      ctx(),
      CASE_ID,
      { toStepCode: "COE_SENT" },
    );
    assert.equal(updated.currentWorkflowStepCode, "COE_SENT");
    assert.equal(updated.coeSentAt, "2026-03-01T00:00:00.000Z");
  });
});

void describe("§19 resolveOverseasStepEffects: auto-stamp matrix", () => {
  void test("COE_SENT stamps coe_sent_at when null, skips when already set", () => {
    const fx1 = resolveOverseasStepEffects(
      makeCaseEntity({ coeSentAt: null }),
      "COE_SENT",
    );
    assert.equal(fx1.stampCoeSent, true);
    assert.equal(fx1.stampOverseasVisa, false);
    assert.equal(fx1.stampEntryConfirmed, false);

    const fx2 = resolveOverseasStepEffects(
      makeCaseEntity({ coeSentAt: "2026-03-01T00:00:00.000Z" }),
      "COE_SENT",
    );
    assert.equal(fx2.stampCoeSent, false);
  });

  void test("VISA_APPLYING stamps overseas_visa_start_at when null", () => {
    const fx = resolveOverseasStepEffects(
      makeCaseEntity({ overseasVisaStartAt: null }),
      "VISA_APPLYING",
    );
    assert.equal(fx.stampOverseasVisa, true);
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.resultOutcome, null);
  });

  void test("ENTRY_SUCCESS stamps entry_confirmed_at when null", () => {
    const fx = resolveOverseasStepEffects(
      makeCaseEntity({ entryConfirmedAt: null }),
      "ENTRY_SUCCESS",
    );
    assert.equal(fx.stampEntryConfirmed, true);
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.resultOutcome, null);
  });

  void test("VISA_REJECTED sets resultOutcome to rejected, no stamps", () => {
    const fx = resolveOverseasStepEffects(makeCaseEntity(), "VISA_REJECTED");
    assert.equal(fx.resultOutcome, "rejected");
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, false);
    assert.equal(fx.stampEntryConfirmed, false);
  });

  void test("non-overseas step produces no effects", () => {
    const fx = resolveOverseasStepEffects(makeCaseEntity(), "APPROVED");
    assert.equal(fx.stampCoeSent, false);
    assert.equal(fx.stampOverseasVisa, false);
    assert.equal(fx.stampEntryConfirmed, false);
    assert.equal(fx.resultOutcome, null);
  });
});

void describe("§19 isOverseasStepCode boundary", () => {
  void test("identifies all four overseas steps", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      assert.ok(isOverseasStepCode(code), `${code} should be overseas`);
    }
  });

  void test("rejects non-overseas steps", () => {
    for (const code of [
      "WAITING_MATERIAL",
      "APPROVED",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ]) {
      assert.ok(!isOverseasStepCode(code), `${code} should NOT be overseas`);
    }
  });
});

void describe("§19 VISA_REJECTED convergence contract", () => {
  void test("VISA_REJECTED targets S9 without auto-transition", () => {
    assert.equal(VISA_REJECTED_CLOSURE.targetParentStage, "S9");
    assert.equal(VISA_REJECTED_CLOSURE.autoTransitionToS9, false);
  });

  void test("VISA_REJECTED suggested outcomes include rejected and visa_rejected", () => {
    assert.ok(
      VISA_REJECTED_CLOSURE.suggestedResultOutcomes.includes("rejected"),
    );
    assert.ok(
      VISA_REJECTED_CLOSURE.suggestedResultOutcomes.includes("visa_rejected"),
    );
  });

  void test("VISA_REJECTED is in terminal steps set", () => {
    assert.ok(OVERSEAS_TERMINAL_STEPS.has("VISA_REJECTED"));
  });

  void test("ENTRY_SUCCESS is NOT in terminal steps set", () => {
    assert.ok(!OVERSEAS_TERMINAL_STEPS.has("ENTRY_SUCCESS" as never));
  });
});

void describe("§19 service: ENTRY_SUCCESS stamps entry_confirmed_at + timeline", () => {
  void test("transitionWorkflowStep: ENTRY_SUCCESS stamps and writes timeline", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql: sql.trim(), params: params ?? [] });
      if (sql.includes("from cases") && params?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S8",
            current_workflow_step_code: "VISA_APPLYING",
            overseas_visa_start_at: "2026-03-15T00:00:00.000Z",
          }),
        ]);
      }
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      ) {
        return ok([
          makeCaseRow({
            stage: "S8",
            current_workflow_step_code: "ENTRY_SUCCESS",
            entry_confirmed_at: "2026-04-10T00:00:00.000Z",
          }),
        ]);
      }
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionWorkflowStep(
      ctx(),
      CASE_ID,
      { toStepCode: "ENTRY_SUCCESS" },
    );
    assert.equal(updated.currentWorkflowStepCode, "ENTRY_SUCCESS");
    assert.equal(updated.entryConfirmedAt, "2026-04-10T00:00:00.000Z");

    const timelineCalls = calls.filter((call) =>
      call.sql.includes("insert into timeline_logs"),
    );
    assert.ok(
      timelineCalls.length >= 2,
      "step transition + entry stamp timelines",
    );

    const entryTimeline = timelineCalls.find(
      (call) => call.params[3] === OVERSEAS_TIMELINE_ACTIONS.ENTRY_CONFIRMED,
    );
    assert.ok(entryTimeline, "should write entry confirmed timeline");
  });
});

void describe("§19 service: VISA_REJECTED sets result_outcome + closure timeline", () => {
  void test("transitionWorkflowStep: VISA_REJECTED produces rejected outcome", async () => {
    const calls: { sql: string; params: unknown[] }[] = [];
    const pool = makePool((sql, params) => {
      calls.push({ sql: sql.trim(), params: params ?? [] });
      if (sql.includes("from cases") && params?.[0] === CASE_ID) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_APPLYING",
          }),
        ]);
      }
      if (
        sql.includes("update cases") &&
        sql.includes("current_workflow_step_code")
      ) {
        return ok([
          makeCaseRow({
            stage: "S7",
            current_workflow_step_code: "VISA_REJECTED",
            result_outcome: "rejected",
          }),
        ]);
      }
      return ok();
    });

    const updated = await svc(pool, makeTemplates()).transitionWorkflowStep(
      ctx(),
      CASE_ID,
      { toStepCode: "VISA_REJECTED" },
    );
    assert.equal(updated.currentWorkflowStepCode, "VISA_REJECTED");
    assert.equal(updated.resultOutcome, "rejected");

    const rejectedTimeline = calls.find(
      (call) =>
        call.sql.includes("insert into timeline_logs") &&
        call.params[3] === OVERSEAS_TIMELINE_ACTIONS.VISA_REJECTED_CLOSURE,
    );
    assert.ok(rejectedTimeline, "should write visa rejected closure timeline");
  });
});
