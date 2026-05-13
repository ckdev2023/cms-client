import { describe, expect, it } from "vitest";
import {
  BMV_WORKFLOW_STEPS,
  BMV_WORKFLOW_STEP_MAP,
  getBmvStageGroups,
  getBmvStepI18nKey,
  getBmvStepLabel,
  type BmvStageGroup,
} from "./constantsBmvSteps";
import type { WorkflowStepSummary } from "./types-detail";

function isGroupActive(
  group: BmvStageGroup,
  workflowStep: WorkflowStepSummary,
): boolean {
  return group.steps.some((s) => s.code === workflowStep.stepCode);
}

function isGroupCompleted(
  group: BmvStageGroup,
  workflowStep: WorkflowStepSummary,
): boolean {
  const currentOrder = workflowStep.sortOrder;
  return group.steps.every((s) => s.sortOrder < currentOrder);
}

function makeWorkflowStep(
  overrides: Partial<WorkflowStepSummary> = {},
): WorkflowStepSummary {
  return {
    stepCode: "UNDER_REVIEW",
    stepLabel: "审查中",
    parentStage: "S5",
    parentStageLabel: "提交前检查",
    sortOrder: 5,
    isFailureStep: false,
    ...overrides,
  };
}

const SERVER_STEP_CODES = [
  "WAITING_MATERIAL",
  "MATERIAL_PREPARING",
  "REVIEWING",
  "APPLYING",
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
  "APPROVED",
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
  "ENTRY_SUCCESS",
  "VISA_REJECTED",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
] as const;

// ═══════════════════════════════════════════════════════════════════
//  STEP ORDERING — sortOrder invariants & blueprint alignment
// ═══════════════════════════════════════════════════════════════════

describe("step ordering invariants (p1-fe-002-03)", () => {
  it("BMV_WORKFLOW_STEPS has exactly 15 entries", () => {
    expect(BMV_WORKFLOW_STEPS).toHaveLength(15);
  });

  it("sortOrder is strictly ascending (no duplicates, no gaps in sequence)", () => {
    const orders = BMV_WORKFLOW_STEPS.map((s) => s.sortOrder);
    for (let i = 1; i < orders.length; i++) {
      expect(
        orders[i],
        `sortOrder[${i}]=${orders[i]} should be > sortOrder[${i - 1}]=${orders[i - 1]}`,
      ).toBeGreaterThan(orders[i - 1]);
    }
  });

  it("sortOrder starts at 1 and ends at 15", () => {
    expect(BMV_WORKFLOW_STEPS[0].sortOrder).toBe(1);
    expect(BMV_WORKFLOW_STEPS[BMV_WORKFLOW_STEPS.length - 1].sortOrder).toBe(
      15,
    );
  });

  it("every step code is unique", () => {
    const codes = BMV_WORKFLOW_STEPS.map((s) => s.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("step codes match the server BMV_WORKFLOW_STEP_CODES frozen set", () => {
    const adminCodes = BMV_WORKFLOW_STEPS.map((s) => s.code);
    expect(adminCodes).toEqual([...SERVER_STEP_CODES]);
  });

  it("every parentStage is a valid S1–S9 id", () => {
    const validStages = new Set([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]);
    for (const step of BMV_WORKFLOW_STEPS) {
      expect(
        validStages.has(step.parentStage),
        `${step.code} has invalid parentStage ${step.parentStage}`,
      ).toBe(true);
    }
  });

  it("only VISA_REJECTED has isFailureStep=true", () => {
    const failureSteps = BMV_WORKFLOW_STEPS.filter((s) => s.isFailureStep);
    expect(failureSteps).toHaveLength(1);
    expect(failureSteps[0].code).toBe("VISA_REJECTED");
  });

  it("BMV_WORKFLOW_STEP_MAP contains all step codes", () => {
    for (const step of BMV_WORKFLOW_STEPS) {
      expect(BMV_WORKFLOW_STEP_MAP.has(step.code)).toBe(true);
      expect(BMV_WORKFLOW_STEP_MAP.get(step.code)).toBe(step);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  STAGE GROUPING — getBmvStageGroups()
// ═══════════════════════════════════════════════════════════════════

describe("stage grouping (p1-fe-002-03)", () => {
  const groups = getBmvStageGroups();

  it("groups appear in stage order S2 → S3 → S4 → S5 → S6 → S7 → S8 → S9", () => {
    const stageOrder = groups.map((g) => g.stage);
    expect(stageOrder).toEqual([
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
      "S9",
    ]);
  });

  it("S1 has no steps (not in grouping)", () => {
    expect(groups.find((g) => g.stage === "S1")).toBeUndefined();
  });

  it("all steps are accounted for across groups", () => {
    const allSteps = groups.flatMap((g) => g.steps);
    expect(allSteps).toHaveLength(BMV_WORKFLOW_STEPS.length);
  });

  it("S5 has 4 sub-steps (APPLYING, UNDER_REVIEW, NEED_SUPPLEMENT, SUPPLEMENT_PROCESSING)", () => {
    const s5 = groups.find((g) => g.stage === "S5")!;
    expect(s5.steps).toHaveLength(4);
    expect(s5.steps.map((s) => s.code)).toEqual([
      "APPLYING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
    ]);
  });

  it("S7 has 3 sub-steps (WAITING_PAYMENT, COE_SENT, VISA_APPLYING)", () => {
    const s7 = groups.find((g) => g.stage === "S7")!;
    expect(s7.steps).toHaveLength(3);
    expect(s7.steps.map((s) => s.code)).toEqual([
      "WAITING_PAYMENT",
      "COE_SENT",
      "VISA_APPLYING",
    ]);
  });

  it("S8 has 3 sub-steps (ENTRY_SUCCESS, RESIDENCE_PERIOD_RECORDED, RENEWAL_REMINDER_SCHEDULED)", () => {
    const s8 = groups.find((g) => g.stage === "S8")!;
    expect(s8.steps).toHaveLength(3);
    expect(s8.steps.map((s) => s.code)).toEqual([
      "ENTRY_SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ]);
  });

  it("single-step stages have exactly 1 step each", () => {
    for (const stage of ["S2", "S3", "S4", "S6", "S9"] as const) {
      const g = groups.find((grp) => grp.stage === stage)!;
      expect(g.steps, `${stage} should have 1 step`).toHaveLength(1);
    }
  });

  it("steps within each group preserve sortOrder ascending", () => {
    for (const group of groups) {
      for (let i = 1; i < group.steps.length; i++) {
        expect(
          group.steps[i].sortOrder,
          `${group.stage}: steps out of order at index ${i}`,
        ).toBeGreaterThan(group.steps[i - 1].sortOrder);
      }
    }
  });

  it("every group has a stageI18nKey matching cases.constants.stages.{stage}", () => {
    for (const group of groups) {
      expect(group.stageI18nKey).toBe(`cases.constants.stages.${group.stage}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════
//  GROUP ACTIVE / COMPLETED — isGroupActive, isGroupCompleted
// ═══════════════════════════════════════════════════════════════════

describe("isGroupActive (p1-fe-002-03)", () => {
  const groups = getBmvStageGroups();

  it("only the group containing the current step is active", () => {
    const ws = makeWorkflowStep({ stepCode: "UNDER_REVIEW", sortOrder: 5 });
    const activeGroups = groups.filter((g) => isGroupActive(g, ws));
    expect(activeGroups).toHaveLength(1);
    expect(activeGroups[0].stage).toBe("S5");
  });

  it("first step makes S2 the active group", () => {
    const ws = makeWorkflowStep({
      stepCode: "WAITING_MATERIAL",
      sortOrder: 1,
    });
    const activeGroups = groups.filter((g) => isGroupActive(g, ws));
    expect(activeGroups).toHaveLength(1);
    expect(activeGroups[0].stage).toBe("S2");
  });

  it("VISA_REJECTED makes S9 the active group", () => {
    const ws = makeWorkflowStep({
      stepCode: "VISA_REJECTED",
      sortOrder: 13,
      isFailureStep: true,
    });
    const activeGroups = groups.filter((g) => isGroupActive(g, ws));
    expect(activeGroups).toHaveLength(1);
    expect(activeGroups[0].stage).toBe("S9");
  });

  it("COE_SENT makes S7 active, not S6 or S8", () => {
    const ws = makeWorkflowStep({ stepCode: "COE_SENT", sortOrder: 10 });
    const activeGroups = groups.filter((g) => isGroupActive(g, ws));
    expect(activeGroups).toHaveLength(1);
    expect(activeGroups[0].stage).toBe("S7");
  });
});

describe("isGroupCompleted (p1-fe-002-03)", () => {
  const groups = getBmvStageGroups();

  it("at UNDER_REVIEW (sortOrder=5), S2/S3/S4 are completed", () => {
    const ws = makeWorkflowStep({ stepCode: "UNDER_REVIEW", sortOrder: 5 });
    const completedStages = groups
      .filter((g) => isGroupCompleted(g, ws))
      .map((g) => g.stage);
    expect(completedStages).toEqual(["S2", "S3", "S4"]);
  });

  it("at WAITING_MATERIAL (sortOrder=1), no group is completed", () => {
    const ws = makeWorkflowStep({
      stepCode: "WAITING_MATERIAL",
      sortOrder: 1,
    });
    const completedStages = groups.filter((g) => isGroupCompleted(g, ws));
    expect(completedStages).toHaveLength(0);
  });

  it("at RENEWAL_REMINDER_SCHEDULED (sortOrder=15), all except S8 are completed", () => {
    const ws = makeWorkflowStep({
      stepCode: "RENEWAL_REMINDER_SCHEDULED",
      sortOrder: 15,
    });
    const completedStages = groups
      .filter((g) => isGroupCompleted(g, ws))
      .map((g) => g.stage);
    expect(completedStages).toEqual(["S2", "S3", "S4", "S5", "S6", "S7", "S9"]);
  });

  it("active group is not completed (S5 at APPLYING)", () => {
    const ws = makeWorkflowStep({ stepCode: "APPLYING", sortOrder: 4 });
    const s5 = groups.find((g) => g.stage === "S5")!;
    expect(isGroupActive(s5, ws)).toBe(true);
    expect(isGroupCompleted(s5, ws)).toBe(false);
  });

  it("multi-step group requires ALL steps below currentOrder to be completed", () => {
    const ws = makeWorkflowStep({ stepCode: "COE_SENT", sortOrder: 10 });
    const s5 = groups.find((g) => g.stage === "S5")!;
    expect(isGroupCompleted(s5, ws)).toBe(true);
    const s7 = groups.find((g) => g.stage === "S7")!;
    expect(isGroupCompleted(s7, ws)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  COMBINED HIGHLIGHT SCENARIO — group active + completed + step status
// ═══════════════════════════════════════════════════════════════════

describe("combined highlight scenario (p1-fe-002-03)", () => {
  const groups = getBmvStageGroups();

  it("APPROVED: S2-S5 completed, S6 active, S7-S9 neither", () => {
    const ws = makeWorkflowStep({ stepCode: "APPROVED", sortOrder: 8 });
    const completed = groups
      .filter((g) => isGroupCompleted(g, ws))
      .map((g) => g.stage);
    const active = groups
      .filter((g) => isGroupActive(g, ws))
      .map((g) => g.stage);
    const neither = groups
      .filter((g) => !isGroupCompleted(g, ws) && !isGroupActive(g, ws))
      .map((g) => g.stage);

    expect(completed).toEqual(["S2", "S3", "S4", "S5"]);
    expect(active).toEqual(["S6"]);
    expect(neither).toEqual(["S7", "S8", "S9"]);
  });

  it("ENTRY_SUCCESS: S2-S7 completed, S8 active, S9 not completed (VISA_REJECTED sortOrder=13 > 12)", () => {
    const ws = makeWorkflowStep({ stepCode: "ENTRY_SUCCESS", sortOrder: 12 });
    const completed = groups
      .filter((g) => isGroupCompleted(g, ws))
      .map((g) => g.stage);
    const active = groups
      .filter((g) => isGroupActive(g, ws))
      .map((g) => g.stage);
    const neither = groups
      .filter((g) => !isGroupCompleted(g, ws) && !isGroupActive(g, ws))
      .map((g) => g.stage);

    expect(completed).toEqual(["S2", "S3", "S4", "S5", "S6", "S7"]);
    expect(active).toEqual(["S8"]);
    expect(neither).toEqual(["S9"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  INVALID STATE FALLBACK — label/i18n for unknown codes
// ═══════════════════════════════════════════════════════════════════

describe("invalid state fallback (p1-fe-002-03)", () => {
  it("getBmvStepLabel returns raw code for unknown step", () => {
    expect(getBmvStepLabel("UNKNOWN_STEP_XYZ")).toBe("UNKNOWN_STEP_XYZ");
  });

  it("getBmvStepLabel returns label for known step", () => {
    expect(getBmvStepLabel("UNDER_REVIEW")).toBe("审查中");
    expect(getBmvStepLabel("VISA_REJECTED")).toBe("签证拒否");
  });

  it("getBmvStepI18nKey returns empty string for unknown step", () => {
    expect(getBmvStepI18nKey("UNKNOWN_STEP_XYZ")).toBe("");
  });

  it("getBmvStepI18nKey returns key for known step", () => {
    expect(getBmvStepI18nKey("UNDER_REVIEW")).toBe(
      "cases.constants.bmvSteps.UNDER_REVIEW",
    );
  });

  it("BMV_WORKFLOW_STEP_MAP.get returns undefined for unknown code", () => {
    expect(BMV_WORKFLOW_STEP_MAP.get("NOT_A_REAL_STEP")).toBeUndefined();
  });

  it("empty string step code falls back gracefully", () => {
    expect(getBmvStepLabel("")).toBe("");
    expect(getBmvStepI18nKey("")).toBe("");
  });

  it("getBmvStageGroups is stable across repeated calls", () => {
    const g1 = getBmvStageGroups();
    const g2 = getBmvStageGroups();
    expect(g1).toEqual(g2);
    expect(g1).not.toBe(g2);
  });
});
