import { describe, it, expect } from "vitest";
import {
  VISA_TYPE_CODES,
  getVisaTypeOptions,
  resolveVisaTypeLabel,
} from "./useVisaTypeOptions";

describe("VISA_TYPE_CODES", () => {
  it("includes both BMV-side and customer-side legacy codes", () => {
    expect(VISA_TYPE_CODES).toContain("business_manager");
    expect(VISA_TYPE_CODES).toContain("engineer_specialist");
    expect(VISA_TYPE_CODES).toContain("dependent");
    expect(VISA_TYPE_CODES).toContain("permanent_resident");
    expect(VISA_TYPE_CODES).toContain("other");
  });

  it("adds highly_skilled_professional to converge with leads enum", () => {
    expect(VISA_TYPE_CODES).toContain("highly_skilled_professional");
  });

  it("contains 11 unique codes", () => {
    expect(VISA_TYPE_CODES).toHaveLength(11);
    expect(new Set(VISA_TYPE_CODES).size).toBe(11);
  });
});

describe("getVisaTypeOptions", () => {
  it("returns one option per canonical code in catalog order", () => {
    const opts = getVisaTypeOptions();
    expect(opts.map((o) => o.value)).toEqual([...VISA_TYPE_CODES]);
  });

  it("returns zh-CN labels when locale is zh-CN", () => {
    const opts = getVisaTypeOptions("zh-CN");
    const labels = Object.fromEntries(opts.map((o) => [o.value, o.label]));
    expect(labels.business_manager).toBe("经营管理");
    expect(labels.engineer_specialist).toBe("技术·人文知识·国际业务");
    expect(labels.highly_skilled_professional).toBe("高度专门职");
    expect(labels.dependent).toBe("家族滞在");
    expect(labels.other).toBe("其他");
  });

  it("returns en-US labels when locale is en-US", () => {
    const opts = getVisaTypeOptions("en-US");
    const labels = Object.fromEntries(opts.map((o) => [o.value, o.label]));
    expect(labels.business_manager).toBe("Business manager");
    expect(labels.highly_skilled_professional).toBe(
      "Highly skilled professional",
    );
    expect(labels.permanent_resident).toBe("Permanent resident");
  });

  it("returns ja-JP labels when locale is ja-JP", () => {
    const opts = getVisaTypeOptions("ja-JP");
    const labels = Object.fromEntries(opts.map((o) => [o.value, o.label]));
    expect(labels.business_manager).toBe("経営・管理");
    expect(labels.engineer_specialist).toBe("技術・人文知識・国際業務");
    expect(labels.highly_skilled_professional).toBe("高度専門職");
  });

  it("falls back to ja-JP when locale is unknown or empty", () => {
    expect(
      getVisaTypeOptions().find((o) => o.value === "business_manager")?.label,
    ).toBe("経営・管理");
    expect(
      getVisaTypeOptions("fr-FR").find((o) => o.value === "business_manager")
        ?.label,
    ).toBe("経営・管理");
  });
});

describe("resolveVisaTypeLabel", () => {
  it("resolves canonical codes to localized labels", () => {
    expect(resolveVisaTypeLabel("business_manager", "zh-CN")).toBe("经营管理");
    expect(resolveVisaTypeLabel("dependent", "en-US")).toBe("Dependent");
    expect(resolveVisaTypeLabel("highly_skilled_professional", "ja-JP")).toBe(
      "高度専門職",
    );
  });

  it("returns the raw value when code is not in the catalog", () => {
    expect(resolveVisaTypeLabel("unknown_code", "zh-CN")).toBe("unknown_code");
  });

  it("returns dash when code is empty", () => {
    expect(resolveVisaTypeLabel("", "zh-CN")).toBe("—");
  });
});
