import { describe, expect, it } from "vitest";
import { residenceLabelToCode } from "./residenceLabelToTypeCode";

describe("residenceLabelToCode", () => {
  it("maps 経営・管理 to business_manager", () => {
    expect(residenceLabelToCode("経営・管理")).toBe("business_manager");
  });

  it("maps 経営管理 (without dot) to business_manager", () => {
    expect(residenceLabelToCode("経営管理")).toBe("business_manager");
  });

  it("maps 技術・人文知識・国際業務 to engineer_humanities_intl_visa", () => {
    expect(residenceLabelToCode("技術・人文知識・国際業務")).toBe(
      "engineer_humanities_intl_visa",
    );
  });

  it("maps 家族滞在 to dependent_visa", () => {
    expect(residenceLabelToCode("家族滞在")).toBe("dependent_visa");
  });

  it("returns null for unknown label", () => {
    expect(residenceLabelToCode("未知の在留")).toBeNull();
  });

  it("trims whitespace before lookup", () => {
    expect(residenceLabelToCode("  経営・管理  ")).toBe("business_manager");
  });
});
