import { describe, it, expect } from "vitest";
import {
  BUSINESS_TYPE_LABELS,
  BUSINESS_TYPE_VALUES,
  getBusinessTypeSelectOptions,
  mapBusinessTypeToCaseTypeCode,
  normalizeBusinessType,
  resolveBusinessTypeLabel,
  type BusinessType,
  type BusinessTypeLocale,
} from "./businessTypes";

const LOCALES: BusinessTypeLocale[] = ["zh-CN", "en-US", "ja-JP"];

describe("BUSINESS_TYPE_LABELS catalog completeness", () => {
  it("has an entry for every canonical BusinessType", () => {
    for (const bt of BUSINESS_TYPE_VALUES) {
      expect(BUSINESS_TYPE_LABELS).toHaveProperty(bt);
    }
  });

  it("every entry has all 3 locales with at least a primary label", () => {
    for (const bt of BUSINESS_TYPE_VALUES) {
      for (const locale of LOCALES) {
        const entry = BUSINESS_TYPE_LABELS[bt][locale];
        expect(entry, `${bt} / ${locale}`).toBeDefined();
        expect(entry.primary, `${bt} / ${locale} primary`).toBeTruthy();
      }
    }
  });
});

describe("resolveBusinessTypeLabel", () => {
  it("returns primary label by default", () => {
    expect(resolveBusinessTypeLabel("work-visa", "zh-CN")).toBe("技人国");
    expect(resolveBusinessTypeLabel("work-visa", "ja-JP")).toBe(
      "技術・人文知識・国際業務",
    );
    expect(resolveBusinessTypeLabel("work-visa", "en-US")).toBe(
      "Engineer/Specialist in Humanities",
    );
  });

  it("returns short variant when available", () => {
    expect(resolveBusinessTypeLabel("work-visa", "ja-JP", "short")).toBe(
      "技人国",
    );
    expect(resolveBusinessTypeLabel("work-visa", "en-US", "short")).toBe(
      "Work Visa",
    );
  });

  it("falls back to primary when short is not defined", () => {
    expect(resolveBusinessTypeLabel("family-stay", "zh-CN", "short")).toBe(
      "家族滞在",
    );
  });

  it("returns full variant when available", () => {
    expect(
      resolveBusinessTypeLabel("business-management-visa", "zh-CN", "full"),
    ).toBe("经营管理签");
    expect(
      resolveBusinessTypeLabel("business-management-visa", "ja-JP", "full"),
    ).toBe("経営管理ビザ");
  });

  it("falls back to primary when full is not defined", () => {
    expect(resolveBusinessTypeLabel("other", "zh-CN", "full")).toBe("其他");
  });

  it("resolves legacy aliases via normalizeBusinessType", () => {
    expect(resolveBusinessTypeLabel("business-manager", "zh-CN")).toBe(
      "经营管理",
    );
    expect(resolveBusinessTypeLabel("family_stay", "ja-JP")).toBe("家族滞在");
    expect(resolveBusinessTypeLabel("work_visa", "en-US")).toBe(
      "Engineer/Specialist in Humanities",
    );
  });

  it("returns raw code when not in catalog or alias map", () => {
    expect(resolveBusinessTypeLabel("unknown_type", "zh-CN")).toBe(
      "unknown_type",
    );
  });

  it("returns dash for empty / null / undefined", () => {
    expect(resolveBusinessTypeLabel("", "zh-CN")).toBe("—");
    expect(resolveBusinessTypeLabel(null, "zh-CN")).toBe("—");
    expect(resolveBusinessTypeLabel(undefined, "en-US")).toBe("—");
  });

  it("defaults to ja-JP when locale is missing or unrecognised", () => {
    expect(resolveBusinessTypeLabel("permanent")).toBe("永住");
    expect(resolveBusinessTypeLabel("permanent", "fr-FR")).toBe("永住");
  });

  it("trims whitespace from code before lookup", () => {
    expect(resolveBusinessTypeLabel("  work-visa  ", "zh-CN")).toBe("技人国");
  });
});

describe("getBusinessTypeSelectOptions", () => {
  it("returns one option per canonical BusinessType", () => {
    const opts = getBusinessTypeSelectOptions("zh-CN");
    expect(opts).toHaveLength(BUSINESS_TYPE_VALUES.length);
    const values = opts.map((o) => o.value);
    expect(values).toEqual([...BUSINESS_TYPE_VALUES]);
  });

  it("labels are resolved from the catalog (not i18n keys)", () => {
    const opts = getBusinessTypeSelectOptions("zh-CN");
    const workVisa = opts.find((o) => o.value === "work-visa");
    expect(workVisa?.label).toBe("技人国");
  });

  it("respects locale", () => {
    const ja = getBusinessTypeSelectOptions("ja-JP");
    const en = getBusinessTypeSelectOptions("en-US");
    const workJa = ja.find((o) => o.value === "work-visa");
    const workEn = en.find((o) => o.value === "work-visa");
    expect(workJa?.label).toBe("技術・人文知識・国際業務");
    expect(workEn?.label).toBe("Engineer/Specialist in Humanities");
  });

  it("respects variant", () => {
    const opts = getBusinessTypeSelectOptions("en-US", "short");
    const workVisa = opts.find((o) => o.value === "work-visa");
    expect(workVisa?.label).toBe("Work Visa");
  });
});

describe("re-exported utilities from _shared/businessTypes", () => {
  it("mapBusinessTypeToCaseTypeCode maps all canonical types", () => {
    const expected: Record<BusinessType, string> = {
      "highly-skilled": "highly_skilled",
      "work-visa": "work",
      "family-stay": "dependent_visa",
      "business-management-visa": "business_manager_visa",
      "company-setup": "company_setup",
      permanent: "permanent",
      other: "other",
    };
    for (const bt of BUSINESS_TYPE_VALUES) {
      expect(mapBusinessTypeToCaseTypeCode(bt)).toBe(expected[bt]);
    }
  });

  it("normalizeBusinessType converts legacy keys to canonical", () => {
    expect(normalizeBusinessType("business-manager")).toBe(
      "business-management-visa",
    );
    expect(normalizeBusinessType("highly_skilled")).toBe("highly-skilled");
  });

  it("normalizeBusinessType returns undefined for unknown input", () => {
    expect(normalizeBusinessType("nonexistent")).toBeUndefined();
  });
});
