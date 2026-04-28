// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-005-03 — BMV reminder failure focused tests.
// Covers: reminderFailure adapter derivation, closeout blocking narrative, and retryReminderCreation write action.
// Does NOT test: failureClose action lifecycle or supplement path UI.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";

import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import { createWriteActions } from "./useCaseDetailWriteActions";

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

function stubRepo(overrides: Partial<CaseRepository> = {}): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn(() => []),
    getDetail: vi.fn(async () => null),
    getDetailAggregate: vi.fn(async () => null),
    createCase: vi.fn(async () => ({ id: "c1", success: true })),
    updateCase: vi.fn(async () => ({ id: "c1", success: true })),
    transitionCase: vi.fn(async () => ({ id: "c1", success: true })),
    acknowledgeBillingRisk: vi.fn(async () => ({ id: "c1", success: true })),
    updatePostApprovalStage: vi.fn(async () => ({ id: "c1", success: true })),
    transitionWorkflowStep: vi.fn(async () => ({ id: "c1", success: true })),
    deleteCase: vi.fn(async () => undefined),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
    getDocumentItems: vi.fn(async () => []),
    getGeneratedDocuments: vi.fn(async () => ({
      templates: [],
      generated: [],
    })),
    getValidationData: vi.fn(async () => ({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    })),
    getBillingData: vi.fn(async () => ({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    })),
    getSubmissionPackages: vi.fn(async () => []),
    getDoubleReviewEntries: vi.fn(async () => []),
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
    createCaseParty: vi.fn(async () => ({ id: "cp1", success: true })),
    retryReminderCreation: vi.fn(async () => ({ id: "c1", success: true })),
    ...overrides,
  } as unknown as CaseRepository;
}

describe("reminder failure adapter (p1-fe-005-03)", () => {
  it("populated when reminderCreated=false and reminderError present", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        "S8",
        {},
        {
          currentResidencePeriod: {
            id: "rp-fail01",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            periodLabel: "5年",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            cardNumber: "AB12345678CD",
            entryDate: "2026-01-20",
            reminderCreated: false,
            reminderError: "SMTP connection refused",
            reminderLastAttemptAt: "2026-04-25T10:00:00.000Z",
            reminderAttemptCount: 3,
          },
        },
      ),
    )!;
    const rf = result.detail.reminderFailure!;
    expect(rf).not.toBeNull();
    expect(rf.reason).toBe("SMTP connection refused");
    expect(rf.attemptCount).toBe(3);
    expect(rf.lastAttemptDate).toContain("2026");
    expect(rf.canRetry).toBe(true);
  });

  it("canRetry false when case is readonly (S9)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        "S9",
        {},
        {
          currentResidencePeriod: {
            id: "rp-fail02",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: false,
            reminderError: "API error",
            reminderLastAttemptAt: "2026-04-20T10:00:00.000Z",
            reminderAttemptCount: 2,
          },
        },
      ),
    )!;
    const rf = result.detail.reminderFailure!;
    expect(rf).not.toBeNull();
    expect(rf.canRetry).toBe(false);
  });

  it("null when reminderCreated=true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        "S8",
        {},
        {
          currentResidencePeriod: {
            id: "rp-ok01",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: true,
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null when no reminderError (even if reminderCreated=false)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        "S8",
        {},
        {
          currentResidencePeriod: {
            id: "rp-noerr",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: false,
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null when currentResidencePeriod is absent", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("ENTRY_SUCCESS", "S8"),
    )!;
    expect(result.detail.reminderFailure).toBeNull();
  });

  it("null on non-BMV case", () => {
    const result = adaptCaseDetailAggregate({
      case: {
        id: "case-nonbmv",
        stage: "S8",
        caseTypeCode: "general_visa",
        ownerUserId: "user-01",
      },
      deepLink: null,
      counts: null,
      billing: null,
      latestValidation: null,
      latestSubmission: null,
      latestReview: null,
      documentProgressByProvider: [],
      failureCloseoutCheck: null,
      currentResidencePeriod: {
        id: "rp-nonbmv",
        validUntil: "2031-01-15",
        reminderCreated: false,
        reminderError: "some error",
        reminderAttemptCount: 1,
      },
    })!;
    expect(result.detail.reminderFailure).toBeNull();
  });
});

describe("reminder failure blocks success closeout (p1-fe-005-03)", () => {
  it("successCloseout.allSatisfied=false when RENEWAL_REMINDER_SCHEDULED unsatisfied due to reminder failure", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        "S8",
        {},
        {
          currentResidencePeriod: {
            id: "rp-rfail",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: false,
            reminderError: "Timeout",
            reminderAttemptCount: 2,
          },
          successCloseoutCheck: {
            allSatisfied: false,
            preconditions: [
              {
                code: "ENTRY_CONFIRMED",
                label: "入境已確認",
                satisfied: true,
              },
              {
                code: "RESIDENCE_PERIOD_RECORDED",
                label: "在留期間已録入",
                satisfied: true,
              },
              {
                code: "RENEWAL_REMINDER_SCHEDULED",
                label: "续签提醒已設定",
                satisfied: false,
              },
            ],
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).not.toBeNull();
    expect(result.detail.successCloseout).not.toBeNull();
    expect(result.detail.successCloseout!.allSatisfied).toBe(false);
    const unsatisfied = result.detail.successCloseout!.preconditions.filter(
      (p) => !p.satisfied,
    );
    expect(unsatisfied).toHaveLength(1);
    expect(unsatisfied[0].code).toBe("RENEWAL_REMINDER_SCHEDULED");
  });

  it("both reminderFailure and successCloseout coexist when reminder failed", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "ENTRY_SUCCESS",
        "S8",
        {},
        {
          currentResidencePeriod: {
            id: "rp-both",
            statusOfResidence: "経営管理",
            visaType: "business_manager",
            validFrom: "2026-01-15",
            validUntil: "2031-01-15",
            reminderCreated: false,
            reminderError: "Connection reset",
            reminderAttemptCount: 1,
          },
          successCloseoutCheck: {
            allSatisfied: false,
            preconditions: [
              {
                code: "ENTRY_CONFIRMED",
                label: "入境已確認",
                satisfied: true,
              },
              {
                code: "RESIDENCE_PERIOD_RECORDED",
                label: "在留期間已録入",
                satisfied: true,
              },
              {
                code: "RENEWAL_REMINDER_SCHEDULED",
                label: "续签提醒已設定",
                satisfied: false,
              },
            ],
          },
        },
      ),
    )!;
    expect(result.detail.reminderFailure).not.toBeNull();
    expect(result.detail.reminderFailure!.reason).toBe("Connection reset");
    expect(result.detail.successCloseout).not.toBeNull();
    expect(result.detail.successCloseout!.allSatisfied).toBe(false);
  });
});

describe("retryReminderCreation write action (p1-fe-005-03)", () => {
  it("calls repo.retryReminderCreation with correct case id", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "case-fail01",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "case-fail01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(true);
    expect(retryReminderCreation).toHaveBeenCalledWith("case-fail01");
  });

  it("error feedback on CASE_REMINDER_CREATION_FAILED", async () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "Reminder creation failed",
      status: 400,
      serverErrorCode: "CASE_REMINDER_CREATION_FAILED",
    });
    const repo = stubRepo({
      retryReminderCreation: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_REMINDER_CREATION_FAILED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
  });

  it("readonly guard blocks retry", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(false);
    expect(retryReminderCreation).not.toHaveBeenCalled();
  });
});
