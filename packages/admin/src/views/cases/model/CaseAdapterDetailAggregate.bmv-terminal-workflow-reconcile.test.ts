// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-005 — BMV terminal businessPhase vs stale workflowStepCode
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";

const DEEP_LINK = {
  customerId: "cust-recon01",
  customerName: "Reconcile Test",
  groupId: "group-recon01",
  groupName: "Local",
  ownerUserId: "user-recon01",
  ownerDisplayName: "担当",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 8,
  documentItemsDone: 6,
  questionnaireItemsTotal: 2,
  questionnaireItemsDone: 2,
  caseParties: 1,
  tasks: 0,
  tasksPending: 0,
  communicationLogs: 1,
  submissionPackages: 0,
  generatedDocuments: 0,
  validationRuns: 0,
  reviewRecords: 0,
  billingRecords: 1,
  paymentRecords: 1,
};

function billingFixture() {
  return {
    quotePrice: 100000,
    unpaidAmount: 0,
    totalReceived: 100000,
    depositPaid: true,
    finalPaymentPaid: true,
    billingRiskAcknowledged: true,
    billingRiskAcknowledgedAt: "2026-05-01",
    billingRiskAckReasonCode: null,
  };
}

function bmvCaseRow(
  stepCode: string,
  stage: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id: "case-recon01",
    orgId: "org-1",
    customerId: "cust-recon01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-recon01",
    ownerUserId: "user-recon01",
    dueAt: "2026-10-01",
    caseName: "Reconcile",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    ...extra,
  };
}

function buildAggregate(
  stepCode: string,
  stage: string,
  extraCase: Record<string, unknown> = {},
  extraTop: Record<string, unknown> = {},
) {
  return {
    case: bmvCaseRow(stepCode, stage, extraCase),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: billingFixture(),
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...extraTop,
  };
}

describe("BMV terminal phase reconciles stale post-approval workflow step", () => {
  it("CLOSED_FAILED + stale COE_SENT + visa rejection → VISA_REJECTED", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "COE_SENT",
        "S9",
        {
          businessPhase: "CLOSED_FAILED",
          resultOutcome: "visa_rejected",
        },
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "VISA_REJECTED",
              reasonLabel: "签证拒否",
              canDirectClose: true,
              closeReasonRequired: false,
            },
          },
        },
      ),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("VISA_REJECTED");
    expect(result.detail.workflowStep!.isFailureStep).toBe(true);
    expect(
      result.detail.workflowStep!.workflowStepInactiveAtTerminalFailure,
    ).toBeUndefined();
  });

  it("CLOSED_FAILED + stale COE_SENT + CLIENT_WITHDRAWN → freeze display flag", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "COE_SENT",
        "S9",
        { businessPhase: "CLOSED_FAILED" },
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "CLIENT_WITHDRAWN",
              reasonLabel: "顧客取下げ",
              canDirectClose: false,
              closeReasonRequired: true,
            },
          },
        },
      ),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe("COE_SENT");
    expect(result.detail.workflowStep!.isFailureStep).toBe(false);
    expect(
      result.detail.workflowStep!.workflowStepInactiveAtTerminalFailure,
    ).toBe(true);
  });

  it("CLOSED_SUCCESS + stale COE_SENT → RENEWAL_REMINDER_SCHEDULED", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("COE_SENT", "S9", {
        businessPhase: "CLOSED_SUCCESS",
      }),
    )!;
    expect(result.detail.workflowStep!.stepCode).toBe(
      "RENEWAL_REMINDER_SCHEDULED",
    );
    expect(result.detail.workflowStep!.isFailureStep).toBe(false);
  });
});
