import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  P0_STAGES,
  isP0Stage,
  BMV_WORKFLOW_STEP_ENUM,
  isBmvWorkflowStep,
  BMV_STEP_TO_STAGE,
  resolveParentStage,
  BMV_STAGE_TO_STEPS,
  BMV_STEP_TRANSITIONS,
  isValidStepTransition,
  checkParallelBoundary,
  blueprintToWorkflowSteps,
  isTerminalStep,
  isTerminalStage,
} from "./cases.workflow-step";
import {
  BMV_WORKFLOW_STEPS_BLUEPRINT,
  BMV_WORKFLOW_STEP_CODES,
} from "./bmvTemplateConfig";
import { BMV_STEP_CODES as TEMPLATE_BMV_STEP_CODES } from "./cases.template-bmv";
void describe("P0 stage enum", () => {
  void test("contains exactly S1-S9", () => {
    assert.deepEqual(
      [...P0_STAGES],
      ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"],
    );
  });
  void test("isP0Stage accepts only valid stage codes", () => {
    for (const stage of P0_STAGES) assert.equal(isP0Stage(stage), true);
    assert.equal(isP0Stage("S0"), false);
    assert.equal(isP0Stage("S10"), false);
    assert.equal(isP0Stage("WAITING_MATERIAL"), false);
  });
});
void describe("BMV workflow step enum", () => {
  void test("contains the canonical 15 steps", () => {
    assert.equal(BMV_WORKFLOW_STEP_ENUM.length, 15);
    assert.deepEqual(BMV_WORKFLOW_STEP_ENUM, BMV_WORKFLOW_STEP_CODES);
    assert.deepEqual(BMV_WORKFLOW_STEP_ENUM, TEMPLATE_BMV_STEP_CODES);
  });
  void test("isBmvWorkflowStep accepts workflow step codes and rejects P0 stages", () => {
    for (const step of BMV_WORKFLOW_STEP_ENUM)
      assert.equal(isBmvWorkflowStep(step), true);
    assert.equal(isBmvWorkflowStep("S1"), false);
    assert.equal(isBmvWorkflowStep("UNKNOWN_STEP"), false);
    assert.equal(isBmvWorkflowStep(""), false);
  });
});
void describe("BMV step → P0 stage mapping", () => {
  void test("resolveParentStage matches the static map", () => {
    for (const step of BMV_WORKFLOW_STEP_ENUM) {
      assert.equal(resolveParentStage(step), BMV_STEP_TO_STAGE[step]);
      assert.equal(isP0Stage(BMV_STEP_TO_STAGE[step]), true);
    }
  });
  void test("key stage groupings remain stable", () => {
    assert.equal(BMV_STEP_TO_STAGE.WAITING_MATERIAL, "S2");
    assert.equal(BMV_STEP_TO_STAGE.MATERIAL_PREPARING, "S3");
    assert.equal(BMV_STEP_TO_STAGE.REVIEWING, "S4");
    assert.deepEqual(BMV_STAGE_TO_STEPS.S1, []);
    assert.deepEqual(BMV_STAGE_TO_STEPS.S9, ["VISA_REJECTED"]);
    assert.deepEqual(BMV_STAGE_TO_STEPS.S8, [
      "ENTRY_SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ]);
  });
  void test("blueprint parentStage aligns with workflow-step mapping", () => {
    for (const bp of BMV_WORKFLOW_STEPS_BLUEPRINT) {
      if (bp.parentStage && isBmvWorkflowStep(bp.stepCode)) {
        assert.equal(BMV_STEP_TO_STAGE[bp.stepCode], bp.parentStage);
      }
    }
  });
});
void describe("BMV step transitions", () => {
  void test("every step has a transition list and all targets are valid steps", () => {
    for (const from of BMV_WORKFLOW_STEP_ENUM) {
      assert.ok(from in BMV_STEP_TRANSITIONS);
      for (const to of BMV_STEP_TRANSITIONS[from]) {
        assert.equal(
          isBmvWorkflowStep(to),
          true,
          `${from} → ${to} should point to a valid step`,
        );
        assert.equal(isValidStepTransition(from, to), true);
      }
    }
  });
  void test("mainline transitions remain valid", () => {
    assert.equal(
      isValidStepTransition("WAITING_MATERIAL", "MATERIAL_PREPARING"),
      true,
    );
    assert.equal(
      isValidStepTransition("MATERIAL_PREPARING", "REVIEWING"),
      true,
    );
    assert.equal(isValidStepTransition("REVIEWING", "APPLYING"), true);
    assert.equal(isValidStepTransition("APPLYING", "UNDER_REVIEW"), true);
    assert.equal(isValidStepTransition("UNDER_REVIEW", "APPROVED"), true);
    assert.equal(isValidStepTransition("APPROVED", "WAITING_PAYMENT"), true);
    assert.equal(isValidStepTransition("WAITING_PAYMENT", "COE_SENT"), true);
    assert.equal(isValidStepTransition("COE_SENT", "VISA_APPLYING"), true);
    assert.equal(isValidStepTransition("VISA_APPLYING", "ENTRY_SUCCESS"), true);
    assert.equal(
      isValidStepTransition("ENTRY_SUCCESS", "RESIDENCE_PERIOD_RECORDED"),
      true,
    );
    assert.equal(
      isValidStepTransition(
        "RESIDENCE_PERIOD_RECORDED",
        "RENEWAL_REMINDER_SCHEDULED",
      ),
      true,
    );
  });
  void test("supplement loop transitions remain valid", () => {
    assert.equal(
      isValidStepTransition("UNDER_REVIEW", "NEED_SUPPLEMENT"),
      true,
    );
    assert.equal(
      isValidStepTransition("NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"),
      true,
    );
    assert.equal(
      isValidStepTransition("SUPPLEMENT_PROCESSING", "UNDER_REVIEW"),
      true,
    );
  });
  void test("obviously illegal transitions remain rejected", () => {
    assert.equal(isValidStepTransition("WAITING_MATERIAL", "REVIEWING"), false);
    assert.equal(isValidStepTransition("APPROVED", "COE_SENT"), false);
    assert.equal(
      isValidStepTransition("ENTRY_SUCCESS", "VISA_REJECTED"),
      false,
    );
    assert.equal(
      isValidStepTransition("VISA_REJECTED", "ENTRY_SUCCESS"),
      false,
    );
    assert.equal(
      isValidStepTransition("RENEWAL_REMINDER_SCHEDULED", "ENTRY_SUCCESS"),
      false,
    );
  });
});
void describe("parallel boundary check", () => {
  void test("step is compatible when current stage equals its parent stage", () => {
    const result = checkParallelBoundary("REVIEWING", "S4");
    assert.equal(result.compatible, true);
    assert.equal(result.stepParentStage, "S4");
    assert.equal(result.currentStage, "S4");
  });
  void test("step is compatible when case stage has already advanced past parent stage", () => {
    const result = checkParallelBoundary("WAITING_MATERIAL", "S7");
    assert.equal(result.compatible, true);
    assert.equal(result.stepParentStage, "S2");
  });
  void test("non-terminal step is rejected when parent stage is ahead of current stage", () => {
    const result = checkParallelBoundary("COE_SENT", "S6");
    assert.equal(result.compatible, false);
    assert.equal(
      result.reason,
      "Step COE_SENT requires stage S7 but case is at S6",
    );
  });
  void test("terminal step may be ahead of current stage", () => {
    const result = checkParallelBoundary("VISA_REJECTED", "S7");
    assert.equal(result.compatible, true);
    assert.equal(result.stepParentStage, "S9");
  });
  void test("invalid current stage is rejected", () => {
    const result = checkParallelBoundary("REVIEWING", "BAD_STAGE");
    assert.equal(result.compatible, false);
    assert.equal(result.reason, "Invalid P0 stage: BAD_STAGE");
  });
});
void describe("blueprintToWorkflowSteps", () => {
  void test("converts BMV blueprint to ordered workflow step records", () => {
    const steps = blueprintToWorkflowSteps(BMV_WORKFLOW_STEPS_BLUEPRINT);
    assert.equal(steps.length, BMV_WORKFLOW_STEP_ENUM.length);
    assert.equal(steps[0]?.stepCode, "WAITING_MATERIAL");
    assert.equal(steps[0]?.parentStage, "S2");
    assert.equal(steps[0]?.sortOrder, 1);
    assert.equal(steps.at(-1)?.stepCode, "RENEWAL_REMINDER_SCHEDULED");
  });
  void test("preserves billingGate for COE_SENT and filters invalid parentStage entries", () => {
    const steps = blueprintToWorkflowSteps([
      ...BMV_WORKFLOW_STEPS_BLUEPRINT,
      {
        stepCode: "BAD_STAGE",
        label: "bad",
        parentStage: "SX",
        sortOrder: 999,
        canLoopTo: null,
        billingGate: null,
      },
    ]);
    const coeSent = steps.find((step) => step.stepCode === "COE_SENT");
    assert.ok(coeSent);
    assert.deepEqual(coeSent.billingGate, {
      mode: "block",
      milestone: "final_payment",
    });
    assert.equal(
      steps.some((step) => step.stepCode === "BAD_STAGE"),
      false,
    );
  });
});
void describe("terminal step and stage detection", () => {
  void test("terminal step detection matches workflow semantics", () => {
    assert.equal(isTerminalStep("VISA_REJECTED"), true);
    assert.equal(isTerminalStep("RENEWAL_REMINDER_SCHEDULED"), true);
    assert.equal(isTerminalStep("REVIEWING"), false);
    assert.equal(isTerminalStep("ENTRY_SUCCESS"), false);
  });
  void test("terminal stage detection matches workflow semantics", () => {
    assert.equal(isTerminalStage("S9"), true);
    assert.equal(isTerminalStage("S1"), false);
    assert.equal(isTerminalStage("S5"), false);
    assert.equal(isTerminalStage("S8"), false);
  });
  void test("terminal steps have no outgoing transitions", () => {
    assert.deepEqual(BMV_STEP_TRANSITIONS.VISA_REJECTED, []);
    assert.deepEqual(BMV_STEP_TRANSITIONS.RENEWAL_REMINDER_SCHEDULED, []);
  });
});
//# sourceMappingURL=cases.workflow-step.focused.test.js.map
