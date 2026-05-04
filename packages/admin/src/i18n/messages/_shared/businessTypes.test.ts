import { describe, expect, it } from "vitest";
import {
  BUSINESS_TYPE_VALUES,
  BUSINESS_TYPE_OPTIONS_I18N,
  LEGACY_BUSINESS_TYPE_ALIAS,
  mapBusinessTypeToCaseTypeCode,
  normalizeBusinessType,
  type BusinessType,
} from "./businessTypes";

describe("_shared/businessTypes", () => {
  describe("BUSINESS_TYPE_VALUES", () => {
    it("contains exactly 7 entries", () => {
      expect(BUSINESS_TYPE_VALUES).toHaveLength(7);
    });

    it("includes business-management-visa and company-setup", () => {
      expect(BUSINESS_TYPE_VALUES).toContain("business-management-visa");
      expect(BUSINESS_TYPE_VALUES).toContain("company-setup");
    });

    it("does NOT include the deprecated business-manager value", () => {
      expect(BUSINESS_TYPE_VALUES).not.toContain("business-manager");
    });

    it("all values are kebab-case strings", () => {
      for (const v of BUSINESS_TYPE_VALUES) {
        expect(v).toMatch(/^[a-z]+(-[a-z]+)*$/);
      }
    });
  });

  describe("BUSINESS_TYPE_OPTIONS_I18N", () => {
    it("has one option per value in BUSINESS_TYPE_VALUES", () => {
      expect(BUSINESS_TYPE_OPTIONS_I18N).toHaveLength(
        BUSINESS_TYPE_VALUES.length,
      );
      const values = BUSINESS_TYPE_OPTIONS_I18N.map((o) => o.value);
      expect(values).toEqual([...BUSINESS_TYPE_VALUES]);
    });

    it("every labelKey follows the leads.options.businessType.* pattern", () => {
      for (const opt of BUSINESS_TYPE_OPTIONS_I18N) {
        expect(opt.labelKey).toMatch(/^leads\.options\.businessType\.\w+$/);
      }
    });
  });

  describe("LEGACY_BUSINESS_TYPE_ALIAS", () => {
    it('maps "business-manager" to "business-management-visa"', () => {
      expect(LEGACY_BUSINESS_TYPE_ALIAS["business-manager"]).toBe(
        "business-management-visa",
      );
    });
  });

  describe("mapBusinessTypeToCaseTypeCode", () => {
    it("returns a non-empty string for every BusinessType value", () => {
      for (const v of BUSINESS_TYPE_VALUES) {
        const code = mapBusinessTypeToCaseTypeCode(v);
        expect(code).toBeTruthy();
        expect(typeof code).toBe("string");
      }
    });

    it.each([
      ["business-management-visa", "business_manager_visa"],
      ["company-setup", "company_setup"],
      ["highly-skilled", "highly_skilled"],
      ["work-visa", "work"],
      ["family-stay", "dependent_visa"],
      ["permanent", "permanent"],
      ["other", "other"],
    ] as const)("maps %s → %s", (input, expected) => {
      expect(mapBusinessTypeToCaseTypeCode(input as BusinessType)).toBe(
        expected,
      );
    });
  });

  describe("normalizeBusinessType", () => {
    it("returns the value as-is for current enum members", () => {
      for (const v of BUSINESS_TYPE_VALUES) {
        expect(normalizeBusinessType(v)).toBe(v);
      }
    });

    it('normalizes deprecated "business-manager" to "business-management-visa"', () => {
      expect(normalizeBusinessType("business-manager")).toBe(
        "business-management-visa",
      );
    });

    it("returns undefined for unrecognized values", () => {
      expect(normalizeBusinessType("unknown-type")).toBeUndefined();
      expect(normalizeBusinessType("")).toBeUndefined();
    });
  });
});
