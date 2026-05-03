// ── Test Ownership ──────────────────────────────────────────────
// Owner: detail aggregate DTO → detail view model mapping
//   (adaptCaseDetailAggregate).
// Covers: p0-fe-002c-01 (aggregate slices contract freeze),
//   p0-fe-002c-02 (header / overview / info / tabCounts),
//   p0-fe-002c-03 (deep-link / customer back-link).
// Slice degradation, S9 readonly, risk/validation/billing blocks
//   → CaseAdapterDetailAggregate.slices.test.ts
// Does NOT test: list mappers, mutation results, write builders,
//   or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  AGGREGATE_SLICE_KEYS,
  BILLING_SLICE_CONSUMED_FIELDS,
  CASE_DETAIL_DEEP_LINK_FIELDS,
  CASE_DETAIL_HEADER_FIELDS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS,
  CASE_DETAIL_NAV_PROTOCOL,
  CASE_DETAIL_TAB_COUNTS_KEYS,
  LATEST_VALIDATION_SLICE_CONSUMED_FIELDS,
  PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const MOCK_CASE_ROW = {
  id: "case-001",
  orgId: "org-1",
  customerId: "cust-001",
  caseTypeCode: "visa",
  stage: "S3",
  groupId: "group-1",
  ownerUserId: "user-1",
  dueAt: "2026-06-01",
  caseName: "技人国更新",
  caseNo: "CASE-001",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-01-15T00:00:00.000Z",
  createdAt: "2026-01-10T00:00:00.000Z",
  updatedAt: "2026-04-20T00:00:00.000Z",
};

const MOCK_DEEP_LINK = {
  customerId: "cust-001",
  customerName: "张伟",
  groupId: "group-1",
  groupName: "Tokyo-1",
  ownerUserId: "user-1",
  ownerDisplayName: "担当太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const MOCK_COUNTS = {
  documentItemsTotal: 10,
  documentItemsDone: 6,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 3,
  tasks: 5,
  tasksPending: 2,
  communicationLogs: 8,
  submissionPackages: 1,
  generatedDocuments: 4,
  validationRuns: 2,
  reviewRecords: 1,
  billingRecords: 3,
  paymentRecords: 2,
};

const MOCK_BILLING = {
  quotePrice: 300000,
  unpaidAmount: 50000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const MOCK_VALIDATION = {
  id: "vr-1",
  status: "passed",
  executedAt: "2026-04-01T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 1,
};

const MOCK_SUBMISSION = {
  id: "sub-1",
  submissionNo: 1,
  submissionKind: "initial",
  submittedAt: "2026-03-15T00:00:00.000Z",
  relatedSubmissionId: null,
};

const MOCK_REVIEW = {
  id: "rev-1",
  decision: "approved",
  reviewedAt: "2026-03-20T00:00:00.000Z",
  reviewerUserId: "reviewer-1",
  reviewerDisplayName: "田中太郎",
};

function buildAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: MOCK_CASE_ROW,
    deepLink: MOCK_DEEP_LINK,
    counts: MOCK_COUNTS,
    billing: MOCK_BILLING,
    latestValidation: MOCK_VALIDATION,
    latestSubmission: MOCK_SUBMISSION,
    latestReview: MOCK_REVIEW,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 5, done: 3 },
      { providerRole: "office", total: 5, done: 3 },
    ],
    ...overrides,
  };
}

// ─── Contract freeze tests (p0-fe-002c-01 / -02 / -03) ──────────

describe("aggregate contract freeze", () => {
  it("AGGREGATE_SLICE_KEYS matches server CaseDetailAggregateDto top-level keys", () => {
    expect(AGGREGATE_SLICE_KEYS).toEqual([
      "case",
      "counts",
      "latestValidation",
      "latestSubmission",
      "latestReview",
      "documentProgressByProvider",
      "billing",
      "deepLink",
      "failureCloseoutCheck",
      "currentResidencePeriod",
      "successCloseoutCheck",
    ]);
  });

  it("CASE_DETAIL_DEEP_LINK_FIELDS matches CaseDetailAggregate flat deep-link props", () => {
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toEqual([
      "customerId",
      "customerName",
      "customerLocalizedNames",
      "groupId",
      "groupName",
      "ownerUserId",
      "ownerDisplayName",
      "assistantUserId",
      "assistantDisplayName",
    ]);
  });

  it("CASE_DETAIL_NAV_PROTOCOL freezes tab query key and default tab", () => {
    expect(CASE_DETAIL_NAV_PROTOCOL.tabQueryKey).toBe("tab");
    expect(CASE_DETAIL_NAV_PROTOCOL.defaultTab).toBe("overview");
  });

  it("customerId in deep-link fields enables customer back-link", () => {
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toContain("customerId");
    expect(CASE_DETAIL_DEEP_LINK_FIELDS).toContain("customerName");
  });

  it("CASE_DETAIL_TAB_COUNTS_KEYS matches server CaseDetailCounts fields", () => {
    expect(CASE_DETAIL_TAB_COUNTS_KEYS).toEqual([
      "documentItemsTotal",
      "documentItemsDone",
      "questionnaireItemsTotal",
      "questionnaireItemsDone",
      "caseParties",
      "tasks",
      "tasksPending",
      "communicationLogs",
      "submissionPackages",
      "generatedDocuments",
      "validationRuns",
      "reviewRecords",
      "billingRecords",
      "paymentRecords",
    ]);
  });

  it("CASE_DETAIL_HEADER_FIELDS covers header / overview / info main chain", () => {
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("id");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("title");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("client");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("owner");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("stageCode");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("readonly");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("progressPercent");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("billingAmount");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("customerId");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("groupId");
    expect(CASE_DETAIL_HEADER_FIELDS).toContain("groupName");
  });

  it("CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS covers all 7 field groups", () => {
    expect(CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS).toEqual([
      "customerId",
      "customerName",
      "owner",
      "group",
      "deadline",
      "progress",
      "billing",
    ]);
  });

  it("every main chain group detailFields is present in CASE_DETAIL_HEADER_FIELDS", () => {
    const headerSet = new Set<string>(CASE_DETAIL_HEADER_FIELDS);
    for (const key of CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS) {
      const group = CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS[key];
      for (const field of group.detailFields) {
        expect(headerSet.has(field)).toBe(true);
      }
    }
  });

  it("BILLING_SLICE_CONSUMED_FIELDS matches CaseBillingSummary fields", () => {
    expect(BILLING_SLICE_CONSUMED_FIELDS).toContain("quotePrice");
    expect(BILLING_SLICE_CONSUMED_FIELDS).toContain("unpaidAmount");
    expect(BILLING_SLICE_CONSUMED_FIELDS).toContain("depositPaid");
    expect(BILLING_SLICE_CONSUMED_FIELDS).toContain("finalPaymentPaid");
    expect(BILLING_SLICE_CONSUMED_FIELDS).toContain("billingRiskAcknowledged");
    expect(BILLING_SLICE_CONSUMED_FIELDS).toHaveLength(7);
  });

  it("LATEST_VALIDATION_SLICE_CONSUMED_FIELDS matches CaseLatestValidationSummary", () => {
    expect(LATEST_VALIDATION_SLICE_CONSUMED_FIELDS).toContain("status");
    expect(LATEST_VALIDATION_SLICE_CONSUMED_FIELDS).toContain("executedAt");
    expect(LATEST_VALIDATION_SLICE_CONSUMED_FIELDS).toContain("blockingCount");
    expect(LATEST_VALIDATION_SLICE_CONSUMED_FIELDS).toContain("warningCount");
    expect(LATEST_VALIDATION_SLICE_CONSUMED_FIELDS).toHaveLength(4);
  });

  it("PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS matches CaseDocumentProgressByProvider", () => {
    expect(PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS).toContain("providerRole");
    expect(PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS).toContain("total");
    expect(PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS).toContain("done");
    expect(PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS).toHaveLength(3);
  });

  it("adapted aggregate exposes all deep-link fields", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    for (const field of CASE_DETAIL_DEEP_LINK_FIELDS) {
      expect(field in result).toBe(true);
    }
  });

  it("adapted aggregate exposes all header fields on detail", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    for (const field of CASE_DETAIL_HEADER_FIELDS) {
      expect(
        field in result.detail,
        `expected detail to have field "${field}"`,
      ).toBe(true);
    }
  });

  it("adapted aggregate exposes all tab counts keys", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    for (const key of CASE_DETAIL_TAB_COUNTS_KEYS) {
      expect(key in result.tabCounts).toBe(true);
    }
  });
});

// ─── Full aggregate adaptation ───────────────────────────────────

describe("adaptCaseDetailAggregate", () => {
  it("adapts a full aggregate response", () => {
    const result = adaptCaseDetailAggregate(buildAggregate());
    expect(result).not.toBeNull();
    expect(result!.detail.id).toBe("case-001");
    expect(result!.detail.title).toBe("技人国更新");
    expect(result!.detail.stageCode).toBe("S3");
    expect(result!.detail.progressPercent).toBe(60);
    expect(result!.detail.progressCount).toBe("6/10");
    expect(result!.customerName).toBe("张伟");
    expect(result!.ownerDisplayName).toBe("担当太郎");
    expect(result!.groupName).toBe("Tokyo-1");
  });

  it("returns null for non-object input", () => {
    expect(adaptCaseDetailAggregate(null)).toBeNull();
    expect(adaptCaseDetailAggregate("bad")).toBeNull();
    expect(adaptCaseDetailAggregate(42)).toBeNull();
    expect(adaptCaseDetailAggregate(undefined)).toBeNull();
  });

  it("returns null when case record is missing", () => {
    expect(adaptCaseDetailAggregate({ counts: MOCK_COUNTS })).toBeNull();
  });

  it("returns null when case.id is missing", () => {
    expect(
      adaptCaseDetailAggregate(buildAggregate({ case: { stage: "S1" } })),
    ).toBeNull();
  });

  it("returns null for array input", () => {
    expect(adaptCaseDetailAggregate([MOCK_CASE_ROW])).toBeNull();
  });
});

// ─── Header / Overview / Info main chain (p0-fe-002c-02) ─────────

describe("detail header / overview / info", () => {
  it("maps case type and application type", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.caseType).toBe("visa");
    expect(result.detail.applicationType).toBe("認定");
  });

  it("maps accepted date from caseRecord", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.acceptedDate).not.toBe("");
  });

  it("maps target date from dueAt", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.targetDate).not.toBe("");
    expect(result.detail.deadline).not.toBe("");
  });

  it("falls back to caseNo when caseName is empty", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        case: { ...MOCK_CASE_ROW, caseName: "", caseNo: "CASE-001" },
      }),
    )!;
    expect(result.detail.title).toBe("CASE-001");
  });

  it("falls back to id when both caseName and caseNo are empty", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, caseName: "", caseNo: "" } }),
    )!;
    expect(result.detail.title).toBe("case-001");
  });

  it("maps client name from deepLink", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.client).toBe("张伟");
  });

  it("maps owner from deepLink", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.owner).toBe("担当太郎");
  });

  it("maps billing amount and meta from billing slice", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.billingAmount).toBe("¥300,000");
    expect(result.detail.billingMeta).toContain("50,000");
    expect(result.detail.billingStatusKey).toBe("unpaid");
  });

  it("maps billing amount as paid when no unpaid", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ billing: { ...MOCK_BILLING, unpaidAmount: 0 } }),
    )!;
    expect(result.detail.billingStatusKey).toBe("paid");
    expect(result.detail.billingMeta).toBe("");
  });

  it("maps overview actions with documents and validation shortcuts", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.overviewActions.primary.tab).toBe("documents");
    expect(result.detail.overviewActions.secondary.tab).toBe("validation");
  });

  it("maps customerId from deepLink to detail header", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.customerId).toBe("cust-001");
  });

  it("maps groupId and groupName from deepLink to detail header", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.groupId).toBe("group-1");
    expect(result.detail.groupName).toBe("Tokyo-1");
  });
});

// ─── Tab Counts (p0-fe-002c-02) ──────────────────────────────────

describe("tabCounts", () => {
  it("maps all counts from server aggregate", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.tabCounts).toEqual(MOCK_COUNTS);
  });

  it("defaults all counts to 0 when counts slice is null", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ counts: null }))!;
    for (const key of CASE_DETAIL_TAB_COUNTS_KEYS) {
      expect(result.tabCounts[key]).toBe(0);
    }
  });

  it("defaults missing count fields to 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ counts: { documentItemsTotal: 5 } }),
    )!;
    expect(result.tabCounts.documentItemsTotal).toBe(5);
    expect(result.tabCounts.caseParties).toBe(0);
    expect(result.tabCounts.tasks).toBe(0);
  });
});

// ─── Deep-link / customer back-link (p0-fe-002c-03) ─────────────

describe("deep-link fields", () => {
  it("maps all deep-link fields from aggregate", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.customerId).toBe("cust-001");
    expect(result.customerName).toBe("张伟");
    expect(result.groupId).toBe("group-1");
    expect(result.groupName).toBe("Tokyo-1");
    expect(result.ownerUserId).toBe("user-1");
    expect(result.ownerDisplayName).toBe("担当太郎");
    expect(result.assistantUserId).toBeNull();
    expect(result.assistantDisplayName).toBeNull();
  });

  it("maps assistant fields when present", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        deepLink: {
          ...MOCK_DEEP_LINK,
          assistantUserId: "asst-1",
          assistantDisplayName: "助手花子",
        },
      }),
    )!;
    expect(result.assistantUserId).toBe("asst-1");
    expect(result.assistantDisplayName).toBe("助手花子");
  });

  it("handles missing deepLink gracefully", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ deepLink: null }),
    )!;
    expect(result.customerId).toBe("");
    expect(result.customerName).toBe("");
    expect(result.ownerUserId).toBe("");
    expect(result.ownerDisplayName).toBe("");
    expect(result.groupId).toBeNull();
    expect(result.groupName).toBeNull();
    expect(result.assistantUserId).toBeNull();
    expect(result.assistantDisplayName).toBeNull();
  });

  it("handles deepLink with empty strings", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        deepLink: {
          customerId: "",
          customerName: "",
          groupId: null,
          groupName: null,
          ownerUserId: "",
          ownerDisplayName: "",
          assistantUserId: null,
          assistantDisplayName: null,
        },
      }),
    )!;
    expect(result.customerId).toBe("");
    expect(result.customerName).toBe("");
    expect(result.groupId).toBeNull();
  });
});
