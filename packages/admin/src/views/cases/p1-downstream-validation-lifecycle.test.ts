// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-002-02 — P1 downstream validation degradation/smoke set.
// Covers: §12 non-BMV degradation and §13 full BMV lifecycle smoke.
// Does NOT test: blueprint stability, contract field sets, or individual panel/info builders.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";

import { adaptCaseDetailAggregate } from "./model/CaseAdapterDetailAggregate";

function canonicalBmvCaseRecord(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "case-p1-dv-001",
    stage: "S5",
    customerId: "cust-p1-001",
    caseName: "経営管理ビザ検証案件",
    caseNo: "P1-DV-001",
    caseTypeCode: "business-management",
    ownerUserId: "user-p1",
    groupId: "group-1",
    dueAt: "2026-08-01",
    currentWorkflowStepCode: "UNDER_REVIEW",
    visaPlan: "business-manager-1year",
    supplementCount: 0,
    resultOutcome: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    ...overrides,
  };
}

function canonicalBmvAggregateDto(
  caseOverrides: Record<string, unknown> = {},
  sliceOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    case: canonicalBmvCaseRecord(caseOverrides),
    deepLink: { customerId: "cust-p1-001", customerName: "P1検証太郎" },
    counts: { questionnaireItemsTotal: 3, questionnaireItemsDone: 2 },
    billing: { quotePrice: 500000, finalPaymentPaid: false },
    latestValidation: {
      status: "passed",
      executedAt: "2026-04-20T00:00:00.000Z",
      blockingCount: 0,
      warningCount: 1,
    },
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    currentResidencePeriod: null,
    successCloseoutCheck: null,
    ...sliceOverrides,
  };
}

function canonicalResidencePeriod(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "rp-001",
    visaType: "business-management",
    statusOfResidence: "経営・管理",
    periodYears: 1,
    periodLabel: "1年",
    validFrom: "2026-01-15",
    validUntil: "2027-01-15",
    cardNumber: "AB12345678CD",
    entryDate: "2026-01-15",
    reminderCreated: true,
    reminderError: null,
    reminderLastAttemptAt: null,
    reminderAttemptCount: 0,
    ...overrides,
  };
}

function canonicalSuccessCloseoutCheck(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    allSatisfied: true,
    preconditions: [
      { code: "ENTRY_CONFIRMED", label: "入境確認済み", satisfied: true },
      {
        code: "RESIDENCE_PERIOD_RECORDED",
        label: "在留期間登録済み",
        satisfied: true,
      },
      {
        code: "RENEWAL_REMINDER_SCHEDULED",
        label: "更新リマインダー設定済み",
        satisfied: true,
      },
    ],
    ...overrides,
  };
}

describe("§12 non-BMV degradation (p1-qa-002-02)", () => {
  it("case without workflowStep or visaPlan returns null for all P1 fields", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: null,
        visaPlan: null,
      }),
    );
    expect(result).not.toBeNull();
    const d = result!.detail;
    expect(d.workflowStep).toBeNull();
    expect(d.surveyStatus).toBeNull();
    expect(d.quoteStatus).toBeNull();
    expect(d.preSignGate).toBeNull();
    expect(d.finalPaymentGate).toBeNull();
    expect(d.supplementRound).toBeNull();
    expect(d.reminderFailure).toBeNull();
    expect(d.failureCloseout).toBeNull();
  });

  it("non-BMV still populates P0 header fields", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: null,
        visaPlan: null,
      }),
    );
    expect(result!.detail.id).toBe("case-p1-dv-001");
    expect(result!.detail.client).toBe("P1検証太郎");
    expect(result!.detail.stageCode).toBe("S5");
  });

  it("residence/reminder fields are independent of BMV flag", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: null, visaPlan: null },
        { currentResidencePeriod: canonicalResidencePeriod() },
      ),
    );
    expect(result!.detail.residencePeriod).not.toBeNull();
    expect(result!.detail.reminderSchedule).not.toBeNull();
  });

  it("successCloseout is independent of BMV flag", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: null, visaPlan: null },
        { successCloseoutCheck: canonicalSuccessCloseoutCheck() },
      ),
    );
    expect(result!.detail.successCloseout).not.toBeNull();
  });
});

describe("§13 full BMV lifecycle smoke (p1-qa-002-02)", () => {
  it("early stage (WAITING_MATERIAL): survey in progress, no COE gate", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: "WAITING_MATERIAL",
        stage: "S2",
      }),
    );
    const d = result!.detail;
    expect(d.workflowStep!.stepCode).toBe("WAITING_MATERIAL");
    expect(d.workflowStep!.parentStage).toBe("S2");
    expect(d.surveyStatus).not.toBeNull();
    expect(d.finalPaymentGate).toBeNull();
    expect(d.supplementRound).toBeNull();
    expect(d.successCloseout).toBeNull();
  });

  it("supplement stage (NEED_SUPPLEMENT): supplement round active", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: "NEED_SUPPLEMENT",
        supplementCount: 1,
        lastSupplementNoticeDate: "2026-04-10",
        lastSupplementReason: "不備あり",
      }),
    );
    const d = result!.detail;
    expect(d.workflowStep!.stepCode).toBe("NEED_SUPPLEMENT");
    expect(d.supplementRound).not.toBeNull();
    expect(d.supplementRound!.round).toBe(1);
    expect(d.supplementRound!.canResubmit).toBe(true);
  });

  it("post-approval (APPROVED): COE gate appears", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto({
        currentWorkflowStepCode: "APPROVED",
        stage: "S6",
      }),
    );
    expect(result!.detail.finalPaymentGate).not.toBeNull();
  });

  it("entry success (S8): success closeout + residence period", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "ENTRY_SUCCESS", stage: "S8" },
        {
          currentResidencePeriod: canonicalResidencePeriod(),
          successCloseoutCheck: canonicalSuccessCloseoutCheck(),
        },
      ),
    );
    const d = result!.detail;
    expect(d.workflowStep!.stepCode).toBe("ENTRY_SUCCESS");
    expect(d.residencePeriod).not.toBeNull();
    expect(d.reminderSchedule).not.toBeNull();
    expect(d.successCloseout).not.toBeNull();
    expect(d.successCloseout!.allSatisfied).toBe(true);
    expect(d.reminderFailure).toBeNull();
  });

  it("failure path (VISA_REJECTED): failure closeout active", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "VISA_REJECTED", stage: "S9" },
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
    );
    const d = result!.detail;
    expect(d.workflowStep!.isFailureStep).toBe(true);
    expect(d.failureCloseout).not.toBeNull();
    expect(d.failureCloseout!.reasonCode).toBe("VISA_REJECTED");
    expect(d.readonly).toBe(true);
  });

  it("reminder failure path: banner data present", () => {
    const result = adaptCaseDetailAggregate(
      canonicalBmvAggregateDto(
        { currentWorkflowStepCode: "ENTRY_SUCCESS", stage: "S8" },
        {
          currentResidencePeriod: canonicalResidencePeriod({
            reminderCreated: false,
            reminderError: "Service unavailable",
            reminderAttemptCount: 2,
          }),
        },
      ),
    );
    const d = result!.detail;
    expect(d.reminderFailure).not.toBeNull();
    expect(d.reminderFailure!.reason).toBe("Service unavailable");
    expect(d.reminderFailure!.attemptCount).toBe(2);
    expect(d.reminderFailure!.canRetry).toBe(true);
  });
});
