import { describe, expect, it } from "vitest";
import {
  BMV_WORKFLOW_STEPS,
  BMV_WORKFLOW_STEP_MAP,
  computeBmvWorkflowStepDisplayStatus,
} from "./constantsBmvSteps";
import type { WorkflowStepSummary } from "./types-detail";

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

describe("stepStatus algorithm (p1-fe-002-03)", () => {
  it("current step returns 'current'", () => {
    const ws = makeWorkflowStep({ stepCode: "UNDER_REVIEW", sortOrder: 5 });
    const step = BMV_WORKFLOW_STEP_MAP.get("UNDER_REVIEW")!;
    expect(computeBmvWorkflowStepDisplayStatus(step, ws)).toBe("current");
  });

  it("step before current returns 'completed'", () => {
    const ws = makeWorkflowStep({ stepCode: "UNDER_REVIEW", sortOrder: 5 });
    const step = BMV_WORKFLOW_STEP_MAP.get("WAITING_MATERIAL")!;
    expect(computeBmvWorkflowStepDisplayStatus(step, ws)).toBe("completed");
  });

  it("step after current returns 'upcoming'", () => {
    const ws = makeWorkflowStep({ stepCode: "UNDER_REVIEW", sortOrder: 5 });
    const step = BMV_WORKFLOW_STEP_MAP.get("APPROVED")!;
    expect(computeBmvWorkflowStepDisplayStatus(step, ws)).toBe("upcoming");
  });

  it("VISA_REJECTED as current returns 'failed' (isFailureStep=true)", () => {
    const ws = makeWorkflowStep({
      stepCode: "VISA_REJECTED",
      sortOrder: 13,
      isFailureStep: true,
    });
    const step = BMV_WORKFLOW_STEP_MAP.get("VISA_REJECTED")!;
    expect(computeBmvWorkflowStepDisplayStatus(step, ws)).toBe("failed");
  });

  it("non-failure current step does not return 'failed'", () => {
    const ws = makeWorkflowStep({ stepCode: "APPROVED", sortOrder: 8 });
    const step = BMV_WORKFLOW_STEP_MAP.get("APPROVED")!;
    expect(computeBmvWorkflowStepDisplayStatus(step, ws)).toBe("current");
  });

  it("when at first step, no steps are completed", () => {
    const ws = makeWorkflowStep({
      stepCode: "WAITING_MATERIAL",
      sortOrder: 1,
    });
    const statuses = BMV_WORKFLOW_STEPS.map((s) =>
      computeBmvWorkflowStepDisplayStatus(s, ws),
    );
    expect(statuses.filter((s) => s === "completed")).toHaveLength(0);
    expect(statuses[0]).toBe("current");
    expect(statuses.slice(1).every((s) => s === "upcoming")).toBe(true);
  });

  it("when at last non-failure step, all prior steps are completed", () => {
    const ws = makeWorkflowStep({
      stepCode: "RENEWAL_REMINDER_SCHEDULED",
      sortOrder: 15,
    });
    const statuses = BMV_WORKFLOW_STEPS.map((s) =>
      computeBmvWorkflowStepDisplayStatus(s, ws),
    );
    const completed = statuses.filter((s) => s === "completed");
    expect(completed).toHaveLength(14);
    expect(statuses[statuses.length - 1]).toBe("current");
  });

  it("at VISA_REJECTED, pre-consulate steps completed; VISA_APPLYING aborted; entry branch skipped", () => {
    const ws = makeWorkflowStep({
      stepCode: "VISA_REJECTED",
      sortOrder: 13,
      isFailureStep: true,
    });
    const statuses = BMV_WORKFLOW_STEPS.map((s) => ({
      code: s.code,
      status: computeBmvWorkflowStepDisplayStatus(s, ws),
    }));

    const completed = statuses.filter((s) => s.status === "completed");
    expect(completed.length).toBe(10);
    expect(completed.map((s) => s.code).at(-1)).toBe("COE_SENT");

    expect(statuses.find((s) => s.code === "VISA_APPLYING")!.status).toBe(
      "aborted",
    );
    const skipped = statuses.filter((s) => s.status === "skipped");
    expect(skipped.map((s) => s.code)).toEqual([
      "ENTRY_SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ]);

    const current = statuses.find((s) => s.code === "VISA_REJECTED")!;
    expect(current.status).toBe("failed");

    const afterRejected = statuses.filter((s) => s.status === "upcoming");
    expect(afterRejected.length).toBe(0);
  });

  it("inactive at terminal failure: current row shows skipped (not in progress)", () => {
    const ws = makeWorkflowStep({
      stepCode: "COE_SENT",
      sortOrder: 10,
      workflowStepInactiveAtTerminalFailure: true,
    });
    const step = BMV_WORKFLOW_STEP_MAP.get("COE_SENT")!;
    expect(computeBmvWorkflowStepDisplayStatus(step, ws)).toBe("skipped");
  });

  it("inactive at terminal failure: downstream steps skipped (not upcoming)", () => {
    const ws = makeWorkflowStep({
      stepCode: "COE_SENT",
      sortOrder: 10,
      workflowStepInactiveAtTerminalFailure: true,
    });
    const statuses = BMV_WORKFLOW_STEPS.filter((s) => s.sortOrder > 10).map(
      (s) => computeBmvWorkflowStepDisplayStatus(s, ws),
    );
    expect(statuses.every((st) => st === "skipped")).toBe(true);
    expect(statuses.some((st) => st === "upcoming")).toBe(false);
  });

  it("mid-flow step (APPLYING sortOrder=4) produces correct status split", () => {
    const ws = makeWorkflowStep({ stepCode: "APPLYING", sortOrder: 4 });
    const statuses = BMV_WORKFLOW_STEPS.map((s) =>
      computeBmvWorkflowStepDisplayStatus(s, ws),
    );
    const completed = statuses.filter((s) => s === "completed").length;
    const current = statuses.filter((s) => s === "current").length;
    const upcoming = statuses.filter((s) => s === "upcoming").length;
    expect(completed).toBe(3);
    expect(current).toBe(1);
    expect(upcoming).toBe(11);
  });
});
