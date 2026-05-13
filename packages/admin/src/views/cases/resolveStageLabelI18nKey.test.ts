import { describe, expect, it } from "vitest";
import {
  BMV_S7_POST_APPROVAL_WORKFLOW_STEPS,
  resolveStageLabelI18nKey,
} from "./constants";

describe("resolveStageLabelI18nKey", () => {
  it("S7 + 认定后子步骤 → S7_post_approval 键", () => {
    for (const code of BMV_S7_POST_APPROVAL_WORKFLOW_STEPS) {
      expect(resolveStageLabelI18nKey("S7", code)).toBe(
        "cases.constants.stages.S7_post_approval",
      );
    }
  });

  it("S7 无子步骤或非认定后步骤 → 仍用 S7 默认键", () => {
    expect(resolveStageLabelI18nKey("S7", null)).toBe(
      "cases.constants.stages.S7",
    );
    expect(resolveStageLabelI18nKey("S7", undefined)).toBe(
      "cases.constants.stages.S7",
    );
    expect(resolveStageLabelI18nKey("S7", "VISA_REJECTED")).toBe(
      "cases.constants.stages.S7",
    );
  });

  it("非 S7 不因子步骤改写", () => {
    expect(resolveStageLabelI18nKey("S6", "WAITING_PAYMENT")).toBe(
      "cases.constants.stages.S6",
    );
  });
});
