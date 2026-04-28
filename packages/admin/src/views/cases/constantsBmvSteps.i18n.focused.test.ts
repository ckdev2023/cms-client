import { describe, expect, it } from "vitest";
import { BMV_WORKFLOW_STEPS } from "./constantsBmvSteps";

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
