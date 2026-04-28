// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-001-03 — BMV failure/button contract focused tests
//   Covers: failure closeout info and button availability semantics
//   derived from workflow + billing state.
// Does NOT test: P0 overview/header contracts, workflow step summary,
//   post-approval date mapping, non-BMV degradation, or write actions.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

const BMV_CASE_ROW = {
  id: "case-bmv01",
  orgId: "org-1",
  customerId: "cust-bmv01",
  caseTypeCode: "business_manager_visa",
  stage: "S5",
  groupId: "group-bmv01",
  ownerUserId: "user-bmv01",
  dueAt: "2026-10-01",
  caseName: "経営管理ビザ新規申請",
  caseNo: "CASE-BMV01",
  priority: "normal",
  riskLevel: "low",
  applicationType: "認定",
  acceptedAt: "2026-03-15T00:00:00.000Z",
  currentWorkflowStepCode: "UNDER_REVIEW",
  visaPlan: "new_establishment",
  supplementCount: 2,
  resultOutcome: null,
  postApprovalStage: null,
  coeIssuedAt: null,
  coeExpiryDate: null,
  coeSentAt: null,
  overseasVisaStartAt: null,
  entryConfirmedAt: null,
};

const BMV_DEEP_LINK = {
  customerId: "cust-bmv01",
  customerName: "張明",
  groupId: "group-bmv01",
  groupName: "Tokyo-C",
  ownerUserId: "user-bmv01",
  ownerDisplayName: "高橋太郎",
  assistantUserId: null,
  assistantDisplayName: null,
};

const BMV_COUNTS = {
  documentItemsTotal: 18,
  documentItemsDone: 10,
  questionnaireItemsTotal: 2,
  questionnaireItemsDone: 1,
  caseParties: 3,
  tasks: 5,
  tasksPending: 2,
  communicationLogs: 8,
  submissionPackages: 1,
  generatedDocuments: 4,
  validationRuns: 3,
  reviewRecords: 1,
  billingRecords: 4,
  paymentRecords: 2,
};

const BMV_BILLING = {
  quotePrice: 600000,
  unpaidAmount: 200000,
  totalReceived: 400000,
  depositPaid: true,
  finalPaymentPaid: false,
  billingRiskAcknowledged: false,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
};

const BMV_VALIDATION = {
  id: "vr-bmv01",
  status: "passed",
  executedAt: "2026-04-20T00:00:00.000Z",
  blockingCount: 0,
  warningCount: 1,
};

function buildBmvAggregate(overrides: Record<string, unknown> = {}) {
  return {
    case: BMV_CASE_ROW,
    deepLink: BMV_DEEP_LINK,
    counts: BMV_COUNTS,
    billing: BMV_BILLING,
    latestValidation: BMV_VALIDATION,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 10, done: 6 },
      { providerRole: "office", total: 8, done: 4 },
    ],
    failureCloseoutCheck: null,
    ...overrides,
  };
}

function buildBmvCaseRow(overrides: Record<string, unknown> = {}) {
  return { ...BMV_CASE_ROW, ...overrides };
}

describe("failure closeout info (p1-fe-001-03)", () => {
  it("null when failureCloseoutCheck is null", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    expect(result.detail.failureCloseout).toBeNull();
  });

  it("null when isFailurePath is false", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        failureCloseoutCheck: { isFailurePath: false, attribution: null },
      }),
    )!;
    expect(result.detail.failureCloseout).toBeNull();
  });

  it("populated when isFailurePath is true with attribution", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S9",
          currentWorkflowStepCode: "VISA_REJECTED",
        }),
        failureCloseoutCheck: {
          isFailurePath: true,
          attribution: {
            reasonCode: "VISA_REJECTED",
            reasonLabel: "签证拒否",
            canDirectClose: true,
            closeReasonRequired: false,
          },
        },
      }),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc).not.toBeNull();
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBe("VISA_REJECTED");
    expect(fc.reasonLabel).toBe("签证拒否");
    expect(fc.canDirectClose).toBe(true);
    expect(fc.closeReasonRequired).toBe(false);
  });

  it("populated with null attribution fields when attribution is null", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        failureCloseoutCheck: {
          isFailurePath: true,
          attribution: null,
        },
      }),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc).not.toBeNull();
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBeNull();
    expect(fc.reasonLabel).toBeNull();
    expect(fc.canDirectClose).toBe(false);
    expect(fc.closeReasonRequired).toBe(false);
  });

  it("closeReasonRequired=true when attribution says so", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        failureCloseoutCheck: {
          isFailurePath: true,
          attribution: {
            reasonCode: "MANUAL_FAILURE_CLOSE",
            reasonLabel: "手動失敗結案",
            canDirectClose: false,
            closeReasonRequired: true,
          },
        },
      }),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.canDirectClose).toBe(false);
    expect(fc.closeReasonRequired).toBe(true);
    expect(fc.reasonCode).toBe("MANUAL_FAILURE_CLOSE");
  });
});

describe("button availability — readonly gate (p1-fe-001-03)", () => {
  it("S9 stage sets readonly=true, blocking all edits", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S9",
          currentWorkflowStepCode: "VISA_REJECTED",
        }),
      }),
    )!;
    expect(result.detail.readonly).toBe(true);
  });

  it("non-S9 BMV case has readonly=false", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    expect(result.detail.readonly).toBe(false);
  });
});

describe("button availability — billing gate feedback (p1-fe-001-03)", () => {
  it("WAITING_PAYMENT step + unpaid > 0 → billingStatusKey=unpaid", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S7",
          currentWorkflowStepCode: "WAITING_PAYMENT",
        }),
        billing: { ...BMV_BILLING, unpaidAmount: 100000 },
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("WAITING_PAYMENT");
    expect(result.detail.billingStatusKey).toBe("unpaid");
    expect(result.detail.billingMeta).toContain("100,000");
  });

  it("COE_SENT step + unpaid > 0 → billingStatusKey=unpaid (UI can block)", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S7",
          currentWorkflowStepCode: "COE_SENT",
        }),
        billing: { ...BMV_BILLING, unpaidAmount: 150000 },
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("COE_SENT");
    expect(result.detail.billingStatusKey).toBe("unpaid");
  });

  it("COE_SENT step + fully paid → billingStatusKey=paid", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S7",
          currentWorkflowStepCode: "COE_SENT",
        }),
        billing: {
          ...BMV_BILLING,
          unpaidAmount: 0,
          finalPaymentPaid: true,
          totalReceived: 600000,
        },
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("COE_SENT");
    expect(result.detail.billingStatusKey).toBe("paid");
  });

  it("risk confirmation acknowledged → riskConfirmationRecord populated", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        billing: {
          ...BMV_BILLING,
          billingRiskAcknowledged: true,
          billingRiskAckReasonCode: "advance_agreement",
          billingRiskAcknowledgedAt: "2026-05-01T00:00:00.000Z",
        },
      }),
    )!;
    expect(result.detail.riskConfirmationRecord).not.toBeNull();
    expect(result.detail.riskConfirmationRecord!.reason).toBe(
      "advance_agreement",
    );
  });

  it("risk confirmation not acknowledged → riskConfirmationRecord null", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    expect(result.detail.riskConfirmationRecord).toBeNull();
  });
});

describe("button availability — failure closeout actions (p1-fe-001-03)", () => {
  it("VISA_REJECTED + canDirectClose=true → close button available", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        case: buildBmvCaseRow({
          stage: "S9",
          currentWorkflowStepCode: "VISA_REJECTED",
        }),
        failureCloseoutCheck: {
          isFailurePath: true,
          attribution: {
            reasonCode: "VISA_REJECTED",
            reasonLabel: "签证拒否",
            canDirectClose: true,
            closeReasonRequired: false,
          },
        },
      }),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.canDirectClose).toBe(true);
    expect(fc.closeReasonRequired).toBe(false);
  });

  it("manual failure + closeReasonRequired=true → reason input required", () => {
    const result = adaptCaseDetailAggregate(
      buildBmvAggregate({
        failureCloseoutCheck: {
          isFailurePath: true,
          attribution: {
            reasonCode: "CLIENT_WITHDRAWN",
            reasonLabel: "顧客取下げ",
            canDirectClose: false,
            closeReasonRequired: true,
          },
        },
      }),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.canDirectClose).toBe(false);
    expect(fc.closeReasonRequired).toBe(true);
  });

  it("non-failure path → no failure closeout actions", () => {
    const result = adaptCaseDetailAggregate(buildBmvAggregate())!;
    expect(result.detail.failureCloseout).toBeNull();
  });
});
