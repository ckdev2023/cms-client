// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-005-03 — BMV failure closeout derivation focused tests.
// Covers: failureCloseout adapter derivation and error classification.
// Does NOT test: failureClose write-action lifecycle, reminder retry, or supplement path UI.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import {
  isGateBlockError,
  resolveWriteErrorI18nKey,
} from "./CaseWriteErrorMapping";

const DEEP_LINK = {
  customerId: "cust-fail01",
  customerName: "失敗パステスト",
  groupId: "group-fail01",
  groupName: "Tokyo-F",
  ownerUserId: "user-fail01",
  ownerDisplayName: "担当者F",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 12,
  documentItemsDone: 10,
  questionnaireItemsTotal: 2,
  questionnaireItemsDone: 2,
  caseParties: 2,
  tasks: 4,
  tasksPending: 1,
  communicationLogs: 6,
  submissionPackages: 1,
  generatedDocuments: 3,
  validationRuns: 2,
  reviewRecords: 1,
  billingRecords: 3,
  paymentRecords: 2,
};

function billingFixture(overrides: Record<string, unknown> = {}) {
  return {
    quotePrice: 600000,
    unpaidAmount: 200000,
    totalReceived: 400000,
    depositPaid: true,
    finalPaymentPaid: false,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    ...overrides,
  };
}

function bmvCaseRow(
  stepCode: string,
  stage = "S5",
  extra: Record<string, unknown> = {},
) {
  return {
    id: "case-fail01",
    orgId: "org-1",
    customerId: "cust-fail01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-fail01",
    ownerUserId: "user-fail01",
    dueAt: "2026-10-01",
    caseName: "失敗パステスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    ...extra,
  };
}

function buildAggregate(
  stepCode: string,
  stage = "S5",
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

describe("visa rejection — failureCloseout derivation (p1-fe-005-03)", () => {
  it("failureCloseout populated when failureCloseoutCheck.isFailurePath=true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        "S9",
        {},
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
    const fc = result.detail.failureCloseout!;
    expect(fc).not.toBeNull();
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBe("VISA_REJECTED");
    expect(fc.reasonLabel).toBe("签证拒否");
    expect(fc.canDirectClose).toBe(true);
    expect(fc.closeReasonRequired).toBe(false);
  });

  it("workflowStep is marked as failure step", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        "S9",
        {},
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
    const ws = result.detail.workflowStep!;
    expect(ws).not.toBeNull();
    expect(ws.stepCode).toBe("VISA_REJECTED");
    expect(ws.isFailureStep).toBe(true);
    expect(ws.parentStage).toBe("S9");
    expect(ws.sortOrder).toBe(13);
  });

  it("S9 sets readonly=true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("VISA_REJECTED", "S9"),
    )!;
    expect(result.detail.readonly).toBe(true);
  });

  it("APPLICATION_REJECTED reason with closeReasonRequired=true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        "S9",
        {},
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "APPLICATION_REJECTED",
              reasonLabel: "申請不許可",
              canDirectClose: false,
              closeReasonRequired: true,
            },
          },
        },
      ),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.reasonCode).toBe("APPLICATION_REJECTED");
    expect(fc.canDirectClose).toBe(false);
    expect(fc.closeReasonRequired).toBe(true);
  });

  it("CLIENT_WITHDRAWN reason maps correctly", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "UNDER_REVIEW",
        "S5",
        {},
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
    const fc = result.detail.failureCloseout!;
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBe("CLIENT_WITHDRAWN");
    expect(fc.reasonLabel).toBe("顧客取下げ");
  });

  it("null attribution → reasonCode and reasonLabel are null, canDirectClose=false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        "S9",
        {},
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: null,
          },
        },
      ),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBeNull();
    expect(fc.reasonLabel).toBeNull();
    expect(fc.canDirectClose).toBe(false);
    expect(fc.closeReasonRequired).toBe(false);
  });

  it("null when failureCloseoutCheck is null", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("UNDER_REVIEW", "S5"),
    )!;
    expect(result.detail.failureCloseout).toBeNull();
  });

  it("null when isFailurePath is false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "UNDER_REVIEW",
        "S5",
        {},
        {
          failureCloseoutCheck: { isFailurePath: false, attribution: null },
        },
      ),
    )!;
    expect(result.detail.failureCloseout).toBeNull();
  });
});

describe("failure path error classification (p1-fe-005-03)", () => {
  it("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED is a gate block", () => {
    expect(isGateBlockError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED")).toBe(
      true,
    );
    expect(
      resolveWriteErrorI18nKey("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED"),
    ).toBe("cases.writeErrors.failureCloseoutAttributionRequired");
  });

  it("CASE_SUCCESS_CLOSEOUT_BLOCKED is a gate block", () => {
    expect(isGateBlockError("CASE_SUCCESS_CLOSEOUT_BLOCKED")).toBe(true);
    expect(resolveWriteErrorI18nKey("CASE_SUCCESS_CLOSEOUT_BLOCKED")).toBe(
      "cases.writeErrors.successCloseoutBlocked",
    );
  });

  it("CASE_REMINDER_CREATION_FAILED is NOT a gate block", () => {
    expect(isGateBlockError("CASE_REMINDER_CREATION_FAILED")).toBe(false);
    expect(resolveWriteErrorI18nKey("CASE_REMINDER_CREATION_FAILED")).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
  });

  it("CASE_S9_READONLY is NOT a gate block", () => {
    expect(isGateBlockError("CASE_S9_READONLY")).toBe(false);
  });

  it("undefined code resolves to unknown", () => {
    expect(resolveWriteErrorI18nKey(undefined)).toBe(
      "cases.writeErrors.unknown",
    );
    expect(isGateBlockError(undefined)).toBe(false);
  });
});
