import { describe, test } from "node:test";
import assert from "node:assert/strict";

import {
  BMV_STEP_TO_STAGE,
  BMV_STEP_TRANSITIONS,
  checkParallelBoundary,
  isTerminalStep,
  isValidStepTransition,
} from "../cases/cases.workflow-step";
import { resolveWorkflowStepSummary } from "../cases/cases.workflow-step-readmodel";
import {
  ENTRY_SUCCESS_FOLLOW_UP,
  OVERSEAS_STEP_READ_SNAPSHOTS,
} from "../cases/cases.types-overseas-step";
import { makeCaseEntity } from "./residencePeriods.focused.test-support";

// ═══════════════════════════════════════════════════════════════
// C. 結案前置条件 — closeout precondition contracts
// ═══════════════════════════════════════════════════════════════

void describe("closeout: step transition matrix (ENTRY_SUCCESS → RPR → RRS)", () => {
  void test("ENTRY_SUCCESS → RESIDENCE_PERIOD_RECORDED is valid transition", () => {
    assert.ok(
      isValidStepTransition("ENTRY_SUCCESS", "RESIDENCE_PERIOD_RECORDED"),
    );
  });

  void test("RESIDENCE_PERIOD_RECORDED → RENEWAL_REMINDER_SCHEDULED is valid transition", () => {
    assert.ok(
      isValidStepTransition(
        "RESIDENCE_PERIOD_RECORDED",
        "RENEWAL_REMINDER_SCHEDULED",
      ),
    );
  });

  void test("ENTRY_SUCCESS cannot skip to RENEWAL_REMINDER_SCHEDULED", () => {
    assert.ok(
      !isValidStepTransition("ENTRY_SUCCESS", "RENEWAL_REMINDER_SCHEDULED"),
    );
  });

  void test("RESIDENCE_PERIOD_RECORDED has exactly one valid target", () => {
    const targets = BMV_STEP_TRANSITIONS.RESIDENCE_PERIOD_RECORDED;
    assert.equal(targets.length, 1);
    assert.equal(targets[0], "RENEWAL_REMINDER_SCHEDULED");
  });

  void test("RENEWAL_REMINDER_SCHEDULED is terminal step (no further transitions)", () => {
    assert.ok(isTerminalStep("RENEWAL_REMINDER_SCHEDULED"));
    assert.equal(BMV_STEP_TRANSITIONS.RENEWAL_REMINDER_SCHEDULED.length, 0);
  });

  void test("RESIDENCE_PERIOD_RECORDED is NOT terminal (can still advance)", () => {
    assert.ok(!isTerminalStep("RESIDENCE_PERIOD_RECORDED"));
  });
});

void describe("closeout: P0 stage mapping for RPR/RRS steps", () => {
  void test("RESIDENCE_PERIOD_RECORDED maps to S8 parent stage", () => {
    assert.equal(BMV_STEP_TO_STAGE.RESIDENCE_PERIOD_RECORDED, "S8");
  });

  void test("RENEWAL_REMINDER_SCHEDULED maps to S8 parent stage", () => {
    assert.equal(BMV_STEP_TO_STAGE.RENEWAL_REMINDER_SCHEDULED, "S8");
  });
});

void describe("closeout: parallel boundary for RPR/RRS steps", () => {
  void test("RESIDENCE_PERIOD_RECORDED requires at least S8", () => {
    const reject = checkParallelBoundary("RESIDENCE_PERIOD_RECORDED", "S7");
    assert.equal(reject.compatible, false);
    assert.equal(reject.stepParentStage, "S8");
  });

  void test("RESIDENCE_PERIOD_RECORDED is compatible with S8", () => {
    const result = checkParallelBoundary("RESIDENCE_PERIOD_RECORDED", "S8");
    assert.equal(result.compatible, true);
  });

  void test("RENEWAL_REMINDER_SCHEDULED is terminal — boundary relaxed at S5", () => {
    const result = checkParallelBoundary("RENEWAL_REMINDER_SCHEDULED", "S5");
    assert.equal(result.compatible, true, "terminal step boundary is relaxed");
    assert.equal(result.stepParentStage, "S8");
  });

  void test("RENEWAL_REMINDER_SCHEDULED is compatible with S8", () => {
    const result = checkParallelBoundary("RENEWAL_REMINDER_SCHEDULED", "S8");
    assert.equal(result.compatible, true);
  });

  void test("RENEWAL_REMINDER_SCHEDULED is compatible with S9", () => {
    const result = checkParallelBoundary("RENEWAL_REMINDER_SCHEDULED", "S9");
    assert.equal(result.compatible, true);
  });
});

void describe("closeout: ENTRY_SUCCESS_FOLLOW_UP contract completeness", () => {
  void test("next step after ENTRY_SUCCESS is RESIDENCE_PERIOD_RECORDED", () => {
    assert.equal(ENTRY_SUCCESS_FOLLOW_UP.nextStep, "RESIDENCE_PERIOD_RECORDED");
  });

  void test("success close requires residencePeriodRecorded", () => {
    assert.equal(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose
        .residencePeriodRecorded,
      true,
    );
  });

  void test("success close requires renewalReminderScheduled", () => {
    assert.equal(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose
        .renewalReminderScheduled,
      true,
    );
  });

  void test("both closeout gates are present (not just one)", () => {
    const keys = Object.keys(
      ENTRY_SUCCESS_FOLLOW_UP.requiredBeforeSuccessClose,
    );
    assert.ok(keys.includes("residencePeriodRecorded"));
    assert.ok(keys.includes("renewalReminderScheduled"));
    assert.equal(keys.length, 2, "exactly two closeout preconditions");
  });
});

void describe("closeout: ENTRY_SUCCESS read model indicates follow-up to RPR", () => {
  void test("ENTRY_SUCCESS allowedNextSteps includes RESIDENCE_PERIOD_RECORDED", () => {
    const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS.ENTRY_SUCCESS;
    assert.ok(snapshot.allowedNextSteps.includes("RESIDENCE_PERIOD_RECORDED"));
  });

  void test("ENTRY_SUCCESS is NOT terminal — follow-up required", () => {
    const snapshot = OVERSEAS_STEP_READ_SNAPSHOTS.ENTRY_SUCCESS;
    assert.equal(snapshot.isTerminal, false);
    assert.ok(!isTerminalStep("ENTRY_SUCCESS"));
  });
});

void describe("closeout: resolveWorkflowStepSummary for RPR and RRS", () => {
  void test("RESIDENCE_PERIOD_RECORDED: parentStage=S8, not terminal, next=RRS", () => {
    const entity = makeCaseEntity({
      currentWorkflowStepCode: "RESIDENCE_PERIOD_RECORDED",
    });
    const summary = resolveWorkflowStepSummary(entity);
    assert.ok(summary !== null);
    assert.equal(summary.currentStepCode, "RESIDENCE_PERIOD_RECORDED");
    assert.equal(summary.parentStage, "S8");
    assert.equal(summary.isTerminal, false);
    assert.ok(summary.allowedNextSteps.includes("RENEWAL_REMINDER_SCHEDULED"));
    assert.equal(summary.billingGate, null);
  });

  void test("RENEWAL_REMINDER_SCHEDULED: parentStage=S8, terminal, no next steps", () => {
    const entity = makeCaseEntity({
      currentWorkflowStepCode: "RENEWAL_REMINDER_SCHEDULED",
    });
    const summary = resolveWorkflowStepSummary(entity);
    assert.ok(summary !== null);
    assert.equal(summary.currentStepCode, "RENEWAL_REMINDER_SCHEDULED");
    assert.equal(summary.parentStage, "S8");
    assert.equal(summary.isTerminal, true);
    assert.deepEqual(summary.allowedNextSteps, []);
    assert.equal(summary.billingGate, null);
  });

  void test("P0 case without workflow step returns null", () => {
    const entity = makeCaseEntity({ currentWorkflowStepCode: null });
    const summary = resolveWorkflowStepSummary(entity);
    assert.equal(summary, null);
  });
});
