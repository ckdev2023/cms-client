// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-006a-01 — overview tab field contract
//   frozen consumed fields, summary card defs, customer back-link fields.
// Does NOT test: adapter mapping logic (→ focused/slices tests),
//   list mappers, write builders, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  OVERVIEW_TAB_MAIN_CONSUMED_FIELDS,
  OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS,
  OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS,
  OVERVIEW_SUMMARY_CARD_DEFS,
  CASE_DETAIL_HEADER_FIELDS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const FULL_CASE_ROW = {
  id: "case-ov01",
  orgId: "org-1",
  customerId: "cust-ov01",
  caseTypeCode: "visa",
  stage: "S3",
  groupId: "group-ov01",
  ownerUserId: "user-ov01",
  dueAt: "2026-07-20",
  caseName: "技人国更新ケース",
  caseNo: "CASE-OV01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "renewal",
  acceptedAt: "2026-03-01T00:00:00.000Z",
};

const FULL_DEEP_LINK = {
  customerId: "cust-ov01",
  customerName: "山田花子",
  groupId: "group-ov01",
  groupName: "Tokyo-A",
  ownerUserId: "user-ov01",
  ownerDisplayName: "鈴木太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const FULL_COUNTS = {
  documentItemsTotal: 15,
  documentItemsDone: 9,
  caseParties: 3,
  tasks: 6,
  tasksPending: 2,
  communicationLogs: 10,
  submissionPackages: 1,
  generatedDocuments: 3,
  validationRuns: 2,
  reviewRecords: 1,
  billingRecords: 4,
  paymentRecords: 2,
};

const FULL_BILLING = {
  quotePrice: 400000,
  unpaidAmount: 80000,
  totalReceived: 320000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const FULL_VALIDATION = {
  id: "vr-ov01",
  status: "passed",
  executedAt: "2026-04-18T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 2,
};

function buildFullAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: FULL_CASE_ROW,
    deepLink: FULL_DEEP_LINK,
    counts: FULL_COUNTS,
    billing: FULL_BILLING,
    latestValidation: FULL_VALIDATION,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 8, done: 5 },
      { providerRole: "office", total: 7, done: 4 },
    ],
    ...overrides,
  };
}

function buildMinimalAggregate() {
  return {
    case: { id: "case-ov-min", stage: "S1" },
    deepLink: null,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
  };
}

// ─── Overview main consumed fields ──────────────────────────────

describe("overview tab main consumed fields (p0-fe-006a-01)", () => {
  const result = adaptCaseDetailAggregate(buildFullAggregate())!;

  it("every OVERVIEW_TAB_MAIN_CONSUMED_FIELDS key is present on detail", () => {
    for (const f of OVERVIEW_TAB_MAIN_CONSUMED_FIELDS) {
      expect(f in result.detail, `missing overview field: ${f}`).toBe(true);
    }
  });

  it("every OVERVIEW_TAB_MAIN_CONSUMED_FIELDS key is defined (non-undefined)", () => {
    for (const f of OVERVIEW_TAB_MAIN_CONSUMED_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `${f} should be defined`).toBe(true);
    }
  });

  it("fields still present when all optional slices are null", () => {
    const minimal = adaptCaseDetailAggregate(buildMinimalAggregate())!;
    for (const f of OVERVIEW_TAB_MAIN_CONSUMED_FIELDS) {
      expect(f in minimal.detail, `missing overview field in empty: ${f}`).toBe(
        true,
      );
    }
  });
});

// ─── Overview sidebar consumed fields ───────────────────────────

describe("overview tab sidebar consumed fields (p0-fe-006a-01)", () => {
  const result = adaptCaseDetailAggregate(buildFullAggregate())!;

  it("every OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS key is present on detail", () => {
    for (const f of OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS) {
      expect(f in result.detail, `missing sidebar field: ${f}`).toBe(true);
    }
  });

  it("risk block is a non-null object", () => {
    expect(result.detail.risk).toBeDefined();
    expect(typeof result.detail.risk).toBe("object");
    expect(result.detail.risk).not.toBeNull();
  });

  it("risk block fields populated from full aggregate", () => {
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsYes");
    expect(result.detail.risk.arrearsDetail).toContain("80,000");
  });

  it("sidebar fields still present when all optional slices are null", () => {
    const minimal = adaptCaseDetailAggregate(buildMinimalAggregate())!;
    for (const f of OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS) {
      expect(f in minimal.detail, `missing sidebar field in empty: ${f}`).toBe(
        true,
      );
    }
  });
});

// ─── Customer back-link fields ──────────────────────────────────

describe("overview customer back-link fields (p0-fe-006a-01)", () => {
  it("OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS are all present on detail", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    for (const f of OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS) {
      expect(f in result.detail, `missing back-link field: ${f}`).toBe(true);
    }
  });

  it("customerId and client are populated from deepLink", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    expect(result.detail.customerId).toBe("cust-ov01");
    expect(result.detail.client).toBe("山田花子");
  });

  it("groupId and groupName are populated from deepLink", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    expect(result.detail.groupId).toBe("group-ov01");
    expect(result.detail.groupName).toBe("Tokyo-A");
  });

  it("customerId is empty string when deepLink is null", () => {
    const result = adaptCaseDetailAggregate(buildMinimalAggregate())!;
    expect(result.detail.customerId).toBe("");
    expect(result.detail.client).toBe("");
  });

  it("customer back-link fields are a subset of header fields", () => {
    const headerSet = new Set<string>(CASE_DETAIL_HEADER_FIELDS);
    for (const f of OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS) {
      expect(
        headerSet.has(f),
        `${f} should be in CASE_DETAIL_HEADER_FIELDS`,
      ).toBe(true);
    }
  });
});

// ─── Summary card definitions ───────────────────────────────────

describe("overview summary card definitions (p0-fe-006a-01)", () => {
  it("has exactly 4 cards", () => {
    expect(OVERVIEW_SUMMARY_CARD_DEFS).toHaveLength(4);
  });

  it("cards have unique ids", () => {
    const ids = OVERVIEW_SUMMARY_CARD_DEFS.map((c) => c.id);
    expect(new Set(ids).size).toBe(4);
  });

  it("card ids are: stage, deadline, progress, billing", () => {
    const ids = OVERVIEW_SUMMARY_CARD_DEFS.map((c) => c.id);
    expect(ids).toEqual(["stage", "deadline", "progress", "billing"]);
  });

  it("every card field exists on CaseDetail", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    for (const card of OVERVIEW_SUMMARY_CARD_DEFS) {
      for (const field of card.fields) {
        expect(
          field in result.detail,
          `card "${card.id}" references missing field: ${field}`,
        ).toBe(true);
      }
    }
  });

  it("every card field is in OVERVIEW_TAB_MAIN_CONSUMED_FIELDS", () => {
    const mainSet = new Set<string>(OVERVIEW_TAB_MAIN_CONSUMED_FIELDS);
    for (const card of OVERVIEW_SUMMARY_CARD_DEFS) {
      for (const field of card.fields) {
        expect(
          mainSet.has(field),
          `card "${card.id}" field "${field}" not in consumed fields`,
        ).toBe(true);
      }
    }
  });

  it("summary cards show real values from full aggregate", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    expect(result.detail.stage).toBe("资料待补 / 审核中");
    expect(result.detail.deadline).not.toBe("");
    expect(result.detail.progressPercent).toBe(60);
    expect(result.detail.progressCount).toBe("9/15");
    expect(result.detail.billingAmount).toBe("¥400,000");
    expect(result.detail.billingMeta).toContain("80,000");
  });

  it("summary cards degrade gracefully with empty aggregate", () => {
    const result = adaptCaseDetailAggregate(buildMinimalAggregate())!;
    expect(result.detail.stage).toBe("刚开始办案");
    expect(result.detail.deadline).toBe("");
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billingMeta).toBe("");
  });
});

// ─── Frozen key-set snapshot ────────────────────────────────────

describe("overview field contract frozen snapshot (p0-fe-006a-01)", () => {
  it("OVERVIEW_TAB_MAIN_CONSUMED_FIELDS matches expected set", () => {
    expect([...OVERVIEW_TAB_MAIN_CONSUMED_FIELDS]).toEqual([
      "stage",
      "stageMeta",
      "deadline",
      "deadlineDanger",
      "deadlineMeta",
      "progressPercent",
      "progressCount",
      "billingAmount",
      "billingMeta",
      "providerProgress",
      "nextAction",
      "overviewActions",
      "timeline",
    ]);
  });

  it("OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS matches expected set", () => {
    expect([...OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS]).toEqual([
      "risk",
      "deadlineDanger",
      "team",
      "validationHint",
    ]);
  });

  it("OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS matches expected set", () => {
    expect([...OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS]).toEqual([
      "customerId",
      "client",
      "groupId",
      "groupName",
    ]);
  });

  it("OVERVIEW_SUMMARY_CARD_DEFS matches expected shape", () => {
    expect(OVERVIEW_SUMMARY_CARD_DEFS).toEqual([
      { id: "stage", fields: ["stage", "stageMeta"], source: "caseRecord" },
      {
        id: "deadline",
        fields: ["deadline", "deadlineDanger", "deadlineMeta"],
        source: "caseRecord",
      },
      {
        id: "progress",
        fields: ["progressPercent", "progressCount"],
        source: "counts",
      },
      {
        id: "billing",
        fields: ["billingAmount", "billingMeta"],
        source: "billing",
      },
    ]);
  });
});
