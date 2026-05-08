// Owner: detail aggregate DTO slice degradation, S9 readonly,
// risk / validation / billing / provider progress blocks.

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  BILLING_SLICE_CONSUMED_FIELDS,
  LATEST_VALIDATION_SLICE_CONSUMED_FIELDS,
  PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS,
} from "./CaseAdapterDetailContracts";

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
    latestSubmission: null,
    latestReview: MOCK_REVIEW,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 5, done: 3 },
      { providerRole: "office", total: 5, done: 3 },
    ],
    ...overrides,
  };
}

describe("slice graceful degradation", () => {
  it("handles missing counts gracefully", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ counts: null }))!;
    expect(result.detail.progressPercent).toBe(0);
    expect(result.detail.progressCount).toBe("0/0");
    expect(result.detail.docsCounter).toBe("0/0");
  });

  it("handles missing billing gracefully", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ billing: null }))!;
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billingMeta).toBe("");
    expect(result.detail.billingStatusKey).toBe("paid");
  });

  it("handles missing latestValidation gracefully", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ latestValidation: null }),
    )!;
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.validation.lastTime).toBe("");
    expect(result.detail.validation.lastTimeIso).toBe("");
  });

  it("exposes lastTimeIso from latestValidation.executedAt", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        latestValidation: {
          ...MOCK_VALIDATION,
          executedAt: "2026-04-01T00:00:00.000Z",
        },
      }),
    )!;
    expect(result.detail.validation.lastTimeIso).toBe(
      "2026-04-01T00:00:00.000Z",
    );
  });

  it("handles missing latestSubmission gracefully", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ latestSubmission: null }),
    )!;
    expect(result).not.toBeNull();
  });

  it("handles missing latestReview gracefully", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ latestReview: null }),
    )!;
    expect(result.detail.risk.reviewStatus).toBe("");
  });

  it("handles empty documentProgressByProvider", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ documentProgressByProvider: [] }),
    )!;
    expect(result.detail.providerProgress).toEqual([]);
  });

  it("handles missing documentProgressByProvider key", () => {
    const agg = buildAggregate();
    delete (agg as Record<string, unknown>).documentProgressByProvider;
    const result = adaptCaseDetailAggregate(agg)!;
    expect(result.detail.providerProgress).toEqual([]);
  });
});

describe("S9 readonly state", () => {
  it("marks S9 as readonly with badge-gray", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, stage: "S9" } }),
    )!;
    expect(result.detail.readonly).toBe(true);
    expect(result.detail.statusBadge).toBe("badge-gray");
    expect(result.detail.stageCode).toBe("S9");
    expect(result.detail.stage).toBe("已归档");
  });

  it("marks non-S9 as not readonly with stage-specific badge", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.readonly).toBe(false);
    expect(result.detail.statusBadge).toMatch(/^badge-/);
  });

  it("defaults invalid stage to S1", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, stage: "INVALID" } }),
    )!;
    expect(result.detail.stageCode).toBe("S1");
  });

  it("defaults missing stage to S1", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({ case: { ...MOCK_CASE_ROW, stage: "" } }),
    )!;
    expect(result.detail.stageCode).toBe("S1");
  });
});

describe("provider progress", () => {
  it("adapts provider progress entries", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    const pp = result.detail.providerProgress;
    expect(pp).toHaveLength(2);
    expect(pp[0].labelKey).toBe("cases.detail.providers.applicant");
    expect(pp[0].done).toBe(3);
    expect(pp[1].labelKey).toBe("cases.detail.providers.office");
    expect(pp[1].done).toBe(3);
  });

  it("filters invalid provider progress entries", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        documentProgressByProvider: [
          { providerRole: "applicant", total: 5, done: 3 },
          null,
          "invalid",
          42,
        ],
      }),
    )!;
    expect(result.detail.providerProgress).toHaveLength(1);
    expect(result.detail.providerProgress[0].labelKey).toBe(
      "cases.detail.providers.applicant",
    );
  });
});

describe("risk block", () => {
  it("builds risk block with blocking issues", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        latestValidation: { ...MOCK_VALIDATION, blockingCount: 3 },
      }),
    )!;
    expect(result.detail.risk.blockingCount).toBe("3");
    expect(result.detail.risk.blockingDetail).toBe("");
    expect(result.detail.risk.blockingDetailLoc?.key).toBe(
      "cases.detail.overview.risk.blockingDetail",
    );
    expect(result.detail.risk.blockingDetailLoc?.params).toEqual({ count: 3 });
  });

  it("builds risk block with no blocking issues", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.risk.blockingCount).toBe("0");
    expect(result.detail.risk.blockingDetail).toBe("");
  });

  it("populates arrears status from billing", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.risk.arrearsStatus).toBe("cases.detail.arrearsYes");
    expect(result.detail.risk.arrearsDetail).toContain("50,000");
  });

  it("populates review status from latestReview", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.risk.reviewStatus).toBe("approved");
  });

  it("populates lastValidation status from latestValidation", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.risk.lastValidationLoc?.key).toBe(
      "cases.detail.overview.risk.lastValidation.passed",
    );
  });
});

describe("validation hint", () => {
  it("shows blocking and warning counts", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        latestValidation: {
          ...MOCK_VALIDATION,
          blockingCount: 2,
          warningCount: 3,
        },
      }),
    )!;
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.validationHintLoc?.key).toBe(
      "cases.detail.overview.validationHint.blockingWarning",
    );
    expect(result.detail.validationHintLoc?.params).toEqual({ b: 2, w: 3 });
  });

  it("shows only warnings when no blocking", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        latestValidation: {
          ...MOCK_VALIDATION,
          blockingCount: 0,
          warningCount: 5,
        },
      }),
    )!;
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.validationHintLoc?.key).toBe(
      "cases.detail.overview.validationHint.warningOnly",
    );
    expect(result.detail.validationHintLoc?.params).toEqual({ w: 5 });
  });

  it("shows empty when no issues", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        latestValidation: {
          ...MOCK_VALIDATION,
          blockingCount: 0,
          warningCount: 0,
        },
      }),
    )!;
    expect(result.detail.validationHint).toBe("");
  });
});

describe("billing risk confirmation", () => {
  it("builds risk confirmation when acknowledged", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        billing: {
          ...MOCK_BILLING,
          billingRiskAcknowledged: true,
          billingRiskAckReasonCode: "client_confirmed",
          billingRiskAcknowledgedAt: "2026-04-10T00:00:00.000Z",
        },
      }),
    )!;
    expect(result.detail.riskConfirmationRecord).not.toBeNull();
    expect(result.detail.riskConfirmationRecord?.reason).toBe(
      "client_confirmed",
    );
    expect(result.detail.riskConfirmationRecord?.time).not.toBe("");
  });

  it("returns null riskConfirmationRecord when not acknowledged", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.riskConfirmationRecord).toBeNull();
  });

  it("returns null riskConfirmationRecord when billing is null", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ billing: null }))!;
    expect(result.detail.riskConfirmationRecord).toBeNull();
  });
});

describe("slice field consumption contracts", () => {
  it("BILLING_SLICE_CONSUMED_FIELDS matches CaseBillingSummary", () => {
    expect(BILLING_SLICE_CONSUMED_FIELDS).toEqual([
      "quotePrice",
      "unpaidAmount",
      "depositPaid",
      "finalPaymentPaid",
      "billingRiskAcknowledged",
      "billingRiskAcknowledgedAt",
      "billingRiskAckReasonCode",
    ]);
  });

  it("LATEST_VALIDATION_SLICE_CONSUMED_FIELDS matches CaseLatestValidationSummary", () => {
    expect(LATEST_VALIDATION_SLICE_CONSUMED_FIELDS).toEqual([
      "status",
      "executedAt",
      "blockingCount",
      "warningCount",
    ]);
  });

  it("PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS matches CaseDocumentProgressByProvider", () => {
    expect(PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS).toEqual([
      "providerRole",
      "total",
      "done",
    ]);
  });

  it("adapter reads all billing slice consumed fields", () => {
    const billing: Record<string, unknown> = {};
    for (const f of BILLING_SLICE_CONSUMED_FIELDS) billing[f] = null;
    billing.quotePrice = 100000;
    billing.unpaidAmount = 20000;
    billing.depositPaid = true;
    billing.finalPaymentPaid = false;
    billing.billingRiskAcknowledged = false;
    const result = adaptCaseDetailAggregate(buildAggregate({ billing }))!;
    expect(result.detail.billingAmount).toBe("¥100,000");
    expect(result.detail.billing.outstanding).toContain("20,000");
    expect(result.detail.billingStatusKey).toBe("unpaid");
  });

  it("adapter reads all validation slice consumed fields", () => {
    const latestValidation: Record<string, unknown> = {};
    for (const f of LATEST_VALIDATION_SLICE_CONSUMED_FIELDS)
      latestValidation[f] = null;
    latestValidation.status = "failed";
    latestValidation.executedAt = "2026-04-15T00:00:00.000Z";
    latestValidation.blockingCount = 1;
    latestValidation.warningCount = 2;
    const result = adaptCaseDetailAggregate(
      buildAggregate({ latestValidation }),
    )!;
    expect(result.detail.risk.lastValidation).toBe("");
    expect(result.detail.risk.lastValidationLoc?.key).toBe(
      "cases.detail.overview.risk.lastValidation.failed",
    );
    expect(result.detail.validation.lastTime).not.toBe("");
    expect(result.detail.validationHint).toBe("");
    expect(result.detail.validationHintLoc?.key).toBe(
      "cases.detail.overview.validationHint.blockingWarning",
    );
    expect(result.detail.validationHintLoc?.params).toEqual({ b: 1, w: 2 });
  });

  it("adapter reads all provider progress entry consumed fields", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        documentProgressByProvider: [
          { providerRole: "employer", total: 8, done: 5 },
        ],
      }),
    )!;
    const pp = result.detail.providerProgress;
    expect(pp).toHaveLength(1);
    expect(pp[0].labelKey).toBe("cases.detail.providers.employer");
    expect(pp[0].done).toBe(5);
  });
});

describe("billing received computation", () => {
  it("computes received from totalReceived when present (CaseBillingSummaryFull)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        billing: { ...MOCK_BILLING, totalReceived: 250000 },
      }),
    )!;
    expect(result.detail.billing.received).toBe("¥250,000");
  });

  it("shows ¥0 received when totalReceived is absent (CaseBillingSummary)", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.billing.received).toBe("¥0");
  });

  it("shows ¥0 received when totalReceived is 0", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        billing: { ...MOCK_BILLING, totalReceived: 0 },
      }),
    )!;
    expect(result.detail.billing.received).toBe("¥0");
  });

  it("shows ¥0 received when billing is null", () => {
    const result = adaptCaseDetailAggregate(buildAggregate({ billing: null }))!;
    expect(result.detail.billing.received).toBe("¥0");
  });
});

describe("billing quotePrice edge cases", () => {
  it("handles quotePrice: null from server", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        billing: { ...MOCK_BILLING, quotePrice: null },
      }),
    )!;
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billing.total).toBe("—");
  });

  it("handles quotePrice: 0 from server", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate({
        billing: { ...MOCK_BILLING, quotePrice: 0 },
      }),
    )!;
    expect(result.detail.billingAmount).toBe("—");
    expect(result.detail.billing.total).toBe("—");
  });
});

describe("placeholder collections (tabs not yet populated)", () => {
  it("provides empty arrays for tab collections", () => {
    const result = adaptCaseDetailAggregate(buildAggregate())!;
    expect(result.detail.timeline).toEqual([]);
    expect(result.detail.relatedParties).toHaveLength(1);
    expect(result.detail.relatedParties[0].name).toBe("张伟");
    expect(result.detail.deadlines).toEqual([]);
    expect(result.detail.submissionPackages).toEqual([]);
    expect(result.detail.correctionPackage).toBeNull();
    expect(result.detail.doubleReview).toEqual([]);
    expect(result.detail.documents).toEqual([]);
    expect(result.detail.forms).toEqual({
      templates: [],
      generated: [],
    });
    expect(result.detail.tasks).toEqual([]);
    expect(result.detail.logEntries).toEqual([]);
    expect(result.detail.messages).toEqual([]);
  });
});
