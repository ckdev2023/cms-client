// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-006a-02 — info tab field contract
//   frozen consumed fields, readonly rules, empty-state graceful degradation.
// Does NOT test: adapter mapping logic (→ focused/slices tests),
//   overview tab, list mappers, write builders, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  INFO_TAB_CASE_ATTRIBUTES_FIELDS,
  INFO_TAB_RELATED_PARTIES_FIELDS,
  INFO_TAB_READONLY_RULES,
  CASE_DETAIL_HEADER_FIELDS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const FULL_CASE_ROW = {
  id: "case-info01",
  orgId: "org-1",
  customerId: "cust-info01",
  caseTypeCode: "business_manager",
  stage: "S3",
  groupId: "group-info01",
  ownerUserId: "user-info01",
  dueAt: "2026-09-01",
  caseName: "経営管理ビザ変更",
  caseNo: "CASE-INFO01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "変更",
  acceptedAt: "2026-04-01T00:00:00.000Z",
};

const FULL_DEEP_LINK = {
  customerId: "cust-info01",
  customerName: "田中太郎",
  groupId: "group-info01",
  groupName: "Tokyo-B",
  ownerUserId: "user-info01",
  ownerDisplayName: "佐藤花子",
  assistantUserId: null,
  assistantDisplayName: null,
};

const FULL_BILLING = {
  quotePrice: 300000,
  unpaidAmount: 0,
  totalReceived: 300000,
  depositPaid: true,
  finalPaymentPaid: true,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

function buildFullAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: FULL_CASE_ROW,
    deepLink: FULL_DEEP_LINK,
    counts: null,
    billing: FULL_BILLING,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    ...overrides,
  };
}

function buildMinimalAggregate() {
  return {
    case: { id: "case-info-min", stage: "S1" },
    deepLink: null,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

function buildS9Aggregate() {
  return {
    case: { ...FULL_CASE_ROW, stage: "S9" },
    deepLink: FULL_DEEP_LINK,
    counts: null,
    billing: FULL_BILLING,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

// ─── Info tab case attributes fields ─────────────────────────────

describe("info tab case attributes fields (p0-fe-006a-02)", () => {
  const result = adaptCaseDetailAggregate(buildFullAggregate())!;

  it("every INFO_TAB_CASE_ATTRIBUTES_FIELDS key is present on detail", () => {
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      expect(f in result.detail, `missing info field: ${f}`).toBe(true);
    }
  });

  it("every INFO_TAB_CASE_ATTRIBUTES_FIELDS key is defined (non-undefined)", () => {
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `${f} should be defined`).toBe(true);
    }
  });

  it("fields still present when all optional slices are null", () => {
    const minimal = adaptCaseDetailAggregate(buildMinimalAggregate())!;
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      expect(f in minimal.detail, `missing info field in empty: ${f}`).toBe(
        true,
      );
    }
  });

  it("info attributes fields are a subset of header fields", () => {
    const headerSet = new Set<string>(CASE_DETAIL_HEADER_FIELDS);
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      expect(
        headerSet.has(f),
        `${f} should be in CASE_DETAIL_HEADER_FIELDS`,
      ).toBe(true);
    }
  });
});

// ─── Info tab field values from full aggregate ──────────────────

describe("info tab field values (p0-fe-006a-02)", () => {
  const result = adaptCaseDetailAggregate(buildFullAggregate())!;

  it("id maps from caseRecord.id", () => {
    expect(result.detail.id).toBe("case-info01");
  });

  it("caseType maps from caseRecord.caseTypeCode", () => {
    expect(result.detail.caseType).toBe("business_manager");
  });

  it("applicationType maps from caseRecord.applicationType", () => {
    expect(result.detail.applicationType).toBe("変更");
  });

  it("acceptedDate maps from caseRecord.acceptedAt (formatted)", () => {
    expect(result.detail.acceptedDate).not.toBe("");
    expect(result.detail.acceptedDate).toContain("2026");
  });

  it("targetDate maps from caseRecord.dueAt (formatted)", () => {
    expect(result.detail.targetDate).not.toBe("");
    expect(result.detail.targetDate).toContain("2026");
  });

  it("agency defaults to empty string (no server field)", () => {
    expect(result.detail.agency).toBe("");
  });
});

// ─── Info tab empty state degradation ───────────────────────────

describe("info tab empty state degradation (p0-fe-006a-02)", () => {
  const result = adaptCaseDetailAggregate(buildMinimalAggregate())!;

  it("id is populated from minimal case", () => {
    expect(result.detail.id).toBe("case-info-min");
  });

  it("caseType defaults to empty string when caseTypeCode is missing", () => {
    expect(result.detail.caseType).toBe("");
  });

  it("applicationType defaults to empty string", () => {
    expect(result.detail.applicationType).toBe("");
  });

  it("acceptedDate defaults to empty string", () => {
    expect(result.detail.acceptedDate).toBe("");
  });

  it("targetDate defaults to empty string when dueAt is null", () => {
    expect(result.detail.targetDate).toBe("");
  });

  it("agency defaults to empty string", () => {
    expect(result.detail.agency).toBe("");
  });

  it("relatedParties is an empty array", () => {
    expect(result.detail.relatedParties).toEqual([]);
  });
});

// ─── Info tab related parties field ─────────────────────────────

describe("info tab related parties field (p0-fe-006a-02)", () => {
  it("INFO_TAB_RELATED_PARTIES_FIELDS key present on detail", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    for (const f of INFO_TAB_RELATED_PARTIES_FIELDS) {
      expect(f in result.detail, `missing: ${f}`).toBe(true);
    }
  });

  it("relatedParties is an array (empty placeholder for now)", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    expect(Array.isArray(result.detail.relatedParties)).toBe(true);
  });
});

// ─── Info tab readonly rules ────────────────────────────────────

describe("info tab readonly rules (p0-fe-006a-02)", () => {
  it("alwaysReadonly covers all case attributes fields", () => {
    const alwaysSet = new Set<string>(INFO_TAB_READONLY_RULES.alwaysReadonly);
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      expect(alwaysSet.has(f), `${f} should be in alwaysReadonly`).toBe(true);
    }
  });

  it("S9 aggregate sets readonly=true on detail", () => {
    const result = adaptCaseDetailAggregate(buildS9Aggregate())!;
    expect(result.detail.readonly).toBe(true);
  });

  it("non-S9 aggregate sets readonly=false on detail", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    expect(result.detail.readonly).toBe(false);
  });
});

// ─── Frozen key-set snapshot ────────────────────────────────────

describe("info tab field contract frozen snapshot (p0-fe-006a-02)", () => {
  it("INFO_TAB_CASE_ATTRIBUTES_FIELDS matches expected set", () => {
    expect([...INFO_TAB_CASE_ATTRIBUTES_FIELDS]).toEqual([
      "id",
      "caseType",
      "applicationType",
      "acceptedDate",
      "targetDate",
      "agency",
    ]);
  });

  it("INFO_TAB_RELATED_PARTIES_FIELDS matches expected set", () => {
    expect([...INFO_TAB_RELATED_PARTIES_FIELDS]).toEqual(["relatedParties"]);
  });

  it("INFO_TAB_READONLY_RULES.alwaysReadonly matches expected set", () => {
    expect([...INFO_TAB_READONLY_RULES.alwaysReadonly]).toEqual([
      "id",
      "caseType",
      "applicationType",
      "acceptedDate",
      "targetDate",
      "agency",
    ]);
  });
});
