import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  P0_STAGES,
  isP0Stage,
  BMV_WORKFLOW_STEP_ENUM,
  isBmvWorkflowStep,
  BMV_STEP_TO_STAGE,
  BMV_STAGE_TO_STEPS,
  BMV_STEP_TRANSITIONS,
  isValidStepTransition,
  blueprintToWorkflowSteps,
} from "./cases.workflow-step";
import {
  BMV_WORKFLOW_STEPS_BLUEPRINT,
  BMV_WORKFLOW_STEP_CODES,
} from "./bmvTemplateConfig";
import { BMV_STEP_CODES as TEMPLATE_BMV_STEP_CODES } from "./cases.template-bmv";
void describe("parallel boundary invariants", () => {
  void test("CaseWorkflowStep must not contain S1-S9 values", () => {
    for (const stage of P0_STAGES) {
      assert.equal(
        isBmvWorkflowStep(stage),
        false,
        `P0 stage ${stage} should not be a valid BMV step`,
      );
    }
  });
  void test("P0 stages must not contain workflow step values", () => {
    for (const step of BMV_WORKFLOW_STEP_ENUM) {
      assert.equal(
        isP0Stage(step),
        false,
        `BMV step ${step} should not be a valid P0 stage`,
      );
    }
  });
  void test("no step parentStage is S1 (S1 is pre-workflow)", () => {
    for (const step of BMV_WORKFLOW_STEP_ENUM) {
      assert.notEqual(
        BMV_STEP_TO_STAGE[step],
        "S1",
        `${step} should not map to S1`,
      );
    }
  });
  void test("each parentStage in S2-S9 has at least one step (except S1)", () => {
    const usedStages = new Set(Object.values(BMV_STEP_TO_STAGE));
    for (const stage of P0_STAGES) {
      if (stage === "S1") continue;
      assert.ok(
        usedStages.has(stage),
        `${stage} has no associated BMV workflow step`,
      );
    }
  });
});
void describe("CaseWorkflowStep type contract", () => {
  void test("can construct a CaseWorkflowStep from blueprint data", () => {
    const step = {
      stepCode: "REVIEWING",
      label: "内部审核",
      parentStage: "S4",
      sortOrder: 3,
      canLoopTo: null,
      billingGate: null,
    };
    assert.equal(step.stepCode, "REVIEWING");
    assert.equal(step.parentStage, "S4");
  });
  void test("billingGate can carry block mode with milestone", () => {
    const step = {
      stepCode: "COE_SENT",
      label: "COE已发送",
      parentStage: "S7",
      sortOrder: 10,
      canLoopTo: null,
      billingGate: { mode: "block", milestone: "final_payment" },
    };
    assert.ok(step.billingGate);
    assert.equal(step.billingGate.mode, "block");
    assert.equal(step.billingGate.milestone, "final_payment");
  });
});
void describe("cross-file alignment: bmvTemplateConfig (canonical source)", () => {
  void test("BMV_WORKFLOW_STEP_CODES match workflow step enum", () => {
    assert.equal(BMV_WORKFLOW_STEP_ENUM.length, BMV_WORKFLOW_STEP_CODES.length);
    for (let i = 0; i < BMV_WORKFLOW_STEP_ENUM.length; i++) {
      assert.equal(BMV_WORKFLOW_STEP_ENUM[i], BMV_WORKFLOW_STEP_CODES[i]);
    }
  });
  void test("bmvTemplateConfig blueprint parentStage matches step-to-stage mapping", () => {
    for (const bp of BMV_WORKFLOW_STEPS_BLUEPRINT) {
      if (bp.parentStage && isBmvWorkflowStep(bp.stepCode)) {
        assert.equal(
          BMV_STEP_TO_STAGE[bp.stepCode],
          bp.parentStage,
          `${bp.stepCode}: enum mapping (${BMV_STEP_TO_STAGE[bp.stepCode]}) != bmvTemplateConfig (${bp.parentStage})`,
        );
      }
    }
  });
});
void describe("cross-file alignment: cases.template-bmv.ts step codes", () => {
  void test("step codes match between all three sources", () => {
    const enumCodes = [...BMV_WORKFLOW_STEP_ENUM];
    const configCodes = [...BMV_WORKFLOW_STEP_CODES];
    const templateCodes = [...TEMPLATE_BMV_STEP_CODES];
    assert.deepEqual(enumCodes, configCodes);
    assert.deepEqual(enumCodes, templateCodes);
  });
});
void describe("state mapping exhaustive verification", () => {
  void test("within each parentStage, steps have strictly increasing sortOrder", () => {
    const steps = blueprintToWorkflowSteps(BMV_WORKFLOW_STEPS_BLUEPRINT);
    for (const stage of P0_STAGES) {
      const stageSteps = steps
        .filter((s) => s.parentStage === stage)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      for (let i = 1; i < stageSteps.length; i++) {
        assert.ok(
          stageSteps[i].sortOrder > stageSteps[i - 1].sortOrder,
          `Within ${stage}: ${stageSteps[i].stepCode} sortOrder (${String(stageSteps[i].sortOrder)}) ` +
            `should be greater than ${stageSteps[i - 1].stepCode} sortOrder (${String(stageSteps[i - 1].sortOrder)})`,
        );
      }
    }
  });
  void test("sortOrder values are unique across all steps", () => {
    const steps = blueprintToWorkflowSteps(BMV_WORKFLOW_STEPS_BLUEPRINT);
    const orders = steps.map((s) => s.sortOrder);
    assert.equal(new Set(orders).size, orders.length);
  });
  void test("BMV_STEP_TO_STAGE and blueprintToWorkflowSteps produce identical parentStage per step", () => {
    const steps = blueprintToWorkflowSteps(BMV_WORKFLOW_STEPS_BLUEPRINT);
    for (const step of steps) {
      if (isBmvWorkflowStep(step.stepCode)) {
        assert.equal(
          step.parentStage,
          BMV_STEP_TO_STAGE[step.stepCode],
          `${step.stepCode}: blueprint parentStage (${step.parentStage}) != enum mapping (${BMV_STEP_TO_STAGE[step.stepCode]})`,
        );
      }
    }
  });
  void test("S5 supplement cycle steps all map to the same stage", () => {
    const cycleSteps = [
      "APPLYING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
    ];
    const stages = new Set(cycleSteps.map((s) => BMV_STEP_TO_STAGE[s]));
    assert.equal(
      stages.size,
      1,
      "All supplement cycle steps must share the same parentStage",
    );
    assert.ok(stages.has("S5"));
  });
  void test("S7 post-approval steps all map to S7", () => {
    const postApprovalSteps = ["WAITING_PAYMENT", "COE_SENT", "VISA_APPLYING"];
    for (const step of postApprovalSteps) {
      assert.equal(BMV_STEP_TO_STAGE[step], "S7", `${step} should map to S7`);
    }
  });
  void test("S8 success-path steps all map to S8", () => {
    const successSteps = [
      "ENTRY_SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ];
    for (const step of successSteps) {
      assert.equal(BMV_STEP_TO_STAGE[step], "S8", `${step} should map to S8`);
    }
  });
  void test("reverse map BMV_STAGE_TO_STEPS covers exactly the same steps as forward map", () => {
    const fromForward = new Set(BMV_WORKFLOW_STEP_ENUM);
    const fromReverse = new Set(
      P0_STAGES.flatMap((stage) => [...BMV_STAGE_TO_STEPS[stage]]),
    );
    assert.deepEqual(fromForward, fromReverse);
  });
  void test("each step appears in exactly one stage's reverse list", () => {
    const seen = new Map();
    for (const stage of P0_STAGES) {
      for (const step of BMV_STAGE_TO_STEPS[stage]) {
        assert.ok(
          !seen.has(step),
          `${step} appears in both ${String(seen.get(step))} and ${stage}`,
        );
        seen.set(step, stage);
      }
    }
    assert.equal(seen.size, BMV_WORKFLOW_STEP_ENUM.length);
  });
});
void describe("illegal transition comprehensive matrix", () => {
  void test("self-transitions are all rejected", () => {
    for (const step of BMV_WORKFLOW_STEP_ENUM) {
      assert.equal(
        isValidStepTransition(step, step),
        false,
        `Self-transition ${step} → ${step} should be rejected`,
      );
    }
  });
  void test("terminal steps reject all outgoing transitions", () => {
    const terminalSteps = ["VISA_REJECTED", "RENEWAL_REMINDER_SCHEDULED"];
    for (const from of terminalSteps) {
      for (const to of BMV_WORKFLOW_STEP_ENUM) {
        if (from === to) continue;
        assert.equal(
          isValidStepTransition(from, to),
          false,
          `Terminal step ${from} → ${to} should be rejected`,
        );
      }
    }
  });
  void test("skip-ahead transitions in the main forward path are rejected", () => {
    assert.equal(isValidStepTransition("WAITING_MATERIAL", "REVIEWING"), false);
    assert.equal(isValidStepTransition("WAITING_MATERIAL", "APPLYING"), false);
    assert.equal(isValidStepTransition("WAITING_MATERIAL", "APPROVED"), false);
    assert.equal(
      isValidStepTransition("MATERIAL_PREPARING", "APPLYING"),
      false,
    );
    assert.equal(
      isValidStepTransition("MATERIAL_PREPARING", "UNDER_REVIEW"),
      false,
    );
    assert.equal(isValidStepTransition("REVIEWING", "UNDER_REVIEW"), false);
    assert.equal(isValidStepTransition("APPLYING", "APPROVED"), false);
    assert.equal(isValidStepTransition("APPROVED", "COE_SENT"), false);
    assert.equal(
      isValidStepTransition("WAITING_PAYMENT", "VISA_APPLYING"),
      false,
    );
    assert.equal(isValidStepTransition("COE_SENT", "ENTRY_SUCCESS"), false);
  });
  void test("backward transitions along the main forward path are rejected", () => {
    assert.equal(
      isValidStepTransition("MATERIAL_PREPARING", "WAITING_MATERIAL"),
      false,
    );
    assert.equal(
      isValidStepTransition("REVIEWING", "MATERIAL_PREPARING"),
      false,
    );
    assert.equal(isValidStepTransition("APPLYING", "REVIEWING"), false);
    assert.equal(isValidStepTransition("UNDER_REVIEW", "APPLYING"), false);
    assert.equal(isValidStepTransition("APPROVED", "UNDER_REVIEW"), false);
    assert.equal(isValidStepTransition("WAITING_PAYMENT", "APPROVED"), false);
    assert.equal(isValidStepTransition("COE_SENT", "WAITING_PAYMENT"), false);
    assert.equal(isValidStepTransition("VISA_APPLYING", "COE_SENT"), false);
    assert.equal(
      isValidStepTransition("ENTRY_SUCCESS", "VISA_APPLYING"),
      false,
    );
    assert.equal(
      isValidStepTransition("RESIDENCE_PERIOD_RECORDED", "ENTRY_SUCCESS"),
      false,
    );
  });
  void test("cross-branch transitions are rejected (success path ↛ failure, failure ↛ success)", () => {
    assert.equal(
      isValidStepTransition("ENTRY_SUCCESS", "VISA_REJECTED"),
      false,
    );
    assert.equal(
      isValidStepTransition("RESIDENCE_PERIOD_RECORDED", "VISA_REJECTED"),
      false,
    );
    assert.equal(
      isValidStepTransition("RENEWAL_REMINDER_SCHEDULED", "VISA_REJECTED"),
      false,
    );
  });
  void test("every non-allowed pair is actually rejected", () => {
    let checkedCount = 0;
    for (const from of BMV_WORKFLOW_STEP_ENUM) {
      const allowed = new Set(BMV_STEP_TRANSITIONS[from]);
      for (const to of BMV_WORKFLOW_STEP_ENUM) {
        if (allowed.has(to)) continue;
        assert.equal(
          isValidStepTransition(from, to),
          false,
          `${from} → ${to} should be rejected but was allowed`,
        );
        checkedCount++;
      }
    }
    const totalPairs =
      BMV_WORKFLOW_STEP_ENUM.length * BMV_WORKFLOW_STEP_ENUM.length;
    const allowedPairs = BMV_WORKFLOW_STEP_ENUM.reduce(
      (sum, step) => sum + BMV_STEP_TRANSITIONS[step].length,
      0,
    );
    assert.equal(checkedCount, totalPairs - allowedPairs);
  });
  void test("supplement loop is bidirectional but does not skip", () => {
    assert.ok(isValidStepTransition("UNDER_REVIEW", "NEED_SUPPLEMENT"));
    assert.ok(
      isValidStepTransition("NEED_SUPPLEMENT", "SUPPLEMENT_PROCESSING"),
    );
    assert.ok(isValidStepTransition("SUPPLEMENT_PROCESSING", "UNDER_REVIEW"));
    assert.equal(
      isValidStepTransition("NEED_SUPPLEMENT", "UNDER_REVIEW"),
      false,
    );
    assert.equal(
      isValidStepTransition("SUPPLEMENT_PROCESSING", "NEED_SUPPLEMENT"),
      false,
    );
    assert.equal(
      isValidStepTransition("UNDER_REVIEW", "SUPPLEMENT_PROCESSING"),
      false,
    );
  });
  void test("total allowed transitions count is reasonable", () => {
    const totalAllowed = BMV_WORKFLOW_STEP_ENUM.reduce(
      (sum, step) => sum + BMV_STEP_TRANSITIONS[step].length,
      0,
    );
    assert.ok(
      totalAllowed >= 14,
      `Expected at least 14 allowed transitions, got ${String(totalAllowed)}`,
    );
    assert.ok(
      totalAllowed <= 25,
      `Expected at most 25 allowed transitions, got ${String(totalAllowed)}`,
    );
  });
});
//# sourceMappingURL=cases.workflow-step.contract.focused.test.js.map
