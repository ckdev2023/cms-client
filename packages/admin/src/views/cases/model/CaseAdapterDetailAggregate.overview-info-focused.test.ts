// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-006a-03 — overview/info tabs focused tests
//   Locks field display values, null/empty degradation, and readonly
//   behaviour as consumed by CaseOverviewTab.vue, CaseOverviewSidebar.vue,
//   and CaseInfoTab.vue.
// Does NOT test: frozen key-set snapshots (→ overview-contract / info-contract),
//   per-slice degradation (→ slices.test), per-group mapping (→ main-chain.test),
//   structural key-set integrity (→ focused.test), adapter internals,
//   list mappers, write builders, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  INFO_TAB_CASE_ATTRIBUTES_FIELDS,
  OVERVIEW_TAB_MAIN_CONSUMED_FIELDS,
  OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS,
  OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS,
} from "./CaseAdapterDetailContracts";

// ─── Shared fixtures ─────────────────────────────────────────────

const CASE_ROW_FULL = {
  id: "case-oif01",
  orgId: "org-1",
  customerId: "cust-oif01",
  caseTypeCode: "business_manager",
  stage: "S3",
  groupId: "group-oif01",
  ownerUserId: "user-oif01",
  dueAt: "2026-09-15",
  caseName: "経営管理ビザ新規ケース",
  caseNo: "CASE-OIF01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-03-10T00:00:00.000Z",
};

const DEEP_LINK_FULL = {
  customerId: "cust-oif01",
  customerName: "王小明",
  groupId: "group-oif01",
  groupName: "Osaka-B",
  ownerUserId: "user-oif01",
  ownerDisplayName: "山田次郎",
  assistantUserId: "asst-oif01",
  assistantDisplayName: "鈴木三郎",
};

const COUNTS_FULL = {
  documentItemsTotal: 12,
  documentItemsDone: 8,
  caseParties: 4,
  tasks: 7,
  tasksPending: 2,
  communicationLogs: 11,
  submissionPackages: 1,
  generatedDocuments: 5,
  validationRuns: 3,
  reviewRecords: 1,
  billingRecords: 4,
  paymentRecords: 2,
};

const BILLING_FULL = {
  quotePrice: 350000,
  unpaidAmount: 70000,
  totalReceived: 280000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const VALIDATION_FULL = {
  id: "vr-oif01",
  status: "passed",
  executedAt: "2026-04-22T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 3,
};

const REVIEW_FULL = {
  id: "rev-oif01",
  decision: "approved",
  reviewedAt: "2026-04-21T00:00:00.000Z",
  reviewerUserId: "reviewer-oif01",
  reviewerDisplayName: "高橋審査員",
};

const PROVIDER_PROGRESS_FULL = [
  { providerRole: "applicant", total: 6, done: 4 },
  { providerRole: "office", total: 6, done: 4 },
];

function buildFull(overrides: Record<string, unknown> = {}) {
  return {
    case: CASE_ROW_FULL,
    deepLink: DEEP_LINK_FULL,
    counts: COUNTS_FULL,
    billing: BILLING_FULL,
    latestValidation: VALIDATION_FULL,
    latestSubmission: null,
    latestReview: REVIEW_FULL,
    documentProgressByProvider: PROVIDER_PROGRESS_FULL,
    ...overrides,
  };
}

function buildEmpty(overrides: Record<string, unknown> = {}) {
  return {
    case: { id: "case-oif-empty", stage: "S1" },
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

// ═══════════════════════════════════════════════════════════════════
//  OVERVIEW TAB — field display values
// ═══════════════════════════════════════════════════════════════════

describe("overview tab field display (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildFull())!;

  it("stage card shows resolved label and stage code meta", () => {
    expect(result.detail.stage).toBe("资料待补 / 审核中");
    expect(result.detail.stageMeta).toBe("S3");
  });

  it("deadline card shows formatted date with Due: prefix meta", () => {
    expect(result.detail.deadline).not.toBe("");
    expect(result.detail.deadline).toContain("2026");
    expect(result.detail.deadlineMeta).toContain("Due:");
    expect(result.detail.deadlineDanger).toBe(false);
  });

  it("progress card shows computed percent and done/total count", () => {
    expect(result.detail.progressPercent).toBe(67);
    expect(result.detail.progressCount).toBe("8/12");
  });

  it("billing card shows yen-formatted quote and unpaid meta", () => {
    expect(result.detail.billingAmount).toBe("¥350,000");
    expect(result.detail.billingMeta).toContain("70,000");
  });

  it("provider progress has labels and counts from DTO entries", () => {
    expect(result.detail.providerProgress).toHaveLength(2);
    expect(result.detail.providerProgress[0]).toEqual({
      label: "applicant",
      labelKey: "cases.detail.providers.applicant",
      providerRole: "applicant",
      done: 4,
      total: 6,
    });
    expect(result.detail.providerProgress[1]).toEqual({
      label: "office",
      labelKey: "cases.detail.providers.office",
      providerRole: "office",
      done: 4,
      total: 6,
    });
  });

  it("nextAction is empty string (no server-side derivation yet)", () => {
    expect(result.detail.nextAction).toBe("");
  });

  it("overviewActions point to documents and validation tabs with i18n keys", () => {
    expect(result.detail.overviewActions.primary).toEqual({
      label: "cases.coach.docManagement",
      tab: "documents",
    });
    expect(result.detail.overviewActions.secondary).toEqual({
      label: "cases.coach.runValidation",
      tab: "validation",
    });
  });

  it("timeline is empty placeholder array", () => {
    expect(result.detail.timeline).toEqual([]);
  });
});

// ─── Overview sidebar display ───────────────────────────────────

describe("overview sidebar field display (p0-fe-006a-03)", () => {
  it("risk block with no blocking shows 0 and empty detail", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.blockingDetail).toBe("");
  });

  it("risk block with blocking issues shows count and detail text", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({
        latestValidation: { ...VALIDATION_FULL, blockingCount: 4 },
      }),
    )!;
    expect(result.detail.risk.blockingCount).toBe("4");
    expect(result.detail.risk.blockingDetail).toBe("4 blocking issues");
  });

  it("arrears shows あり with yen amount when unpaid > 0", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsYes");
    expect(result.detail.risk.arrearsDetail).toContain("70,000");
  });

  it("arrears shows なし with empty detail when fully paid", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({ billing: { ...BILLING_FULL, unpaidAmount: 0 } }),
    )!;
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsNo");
    expect(result.detail.risk.arrearsDetail).toBe("");
  });

  it("lastValidation status forwarded from latestValidation.status", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.risk.lastValidation).toBe("passed");
  });

  it("reviewStatus forwarded from latestReview.decision", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.risk.reviewStatus).toBe("approved");
  });

  it("team is populated from deep link owner and assistant", () => {
    expect(result.detail.team).toHaveLength(2);
    expect(result.detail.team[0].name).toBe("山田次郎");
    expect(result.detail.team[0].role).toBe(
      "cases.detail.overview.sidebar.teamRoleOwner",
    );
    expect(result.detail.team[1].name).toBe("鈴木三郎");
    expect(result.detail.team[1].role).toBe(
      "cases.detail.overview.sidebar.teamRoleAssistant",
    );
  });

  const result = adaptCaseDetailAggregate(buildFull())!;

  it("validationHint shows only warnings when no blocking", () => {
    expect(result.detail.validationHint).toBe("3 warning");
  });

  it("validationHint shows both when blocking + warning present", () => {
    const r = adaptCaseDetailAggregate(
      buildFull({
        latestValidation: {
          ...VALIDATION_FULL,
          blockingCount: 1,
          warningCount: 2,
        },
      }),
    )!;
    expect(r.detail.validationHint).toBe("1 blocking, 2 warning");
  });
});

// ─── Overview customer back-link display ────────────────────────

describe("overview customer back-link display (p0-fe-006a-03)", () => {
  it("customerId is truthy string → template shows the customer row", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.customerId).toBe("cust-oif01");
    expect(!!result.detail.customerId).toBe(true);
  });

  it("client shows customer name from deepLink", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.client).toBe("王小明");
  });

  it("groupName is truthy → template shows group badge", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.groupName).toBe("Osaka-B");
    expect(!!result.detail.groupName).toBe(true);
  });

  it("customerId is empty string when deepLink is null → row hidden", () => {
    const result = adaptCaseDetailAggregate(buildEmpty())!;
    expect(result.detail.customerId).toBe("");
    expect(!!result.detail.customerId).toBe(false);
  });

  it("groupName is empty when deepLink.groupName is null → badge hidden", () => {
    const result = adaptCaseDetailAggregate(
      buildFull({
        deepLink: { ...DEEP_LINK_FULL, groupName: null },
      }),
    )!;
    expect(result.detail.groupName).toBe("");
    expect(!!result.detail.groupName).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  INFO TAB — field display values
// ═══════════════════════════════════════════════════════════════════

describe("info tab field display (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildFull())!;

  it("id shows the case id", () => {
    expect(result.detail.id).toBe("case-oif01");
  });

  it("caseType shows caseTypeCode from caseRecord", () => {
    expect(result.detail.caseType).toBe("business_manager");
  });

  it("applicationType shows value from caseRecord", () => {
    expect(result.detail.applicationType).toBe("認定");
  });

  it("acceptedDate shows formatted date containing year", () => {
    expect(result.detail.acceptedDate).not.toBe("");
    expect(result.detail.acceptedDate).toContain("2026");
  });

  it("targetDate shows formatted date from dueAt", () => {
    expect(result.detail.targetDate).not.toBe("");
    expect(result.detail.targetDate).toContain("2026");
  });

  it("agency is empty string (no server mapping)", () => {
    expect(result.detail.agency).toBe("");
  });

  it("relatedParties is empty placeholder array", () => {
    expect(result.detail.relatedParties).toEqual([]);
  });
});

// ─── Info tab template fallback ("—") behaviour ─────────────────
// The Vue template renders `{{ detail.field || "—" }}`.
// When the adapter returns "" the template shows "—".

describe("info tab template fallback behaviour (p0-fe-006a-03)", () => {
  it("non-empty field value is truthy — template shows the value", () => {
    const result = adaptCaseDetailAggregate(buildFull())!;
    expect(result.detail.caseType || "—").toBe("business_manager");
    expect(result.detail.applicationType || "—").toBe("認定");
  });

  it("empty string field evaluates falsy — template shows dash", () => {
    const result = adaptCaseDetailAggregate(buildEmpty())!;
    expect(result.detail.caseType || "—").toBe("—");
    expect(result.detail.applicationType || "—").toBe("—");
    expect(result.detail.acceptedDate || "—").toBe("—");
    expect(result.detail.targetDate || "—").toBe("—");
    expect(result.detail.agency || "—").toBe("—");
  });

  it("id always populated — never shows dash", () => {
    const result = adaptCaseDetailAggregate(buildEmpty())!;
    expect(result.detail.id || "—").toBe("case-oif-empty");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  EMPTY / NULL VALUE DEGRADATION — overview tab
// ═══════════════════════════════════════════════════════════════════

describe("overview empty state degradation (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildEmpty())!;

  it("stage card defaults to S1 label", () => {
    expect(result.detail.stage).toBe("刚开始办案");
    expect(result.detail.stageMeta).toBe("S1");
  });

  it("deadline card shows empty strings", () => {
    expect(result.detail.deadline).toBe("");
    expect(result.detail.deadlineMeta).toBe("");
    expect(result.detail.deadlineDanger).toBe(false);
  });

  it("progress card shows 0% and 0/0", () => {
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
  });

  it("billing card shows dash and empty meta", () => {
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billingMeta).toBe("");
  });

  it("provider progress is empty array", () => {
    expect(result.detail.providerProgress).toEqual([]);
  });

  it("risk block is neutral: no blocking, no arrears, no validation", () => {
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.blockingDetail).toBe("");
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsNo");
    expect(result.detail.risk.arrearsDetail).toBe("");
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.risk.reviewStatus).toBe("");
  });

  it("validationHint is empty", () => {
    expect(result.detail.validationHint).toBe("");
  });

  it("customer back-link row hidden (customerId empty)", () => {
    expect(result.detail.customerId).toBe("");
    expect(!!result.detail.customerId).toBe(false);
  });

  it("all overview consumed fields still structurally present", () => {
    for (const f of OVERVIEW_TAB_MAIN_CONSUMED_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(
        val !== undefined,
        `overview main field "${f}" should be defined`,
      ).toBe(true);
    }
    for (const f of OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `sidebar field "${f}" should be defined`).toBe(
        true,
      );
    }
    for (const f of OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(
        val !== undefined,
        `back-link field "${f}" should be defined`,
      ).toBe(true);
    }
  });
});

// ─── Empty / null value degradation — info tab ──────────────────

describe("info tab empty state degradation (p0-fe-006a-03)", () => {
  const result = adaptCaseDetailAggregate(buildEmpty())!;

  it("id still populated from minimal case", () => {
    expect(result.detail.id).toBe("case-oif-empty");
  });

  it("caseType defaults to empty string", () => {
    expect(result.detail.caseType).toBe("");
  });

  it("applicationType defaults to empty string", () => {
    expect(result.detail.applicationType).toBe("");
  });

  it("acceptedDate defaults to empty string", () => {
    expect(result.detail.acceptedDate).toBe("");
  });

  it("targetDate defaults to empty string", () => {
    expect(result.detail.targetDate).toBe("");
  });

  it("agency defaults to empty string", () => {
    expect(result.detail.agency).toBe("");
  });

  it("relatedParties is empty array", () => {
    expect(result.detail.relatedParties).toEqual([]);
  });

  it("all info consumed fields structurally present", () => {
    for (const f of INFO_TAB_CASE_ATTRIBUTES_FIELDS) {
      const val = (result.detail as unknown as Record<string, unknown>)[f];
      expect(val !== undefined, `info field "${f}" should be defined`).toBe(
        true,
      );
    }
  });
});
