import { describe, expect, it, vi } from "vitest";
import {
  BMV_WORKFLOW_STEPS,
  resolveBmvWorkflowStepDisplayLabel,
} from "./constantsBmvSteps";

describe("i18n key pattern (p1-fe-002-03)", () => {
  it("every step has non-empty label", () => {
    for (const step of BMV_WORKFLOW_STEPS) {
      expect(step.label.length, `${step.code} label is empty`).toBeGreaterThan(
        0,
      );
    }
  });

  it("every step i18nKey follows cases.constants.bmvSteps.{CODE} pattern", () => {
    for (const step of BMV_WORKFLOW_STEPS) {
      expect(step.i18nKey).toBe(`cases.constants.bmvSteps.${step.code}`);
    }
  });
});

describe("resolveBmvWorkflowStepDisplayLabel", () => {
  it("uses translate when stepCode maps to a message", () => {
    const t = vi.fn(() => "Awaiting final payment");
    const label = resolveBmvWorkflowStepDisplayLabel(t, {
      stepCode: "WAITING_PAYMENT",
      stepLabel: "等待尾款",
    });
    expect(label).toBe("Awaiting final payment");
    expect(t).toHaveBeenCalledWith("cases.constants.bmvSteps.WAITING_PAYMENT");
  });

  it("falls back to stepLabel when translate returns empty", () => {
    const t = vi.fn(() => "");
    const label = resolveBmvWorkflowStepDisplayLabel(t, {
      stepCode: "WAITING_PAYMENT",
      stepLabel: "等待尾款",
    });
    expect(label).toBe("等待尾款");
  });

  it("returns stepLabel when stepCode is absent", () => {
    const t = vi.fn();
    const label = resolveBmvWorkflowStepDisplayLabel(t, {
      stepCode: "",
      stepLabel: "Legacy",
    });
    expect(label).toBe("Legacy");
    expect(t).not.toHaveBeenCalled();
  });
});
