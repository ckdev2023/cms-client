import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { mapCaseRow, type CaseQueryRow } from "./cases.service";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { FINAL_PAYMENT_GUARD_ERROR_CODES } from "./cases.types-final-payment";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_STEP_READ_SNAPSHOTS,
  OVERSEAS_TIMELINE_ACTIONS,
} from "./cases.types-overseas-step";
import {
  SUCCESS_CLOSEOUT_PRECONDITION_CODES,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
import type { SuccessCloseoutCheckInput } from "./cases.types-residence-closeout";
import { resolveWorkflowStepSummary } from "./cases.workflow-step-readmodel";
import {
  BMV_CASE_TYPE,
  BMV_WORKFLOW_STEPS_BLUEPRINT,
} from "./cases.template-bmv";
import { BMV_CASE_TYPE_CODE } from "./bmvTemplateConfig";
import {
  makeCaseEntity,
  makeCaseRow,
} from "./cases.regression-p1-coe-visa-residence.test-support";

void describe("§22 resolveWorkflowStepSummary: overseas steps", () => {
  void test("COE_SENT: S7, not terminal, billing gate block, next=VISA_APPLYING", () => {
    const entity = makeCaseEntity({ currentWorkflowStepCode: "COE_SENT" });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.ok(summary);
    assert.equal(summary.currentStepCode, "COE_SENT");
    assert.equal(summary.parentStage, "S7");
    assert.equal(summary.isTerminal, false);
    assert.ok(summary.allowedNextSteps.includes("VISA_APPLYING"));
    assert.ok(summary.billingGate !== null);
    assert.equal(summary.billingGate.mode, "block");
  });

  void test("VISA_APPLYING: branches to ENTRY_SUCCESS and VISA_REJECTED", () => {
    const entity = makeCaseEntity({ currentWorkflowStepCode: "VISA_APPLYING" });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.ok(summary);
    assert.ok(summary.allowedNextSteps.includes("ENTRY_SUCCESS"));
    assert.ok(summary.allowedNextSteps.includes("VISA_REJECTED"));
    assert.equal(summary.billingGate, null);
  });

  void test("ENTRY_SUCCESS: S8, not terminal, next=RESIDENCE_PERIOD_RECORDED", () => {
    const entity = makeCaseEntity({ currentWorkflowStepCode: "ENTRY_SUCCESS" });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.ok(summary);
    assert.equal(summary.parentStage, "S8");
    assert.equal(summary.isTerminal, false);
    assert.ok(summary.allowedNextSteps.includes("RESIDENCE_PERIOD_RECORDED"));
  });

  void test("VISA_REJECTED: S9, terminal, no next steps", () => {
    const entity = makeCaseEntity({ currentWorkflowStepCode: "VISA_REJECTED" });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.ok(summary);
    assert.equal(summary.parentStage, "S9");
    assert.equal(summary.isTerminal, true);
    assert.deepEqual(summary.allowedNextSteps, []);
  });
});

void describe("§22 resolveWorkflowStepSummary: residence chain steps", () => {
  void test("RESIDENCE_PERIOD_RECORDED: S8, not terminal, next=RRS", () => {
    const entity = makeCaseEntity({
      currentWorkflowStepCode: "RESIDENCE_PERIOD_RECORDED",
    });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.ok(summary);
    assert.equal(summary.parentStage, "S8");
    assert.equal(summary.isTerminal, false);
    assert.ok(summary.allowedNextSteps.includes("RENEWAL_REMINDER_SCHEDULED"));
    assert.equal(summary.billingGate, null);
  });

  void test("RENEWAL_REMINDER_SCHEDULED: S8, terminal, no next steps", () => {
    const entity = makeCaseEntity({
      currentWorkflowStepCode: "RENEWAL_REMINDER_SCHEDULED",
    });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.ok(summary);
    assert.equal(summary.parentStage, "S8");
    assert.equal(summary.isTerminal, true);
    assert.deepEqual(summary.allowedNextSteps, []);
    assert.equal(summary.billingGate, null);
  });

  void test("P0 case without workflow step returns null", () => {
    const entity = makeCaseEntity({ currentWorkflowStepCode: null });
    const summary = resolveWorkflowStepSummary(entity as never);
    assert.equal(summary, null);
  });
});

void describe("§22 read model snapshots align with resolveWorkflowStepSummary", () => {
  void test("all overseas step snapshots match dynamic computation", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      const entity = makeCaseEntity({ currentWorkflowStepCode: code });
      const summary = resolveWorkflowStepSummary(entity as never);
      assert.ok(summary, `summary should exist for ${code}`);
      const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS[code];
      assert.equal(
        summary.parentStage,
        snapshot.parentStage,
        `parentStage mismatch for ${code}`,
      );
      assert.equal(
        summary.isTerminal,
        snapshot.isTerminal,
        `isTerminal mismatch for ${code}`,
      );
      assert.deepEqual(
        summary.allowedNextSteps,
        [...snapshot.allowedNextSteps],
        `allowedNextSteps mismatch for ${code}`,
      );
    }
  });
});

void describe("§23 mapCaseRow: P1 COE/visa/residence field mapping", () => {
  void test("maps coe_sent_at timestamp", () => {
    const c = mapCaseRow(
      makeCaseRow({
        coe_sent_at: "2026-03-01T00:00:00.000Z",
      }) as unknown as CaseQueryRow,
    );
    assert.equal(c.coeSentAt, "2026-03-01T00:00:00.000Z");
  });

  void test("maps overseas_visa_start_at timestamp", () => {
    const c = mapCaseRow(
      makeCaseRow({
        overseas_visa_start_at: "2026-03-15T00:00:00.000Z",
      }) as unknown as CaseQueryRow,
    );
    assert.equal(c.overseasVisaStartAt, "2026-03-15T00:00:00.000Z");
  });

  void test("maps entry_confirmed_at timestamp", () => {
    const c = mapCaseRow(
      makeCaseRow({
        entry_confirmed_at: "2026-04-01T00:00:00.000Z",
      }) as unknown as CaseQueryRow,
    );
    assert.equal(c.entryConfirmedAt, "2026-04-01T00:00:00.000Z");
  });

  void test("maps result_outcome string", () => {
    const c = mapCaseRow(
      makeCaseRow({ result_outcome: "rejected" }) as unknown as CaseQueryRow,
    );
    assert.equal(c.resultOutcome, "rejected");
  });

  void test("maps result_outcome null", () => {
    const c = mapCaseRow(
      makeCaseRow({ result_outcome: null }) as unknown as CaseQueryRow,
    );
    assert.equal(c.resultOutcome, null);
  });

  void test("maps current_workflow_step_code for overseas steps", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      const c = mapCaseRow(
        makeCaseRow({
          current_workflow_step_code: code,
        }) as unknown as CaseQueryRow,
      );
      assert.equal(c.currentWorkflowStepCode, code);
    }
  });

  void test("maps final_payment_paid_cached boolean", () => {
    const paid = mapCaseRow(
      makeCaseRow({
        final_payment_paid_cached: true,
      }) as unknown as CaseQueryRow,
    );
    assert.equal(paid.finalPaymentPaidCached, true);

    const unpaid = mapCaseRow(
      makeCaseRow({
        final_payment_paid_cached: false,
      }) as unknown as CaseQueryRow,
    );
    assert.equal(unpaid.finalPaymentPaidCached, false);
  });

  void test("maps billing_unpaid_amount_cached from numeric string", () => {
    const c = mapCaseRow(
      makeCaseRow({
        billing_unpaid_amount_cached: "250000",
      }) as unknown as CaseQueryRow,
    );
    assert.ok(
      typeof c.billingUnpaidAmountCached === "number" ||
        typeof c.billingUnpaidAmountCached === "string",
    );
  });

  void test("all null overseas timestamps map to null", () => {
    const c = mapCaseRow(
      makeCaseRow({
        coe_sent_at: null,
        overseas_visa_start_at: null,
        entry_confirmed_at: null,
      }) as unknown as CaseQueryRow,
    );
    assert.equal(c.coeSentAt, null);
    assert.equal(c.overseasVisaStartAt, null);
    assert.equal(c.entryConfirmedAt, null);
  });
});

void describe("§23 error code layering: P0/P1 separation", () => {
  void test("all P1 workflow step error codes from FINAL_PAYMENT_GUARD are CASE_ prefixed", () => {
    assert.match(FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_BLOCKED, /^CASE_/);
    assert.match(
      FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_RISK_UNACKNOWLEDGED,
      /^CASE_/,
    );
    assert.match(
      FINAL_PAYMENT_GUARD_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
      /^CASE_/,
    );
  });

  void test("post-approval billing codes are CASE_ prefixed", () => {
    assert.match(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      /^CASE_/,
    );
    assert.match(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
      /^CASE_/,
    );
  });

  void test("SUCCESS_CLOSEOUT_BLOCKED code exists", () => {
    assert.ok(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED);
    assert.match(CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED, /^CASE_/);
  });

  void test("S9_READONLY code exists (used for terminal stage blocks)", () => {
    assert.ok(CASE_WRITE_ERROR_CODES.S9_READONLY);
  });

  void test("all P1 billing guard codes are mutually distinct", () => {
    const codes = [
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED,
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED,
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED,
    ];
    assert.equal(new Set(codes).size, 3);
  });
});

void describe("§23 blueprint alignment: BMV_CASE_TYPE consistency", () => {
  void test("BMV_CASE_TYPE equals BMV_CASE_TYPE_CODE", () => {
    assert.equal(BMV_CASE_TYPE, BMV_CASE_TYPE_CODE);
  });

  void test("blueprint contains all overseas step codes", () => {
    for (const code of Object.values(OVERSEAS_STEP_CODES)) {
      const step = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
        (s) => s.stepCode === code,
      );
      assert.ok(step, `${code} must exist in blueprint`);
    }
  });

  void test("blueprint contains RESIDENCE_PERIOD_RECORDED and RENEWAL_REMINDER_SCHEDULED", () => {
    const rpr = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "RESIDENCE_PERIOD_RECORDED",
    );
    assert.ok(rpr, "RESIDENCE_PERIOD_RECORDED must exist in blueprint");

    const rrs = BMV_WORKFLOW_STEPS_BLUEPRINT.find(
      (s) => s.stepCode === "RENEWAL_REMINDER_SCHEDULED",
    );
    assert.ok(rrs, "RENEWAL_REMINDER_SCHEDULED must exist in blueprint");
  });

  void test("blueprint COE_SENT is the only step with block billing gate", () => {
    const blockSteps = BMV_WORKFLOW_STEPS_BLUEPRINT.filter(
      (s) => s.billingGate?.mode === "block",
    );
    assert.equal(blockSteps.length, 1);
    assert.equal(blockSteps[0].stepCode, "COE_SENT");
  });

  void test("blueprint step sort orders are monotonically increasing", () => {
    for (let i = 1; i < BMV_WORKFLOW_STEPS_BLUEPRINT.length; i++) {
      assert.ok(
        BMV_WORKFLOW_STEPS_BLUEPRINT[i].sortOrder >
          BMV_WORKFLOW_STEPS_BLUEPRINT[i - 1].sortOrder,
        `sortOrder not increasing at index ${String(i)}: ${BMV_WORKFLOW_STEPS_BLUEPRINT[i - 1].stepCode}(${String(BMV_WORKFLOW_STEPS_BLUEPRINT[i - 1].sortOrder)}) → ${BMV_WORKFLOW_STEPS_BLUEPRINT[i].stepCode}(${String(BMV_WORKFLOW_STEPS_BLUEPRINT[i].sortOrder)})`,
      );
    }
  });
});

void describe("§23 closeout precondition codes alignment", () => {
  void test("SUCCESS_CLOSEOUT_PRECONDITION_CODES has exactly 3 entries", () => {
    assert.equal(Object.keys(SUCCESS_CLOSEOUT_PRECONDITION_CODES).length, 3);
  });

  void test("precondition codes are stable strings", () => {
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.ENTRY_CONFIRMED,
      "ENTRY_CONFIRMED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RESIDENCE_PERIOD_RECORDED,
      "RESIDENCE_PERIOD_RECORDED",
    );
    assert.equal(
      SUCCESS_CLOSEOUT_PRECONDITION_CODES.RENEWAL_REMINDER_SCHEDULED,
      "RENEWAL_REMINDER_SCHEDULED",
    );
  });

  void test("precondition labels are non-empty Japanese strings", () => {
    const input: SuccessCloseoutCheckInput = {
      caseEntity: makeCaseEntity({ entryConfirmedAt: null }),
      currentResidencePeriod: null,
    };
    const result = checkSuccessCloseoutPreconditions(input);
    for (const p of result.preconditions) {
      assert.ok(p.label.length > 0, `${p.code} label must be non-empty`);
    }
  });

  void test("OVERSEAS_TIMELINE_ACTIONS has all expected action names", () => {
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.WORKFLOW_STEP_TRANSITIONED,
      "case.workflow_step_transitioned",
    );
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.VISA_REJECTED_CLOSURE,
      "case.overseas_visa_rejected",
    );
    assert.equal(
      OVERSEAS_TIMELINE_ACTIONS.ENTRY_CONFIRMED,
      "case.overseas_entry_confirmed",
    );
  });
});
