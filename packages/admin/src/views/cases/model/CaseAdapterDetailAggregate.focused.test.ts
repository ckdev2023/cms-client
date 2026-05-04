// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-002c-04 — detail aggregate adapter focused tests
//   (snapshot + empty state + structural integrity).
// Read-only state tests → CaseAdapterDetailAggregate.readonly.test.ts
// Contract freeze, header mapping, deep-link
//   → CaseAdapterDetailAggregate.test.ts
// Slice degradation per-slice
//   → CaseAdapterDetailAggregate.slices.test.ts
// Per-group main-chain mapping
//   → CaseAdapterDetailAggregate.main-chain.test.ts
// Does NOT test: list mappers, mutation results, write builders,
//   or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  CASE_DETAIL_DEEP_LINK_FIELDS,
  CASE_DETAIL_HEADER_FIELDS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS,
  CASE_DETAIL_TAB_COUNTS_KEYS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const FULL_CASE_ROW = {
  id: "case-f01",
  orgId: "org-1",
  customerId: "cust-f01",
  caseTypeCode: "visa",
  stage: "S4",
  groupId: "group-f01",
  ownerUserId: "user-f01",
  dueAt: "2026-08-15",
  caseName: "経営管理ビザ新規",
  caseNo: "CASE-F01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "変更",
  acceptedAt: "2026-02-10T00:00:00.000Z",
  createdAt: "2026-02-01T00:00:00.000Z",
  updatedAt: "2026-04-22T00:00:00.000Z",
};

const FULL_DEEP_LINK = {
  customerId: "cust-f01",
  customerName: "李明",
  groupId: "group-f01",
  groupName: "Osaka-A",
  ownerUserId: "user-f01",
  ownerDisplayName: "佐藤一郎",
  assistantUserId: "asst-f01",
  assistantDisplayName: "鈴木二郎",
};

const FULL_COUNTS = {
  documentItemsTotal: 20,
  documentItemsDone: 12,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 5,
  tasks: 8,
  tasksPending: 3,
  communicationLogs: 15,
  submissionPackages: 2,
  generatedDocuments: 6,
  validationRuns: 4,
  reviewRecords: 2,
  billingRecords: 5,
  paymentRecords: 3,
};

const FULL_BILLING = {
  quotePrice: 500000,
  unpaidAmount: 100000,
  totalReceived: 400000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: true,
  billingRiskAcknowledgedAt: "2026-04-05T00:00:00.000Z",
  billingRiskAckReasonCode: "advance_agreement",
};

const FULL_VALIDATION = {
  id: "vr-f01",
  status: "failed",
  executedAt: "2026-04-20T00:00:00.000Z",
  blockingCount: 2,
  warningCount: 3,
};

const FULL_REVIEW = {
  id: "rev-f01",
  decision: "rejected",
  reviewedAt: "2026-04-18T00:00:00.000Z",
  reviewerUserId: "reviewer-f01",
  reviewerDisplayName: "高橋審査官",
};

const FULL_PROVIDER_PROGRESS = [
  { providerRole: "applicant", total: 10, done: 6 },
  { providerRole: "office", total: 8, done: 5 },
  { providerRole: "employer", total: 2, done: 1 },
];

function buildFullAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: FULL_CASE_ROW,
    deepLink: FULL_DEEP_LINK,
    counts: FULL_COUNTS,
    billing: FULL_BILLING,
    latestValidation: FULL_VALIDATION,
    latestSubmission: null,
    latestReview: FULL_REVIEW,
    documentProgressByProvider: FULL_PROVIDER_PROGRESS,
    ...overrides,
  };
}

function buildMinimalAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: { id: "case-min", stage: "S1" },
    deepLink: null,
    counts: null,
    billing: null,
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    ...overrides,
  };
}

// ─── Full main-chain field snapshot ──────────────────────────────

describe("full main-chain snapshot (p0-fe-002c-04)", () => {
  const result = adaptCaseDetailAggregate(buildFullAggregate())!;

  it("adapts successfully", () => {
    expect(result).not.toBeNull();
  });

  it("header identity fields", () => {
    expect(result.detail.id).toBe("case-f01");
    expect(result.detail.title).toBe("経営管理ビザ新規");
    expect(result.detail.caseType).toBe("visa");
    expect(result.detail.applicationType).toBe("変更");
  });

  it("header stage fields", () => {
    expect(result.detail.stage).toBe("文书制作中");
    expect(result.detail.stageCode).toBe("S4");
    expect(result.detail.stageMeta).toBe("S4");
    expect(result.detail.statusBadge).toBe("badge-blue");
    expect(result.detail.readonly).toBe(false);
  });

  it("header deepLink-sourced fields", () => {
    expect(result.detail.client).toBe("李明");
    expect(result.detail.owner).toBe("佐藤一郎");
    expect(result.detail.customerId).toBe("cust-f01");
    expect(result.detail.groupId).toBe("group-f01");
    expect(result.detail.groupName).toBe("Osaka-A");
  });

  it("header deadline fields", () => {
    expect(result.detail.deadline).not.toBe("");
    expect(result.detail.deadlineMeta).toBe("");
    expect(result.detail.deadlineMetaLoc?.key).toBe(
      "cases.detail.overview.deadlineMeta",
    );
    expect(result.detail.deadlineMetaLoc?.params?.date).not.toBe("");
    expect(result.detail.targetDate).not.toBe("");
    expect(result.detail.deadlineDanger).toBe(false);
    expect(result.detail.acceptedDate).not.toBe("");
  });

  it("header progress fields", () => {
    expect(result.detail.progressPercent).toBe(60);
    expect(result.detail.progressCount).toBe("12/20");
    expect(result.detail.docsCounter).toBe("12/20");
  });

  it("header billing fields", () => {
    expect(result.detail.billingAmount).toBe("¥500,000");
    expect(result.detail.billingMeta).toContain("100,000");
    expect(result.detail.billingStatusKey).toBe("unpaid");
  });

  it("risk block populated from validation + billing", () => {
    expect(result.detail.risk.blockingCount).toBe("2");
    expect(result.detail.risk.blockingDetail).toBe("");
    expect(result.detail.risk.blockingDetailLoc?.key).toBe(
      "cases.detail.overview.risk.blockingDetail",
    );
    expect(result.detail.risk.blockingDetailLoc?.params).toEqual({ count: 2 });
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsYes");
    expect(result.detail.risk.arrearsDetail).toContain("100,000");
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.risk.lastValidationLoc?.key).toBe(
      "cases.detail.overview.risk.lastValidation.failed",
    );
    expect(result.detail.risk.reviewStatus).toBe("rejected");
  });

  it("validation hint and block", () => {
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.validationHintLoc?.key).toBe(
      "cases.detail.overview.validationHint.blockingWarning",
    );
    expect(result.detail.validationHintLoc?.params).toEqual({ b: 2, w: 3 });
    expect(result.detail.validation.lastTime).not.toBe("");
  });

  it("billing block detail", () => {
    expect(result.detail.billing.total).toBe("¥500,000");
    expect(result.detail.billing.received).toBe("¥400,000");
    expect(result.detail.billing.outstanding).toBe("¥100,000");
    expect(result.detail.billing.payments).toEqual([]);
  });

  it("billing risk confirmation present when acknowledged", () => {
    expect(result.detail.riskConfirmationRecord).not.toBeNull();
    expect(result.detail.riskConfirmationRecord?.reason).toBe(
      "advance_agreement",
    );
    expect(result.detail.riskConfirmationRecord?.time).not.toBe("");
    expect(result.detail.riskConfirmationRecord?.amount).toContain("100,000");
  });

  it("provider progress from all 3 providers", () => {
    expect(result.detail.providerProgress).toHaveLength(3);
    expect(result.detail.providerProgress[0]).toEqual({
      label: "applicant",
      labelKey: "cases.detail.providers.applicant",
      providerRole: "applicant",
      done: 6,
      total: 10,
    });
    expect(result.detail.providerProgress[2]).toEqual({
      label: "employer",
      labelKey: "cases.detail.providers.employer",
      providerRole: "employer",
      done: 1,
      total: 2,
    });
  });

  it("overview actions unchanged", () => {
    expect(result.detail.overviewActions.primary.tab).toBe("documents");
    expect(result.detail.overviewActions.secondary.tab).toBe("validation");
  });

  it("tab counts match input", () => {
    expect(result.tabCounts).toEqual(FULL_COUNTS);
  });

  it("deep-link fields including assistant", () => {
    expect(result.customerId).toBe("cust-f01");
    expect(result.customerName).toBe("李明");
    expect(result.groupId).toBe("group-f01");
    expect(result.groupName).toBe("Osaka-A");
    expect(result.ownerUserId).toBe("user-f01");
    expect(result.ownerDisplayName).toBe("佐藤一郎");
    expect(result.assistantUserId).toBe("asst-f01");
    expect(result.assistantDisplayName).toBe("鈴木二郎");
  });

  it("every CASE_DETAIL_HEADER_FIELDS key present on detail", () => {
    for (const f of CASE_DETAIL_HEADER_FIELDS) {
      expect(f in result.detail, `missing header field: ${f}`).toBe(true);
    }
  });

  it("every main-chain group detailField defined when slices present", () => {
    for (const key of CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS) {
      const group = CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS[key];
      for (const field of group.detailFields) {
        const value = (result.detail as unknown as Record<string, unknown>)[
          field
        ];
        expect(value !== undefined, `${key}.${field} should be defined`).toBe(
          true,
        );
      }
    }
  });

  it("placeholder tab collections remain empty (except team)", () => {
    expect(result.detail.timeline).toEqual([]);
    expect(result.detail.relatedParties).toEqual([]);
    expect(result.detail.deadlines).toEqual([]);
    expect(result.detail.submissionPackages).toEqual([]);
    expect(result.detail.correctionPackage).toBeNull();
    expect(result.detail.doubleReview).toEqual([]);
    expect(result.detail.documents).toEqual([]);
    expect(result.detail.forms).toEqual({ templates: [], generated: [] });
    expect(result.detail.tasks).toEqual([]);
    expect(result.detail.logEntries).toEqual([]);
    expect(result.detail.messages).toEqual([]);
  });
});

// ─── All-null empty state (空態) ─────────────────────────────────

describe("all-null empty state (p0-fe-002c-04)", () => {
  const result = adaptCaseDetailAggregate(buildMinimalAggregate())!;

  it("adapts successfully with only case.id + case.stage", () => {
    expect(result).not.toBeNull();
  });

  it("identity falls back to id when no caseName or caseNo", () => {
    expect(result.detail.id).toBe("case-min");
    expect(result.detail.title).toBe("case-min");
  });

  it("stage defaults to S1", () => {
    expect(result.detail.stage).toBe("刚开始办案");
    expect(result.detail.stageCode).toBe("S1");
    expect(result.detail.statusBadge).toBe("badge-gray");
    expect(result.detail.readonly).toBe(false);
  });

  it("deepLink-sourced header fields are empty strings", () => {
    expect(result.detail.client).toBe("");
    expect(result.detail.owner).toBe("");
    expect(result.detail.customerId).toBe("");
    expect(result.detail.groupId).toBe("");
    expect(result.detail.groupName).toBe("");
  });

  it("deadline fields are empty", () => {
    expect(result.detail.deadline).toBe("");
    expect(result.detail.deadlineMeta).toBe("");
    expect(result.detail.targetDate).toBe("");
    expect(result.detail.deadlineDanger).toBe(false);
  });

  it("progress is zero", () => {
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
    expect(result.detail.docsCounter).toBe("0/0");
  });

  it("billing shows dash / paid / zero", () => {
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billingMeta).toBe("");
    expect(result.detail.billingStatusKey).toBe("paid");
    expect(result.detail.billing.total).toBe("—");
    expect(result.detail.billing.received).toBe("¥0");
    expect(result.detail.billing.outstanding).toBe("¥0");
  });

  it("risk block is neutral", () => {
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.blockingDetail).toBe("");
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsNo");
    expect(result.detail.risk.arrearsDetail).toBe("");
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.risk.reviewStatus).toBe("");
  });

  it("validation hint and block empty", () => {
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.validation.lastTime).toBe("");
    expect(result.detail.validation.blocking).toEqual([]);
    expect(result.detail.validation.warnings).toEqual([]);
    expect(result.detail.validation.info).toEqual([]);
  });

  it("no risk confirmation and no provider progress", () => {
    expect(result.detail.riskConfirmationRecord).toBeNull();
    expect(result.detail.providerProgress).toEqual([]);
  });

  it("tab counts are all zero", () => {
    for (const key of CASE_DETAIL_TAB_COUNTS_KEYS) {
      expect(result.tabCounts[key]).toBe(0);
    }
  });

  it("deep-link fields default to empty / null", () => {
    expect(result.customerId).toBe("");
    expect(result.customerName).toBe("");
    expect(result.ownerUserId).toBe("");
    expect(result.ownerDisplayName).toBe("");
    expect(result.groupId).toBeNull();
    expect(result.groupName).toBeNull();
    expect(result.assistantUserId).toBeNull();
    expect(result.assistantDisplayName).toBeNull();
  });

  it("every CASE_DETAIL_DEEP_LINK_FIELDS key is present", () => {
    for (const f of CASE_DETAIL_DEEP_LINK_FIELDS) {
      expect(f in result, `missing deep-link field: ${f}`).toBe(true);
    }
  });

  it("every CASE_DETAIL_HEADER_FIELDS key is present", () => {
    for (const f of CASE_DETAIL_HEADER_FIELDS) {
      expect(f in result.detail, `missing header field: ${f}`).toBe(true);
    }
  });

  it("placeholder tab collections remain empty", () => {
    expect(result.detail.timeline).toEqual([]);
    expect(result.detail.team).toEqual([]);
    expect(result.detail.documents).toEqual([]);
    expect(result.detail.tasks).toEqual([]);
    expect(result.detail.messages).toEqual([]);
    expect(result.detail.logEntries).toEqual([]);
  });
});

// ─── Structural key-set integrity ────────────────────────────────

describe("structural key-set integrity (p0-fe-002c-04)", () => {
  it("full aggregate result has exactly the expected top-level keys", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    const topKeys = Object.keys(result).sort();
    const expected = ["detail", "tabCounts", ...CASE_DETAIL_DEEP_LINK_FIELDS]
      .slice()
      .sort();
    expect(topKeys).toEqual(expected);
  });

  it("empty aggregate result has the same top-level key set", () => {
    const result = adaptCaseDetailAggregate(buildMinimalAggregate())!;
    const topKeys = Object.keys(result).sort();
    const expected = ["detail", "tabCounts", ...CASE_DETAIL_DEEP_LINK_FIELDS]
      .slice()
      .sort();
    expect(topKeys).toEqual(expected);
  });

  it("tabCounts has exactly CASE_DETAIL_TAB_COUNTS_KEYS", () => {
    const result = adaptCaseDetailAggregate(buildFullAggregate())!;
    const keys = Object.keys(result.tabCounts).sort();
    const expected = [...CASE_DETAIL_TAB_COUNTS_KEYS].sort();
    expect(keys).toEqual(expected);
  });
});
