import { describe, expect, it } from "vitest";
import {
  GROUP_OPTIONS,
  OWNER_OPTIONS,
  SAMPLE_CUSTOMER_DETAILS,
  SAMPLE_CUSTOMERS,
  SAMPLE_SUMMARY,
} from "./fixtures";

describe("customers/fixtures", () => {
  it("provides 4 sample customers matching prototype data", () => {
    expect(SAMPLE_CUSTOMERS).toHaveLength(4);
  });

  it("each customer has required fields", () => {
    for (const c of SAMPLE_CUSTOMERS) {
      expect(c.id).toBeTruthy();
      expect(c.legalName).toBeTruthy();
      expect(c.customerNumber).toBeTruthy();
      expect(c.owner).toBeDefined();
      expect(c.owner.initials).toBeTruthy();
      expect(c.owner.name).toBeTruthy();
    }
  });

  it("Li Wei has 0 active cases (matches prototype empty state)", () => {
    const liWei = SAMPLE_CUSTOMERS.find((c) => c.displayName === "Li Wei");
    expect(liWei).toBeDefined();
    expect(liWei!.activeCases).toBe(0);
  });

  it("provides 4 summary cards with distinct variants", () => {
    expect(SAMPLE_SUMMARY).toHaveLength(4);
    const variants = SAMPLE_SUMMARY.map((c) => c.variant);
    expect(new Set(variants).size).toBe(4);
  });

  it("each summary card has a positive value", () => {
    for (const card of SAMPLE_SUMMARY) {
      expect(card.key).toBeTruthy();
      expect(card.value).toBeGreaterThan(0);
    }
  });

  it("GROUP_OPTIONS has at least 3 options", () => {
    expect(GROUP_OPTIONS.length).toBeGreaterThanOrEqual(3);
    for (const opt of GROUP_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });

  it("OWNER_OPTIONS has at least 3 options", () => {
    expect(OWNER_OPTIONS.length).toBeGreaterThanOrEqual(3);
    for (const opt of OWNER_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.label).toBeTruthy();
    }
  });

  describe("SAMPLE_CUSTOMER_DETAILS", () => {
    it("has entries for all 4 sample customers", () => {
      expect(Object.keys(SAMPLE_CUSTOMER_DETAILS)).toHaveLength(4);
    });

    it("each detail has CustomerDetail-specific fields", () => {
      for (const d of Object.values(SAMPLE_CUSTOMER_DETAILS)) {
        expect(typeof d.nationality).toBe("string");
        expect(typeof d.gender).toBe("string");
        expect(typeof d.birthDate).toBe("string");
        expect(typeof d.archivedCases).toBe("number");
        expect(Array.isArray(d.caseNames)).toBe(true);
        expect(d.totalCases).toBe(d.activeCases + d.archivedCases);
      }
    });

    it("cust-004 has 0 cases and empty caseNames (no-case customer)", () => {
      const c = SAMPLE_CUSTOMER_DETAILS["cust-004"];
      expect(c).toBeDefined();
      expect(c.totalCases).toBe(0);
      expect(c.caseNames).toHaveLength(0);
      expect(c.lastCaseCreatedDate).toBeNull();
    });
  });
});
