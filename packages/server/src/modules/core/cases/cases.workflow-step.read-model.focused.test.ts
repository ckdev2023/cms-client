import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  BMV_WORKFLOW_STEP_ENUM,
  type BmvWorkflowStep,
  BMV_STEP_TO_STAGE,
  BMV_STEP_TRANSITIONS,
} from "./cases.workflow-step";
import { resolveWorkflowStepSummary } from "./cases.workflow-step-readmodel";
import {
  buildMockCase,
  getWorkflowStepSummaryOrFail,
} from "./cases.workflow-step.focused.test-support";

void describe("resolveWorkflowStepSummary — null returns", () => {
  void test("returns null when currentWorkflowStepCode is null (P0 case)", () => {
    const c = buildMockCase({ currentWorkflowStepCode: null });
    assert.equal(resolveWorkflowStepSummary(c), null);
  });

  void test("returns null when currentWorkflowStepCode is undefined-like empty string", () => {
    const c = buildMockCase({ currentWorkflowStepCode: "" });
    assert.equal(resolveWorkflowStepSummary(c), null);
  });

  void test("returns null for unknown step code", () => {
    const c = buildMockCase({ currentWorkflowStepCode: "NONEXISTENT_STEP" });
    assert.equal(resolveWorkflowStepSummary(c), null);
  });

  void test("returns null for P0 stage value used as step code", () => {
    const c = buildMockCase({ currentWorkflowStepCode: "S5" });
    assert.equal(resolveWorkflowStepSummary(c), null);
  });
});

void describe("resolveWorkflowStepSummary — shape contract", () => {
  void test("output has exactly the WorkflowStepSummary fields", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "REVIEWING",
      stage: "S4",
    });
    const result = resolveWorkflowStepSummary(c);
    assert.ok(result);
    const keys = Object.keys(result).sort();
    const expected = [
      "allowedNextSteps",
      "billingGate",
      "currentStepCode",
      "currentStepLabel",
      "isTerminal",
      "parentStage",
      "sortOrder",
    ];
    assert.deepEqual(keys, expected);
  });

  void test("all fields have correct types", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "REVIEWING",
      stage: "S4",
    });
    const result = getWorkflowStepSummaryOrFail(c);
    assert.equal(typeof result.currentStepCode, "string");
    assert.equal(typeof result.currentStepLabel, "string");
    assert.equal(typeof result.parentStage, "string");
    assert.equal(typeof result.sortOrder, "number");
    assert.equal(typeof result.isTerminal, "boolean");
    assert.ok(Array.isArray(result.allowedNextSteps));
  });
});

void describe("resolveWorkflowStepSummary — per-step correctness", () => {
  void test("every BMV step produces a non-null summary", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = resolveWorkflowStepSummary(c);
      assert.ok(result, `Expected non-null summary for ${stepCode}`);
    }
  });

  void test("currentStepCode matches input for every BMV step", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      assert.equal(result.currentStepCode, stepCode);
    }
  });

  void test("parentStage matches BMV_STEP_TO_STAGE for every step", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      assert.equal(
        result.parentStage,
        BMV_STEP_TO_STAGE[stepCode],
        `${stepCode}: summary parentStage mismatch`,
      );
    }
  });

  void test("allowedNextSteps matches BMV_STEP_TRANSITIONS for every step", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      assert.deepEqual(
        result.allowedNextSteps,
        [...BMV_STEP_TRANSITIONS[stepCode]],
        `${stepCode}: allowedNextSteps mismatch`,
      );
    }
  });

  void test("isTerminal is true only for VISA_REJECTED and RENEWAL_REMINDER_SCHEDULED", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      const expectedTerminal =
        stepCode === "VISA_REJECTED" ||
        stepCode === "RENEWAL_REMINDER_SCHEDULED";
      assert.equal(
        result.isTerminal,
        expectedTerminal,
        `${stepCode}: expected isTerminal=${String(expectedTerminal)}`,
      );
    }
  });

  void test("sortOrder is positive for every step", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      assert.ok(
        result.sortOrder > 0,
        `${stepCode}: sortOrder must be positive`,
      );
    }
  });

  void test("currentStepLabel is non-empty for every step", () => {
    for (const stepCode of BMV_WORKFLOW_STEP_ENUM) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      assert.ok(
        result.currentStepLabel.length > 0,
        `${stepCode}: label should not be empty`,
      );
    }
  });
});

void describe("resolveWorkflowStepSummary — billingGate propagation", () => {
  void test("COE_SENT carries block mode with final_payment milestone", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "COE_SENT",
      stage: "S7",
    });
    const result = getWorkflowStepSummaryOrFail(c);
    assert.ok(result.billingGate);
    assert.equal(result.billingGate.mode, "block");
    assert.equal(result.billingGate.milestone, "final_payment");
  });

  void test("steps without billing gate return null billingGate", () => {
    const stepsWithoutGate: BmvWorkflowStep[] = [
      "WAITING_MATERIAL",
      "MATERIAL_PREPARING",
      "REVIEWING",
      "APPLYING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "APPROVED",
      "WAITING_PAYMENT",
      "VISA_APPLYING",
      "ENTRY_SUCCESS",
      "VISA_REJECTED",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ];
    for (const stepCode of stepsWithoutGate) {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      const result = getWorkflowStepSummaryOrFail(c);
      assert.equal(
        result.billingGate,
        null,
        `${stepCode}: expected null billingGate`,
      );
    }
  });

  void test("only COE_SENT has a non-null billingGate among all BMV steps", () => {
    const stepsWithGate = BMV_WORKFLOW_STEP_ENUM.filter((stepCode) => {
      const c = buildMockCase({
        currentWorkflowStepCode: stepCode,
        stage: BMV_STEP_TO_STAGE[stepCode],
      });
      return getWorkflowStepSummaryOrFail(c).billingGate !== null;
    });
    assert.deepEqual(stepsWithGate, ["COE_SENT"]);
  });
});

void describe("resolveWorkflowStepSummary — immutability", () => {
  void test("does not mutate the input case entity", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "UNDER_REVIEW",
      stage: "S5",
    });
    const snapshot = JSON.stringify(c);
    resolveWorkflowStepSummary(c);
    assert.equal(JSON.stringify(c), snapshot);
  });

  void test("parentStage in summary reflects the step definition, not Case.stage", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "WAITING_MATERIAL",
      stage: "S6",
    });
    const result = getWorkflowStepSummaryOrFail(c);
    assert.equal(result.parentStage, "S2");
    assert.equal(c.stage, "S6");
  });
});

void describe("resolveWorkflowStepSummary — specific scenario snapshots", () => {
  void test("WAITING_MATERIAL: first step, single next, no gate", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "WAITING_MATERIAL",
      stage: "S2",
    });
    const r = getWorkflowStepSummaryOrFail(c);
    assert.equal(r.currentStepCode, "WAITING_MATERIAL");
    assert.equal(r.parentStage, "S2");
    assert.equal(r.isTerminal, false);
    assert.deepEqual(r.allowedNextSteps, ["MATERIAL_PREPARING"]);
    assert.equal(r.billingGate, null);
    assert.equal(r.sortOrder, 1);
  });

  void test("UNDER_REVIEW: branching point with 3 exits", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "UNDER_REVIEW",
      stage: "S5",
    });
    const r = getWorkflowStepSummaryOrFail(c);
    assert.equal(r.currentStepCode, "UNDER_REVIEW");
    assert.equal(r.parentStage, "S5");
    assert.equal(r.isTerminal, false);
    assert.equal(r.allowedNextSteps.length, 3);
    assert.ok(r.allowedNextSteps.includes("NEED_SUPPLEMENT"));
    assert.ok(r.allowedNextSteps.includes("APPROVED"));
    assert.ok(r.allowedNextSteps.includes("VISA_REJECTED"));
  });

  void test("VISA_APPLYING: branching point with success/failure exits", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "VISA_APPLYING",
      stage: "S7",
    });
    const r = getWorkflowStepSummaryOrFail(c);
    assert.equal(r.allowedNextSteps.length, 2);
    assert.ok(r.allowedNextSteps.includes("ENTRY_SUCCESS"));
    assert.ok(r.allowedNextSteps.includes("VISA_REJECTED"));
  });

  void test("VISA_REJECTED: terminal failure, no next steps", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "VISA_REJECTED",
      stage: "S9",
    });
    const r = getWorkflowStepSummaryOrFail(c);
    assert.equal(r.isTerminal, true);
    assert.deepEqual(r.allowedNextSteps, []);
    assert.equal(r.parentStage, "S9");
  });

  void test("RENEWAL_REMINDER_SCHEDULED: terminal success, no next steps", () => {
    const c = buildMockCase({
      currentWorkflowStepCode: "RENEWAL_REMINDER_SCHEDULED",
      stage: "S8",
    });
    const r = getWorkflowStepSummaryOrFail(c);
    assert.equal(r.isTerminal, true);
    assert.deepEqual(r.allowedNextSteps, []);
    assert.equal(r.parentStage, "S8");
  });
});
