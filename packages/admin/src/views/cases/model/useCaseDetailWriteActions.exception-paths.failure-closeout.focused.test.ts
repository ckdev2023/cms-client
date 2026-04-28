// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-02 — visa rejection / failure closeout focused tests.
// Covers: VISA_REJECTED adapter, failureCloseout adapter, and failureClose write action error paths.
// Does NOT test: supplement round, reminder failure/retry, or cross-action guards.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";

import { adaptCaseDetailAggregate } from "./CaseAdapterDetailAggregate";
import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import { createWriteActions } from "./useCaseDetailWriteActions";

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

function makeError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Error: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

const DEEP_LINK = {
  customerId: "cust-ex01",
  customerName: "例外テスト",
  groupId: "group-ex01",
  groupName: "Tokyo-E",
  ownerUserId: "user-ex01",
  ownerDisplayName: "担当者A",
  assistantUserId: null,
  assistantDisplayName: null,
};

const COUNTS = {
  documentItemsTotal: 10,
  documentItemsDone: 10,
  questionnaireItemsTotal: 3,
  questionnaireItemsDone: 3,
  caseParties: 2,
  tasks: 3,
  tasksPending: 0,
  communicationLogs: 5,
  submissionPackages: 1,
  generatedDocuments: 2,
  validationRuns: 1,
  reviewRecords: 1,
  billingRecords: 2,
  paymentRecords: 1,
};

function billingFixture(overrides: Record<string, unknown> = {}) {
  return {
    quotePrice: 500000,
    unpaidAmount: 0,
    totalReceived: 500000,
    depositPaid: true,
    finalPaymentPaid: true,
    billingRiskAcknowledged: false,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    ...overrides,
  };
}

function bmvCaseRow(
  stepCode: string,
  stage = "S5",
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "case-ex01",
    orgId: "org-1",
    customerId: "cust-ex01",
    caseTypeCode: "business_manager_visa",
    stage,
    groupId: "group-ex01",
    ownerUserId: "user-ex01",
    dueAt: "2026-10-01",
    caseName: "例外テスト案件",
    currentWorkflowStepCode: stepCode,
    visaPlan: "new_establishment",
    supplementCount: 0,
    ...overrides,
  };
}

function buildAggregate(
  stepCode: string,
  caseOverrides: Record<string, unknown> = {},
  extraOverrides: Record<string, unknown> = {},
) {
  return {
    case: bmvCaseRow(
      stepCode,
      (caseOverrides.stage as string) ?? "S5",
      caseOverrides,
    ),
    deepLink: DEEP_LINK,
    counts: COUNTS,
    billing: billingFixture(),
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    failureCloseoutCheck: null,
    ...extraOverrides,
  };
}

describe("VISA_REJECTED workflow step adapter (p1-qa-001-02)", () => {
  it("isFailureStep is true for VISA_REJECTED", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("VISA_REJECTED", { stage: "S9" }),
    )!;
    expect(result.detail.workflowStep).not.toBeNull();
    expect(result.detail.workflowStep!.isFailureStep).toBe(true);
    expect(result.detail.workflowStep!.stepCode).toBe("VISA_REJECTED");
    expect(result.detail.workflowStep!.parentStage).toBe("S9");
  });

  it("isFailureStep is false for APPROVED", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("APPROVED", { stage: "S6" }),
    )!;
    expect(result.detail.workflowStep!.isFailureStep).toBe(false);
  });

  it("readonly is true when stage is S9 (VISA_REJECTED)", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("VISA_REJECTED", { stage: "S9" }),
    )!;
    expect(result.detail.readonly).toBe(true);
  });
});

describe("failure closeout adapter (p1-qa-001-02)", () => {
  it("populated when failureCloseoutCheck.isFailurePath = true", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        { stage: "S9" },
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "VISA_REJECTED",
              reasonLabel: "海外拒签",
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
    expect(fc.reasonLabel).toBe("海外拒签");
    expect(fc.canDirectClose).toBe(true);
    expect(fc.closeReasonRequired).toBe(false);
  });

  it("null when isFailurePath is false", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "APPROVED",
        { stage: "S6" },
        { failureCloseoutCheck: { isFailurePath: false } },
      ),
    )!;
    expect(result.detail.failureCloseout).toBeNull();
  });

  it("null when failureCloseoutCheck is absent", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate("APPROVED", { stage: "S6" }),
    )!;
    expect(result.detail.failureCloseout).toBeNull();
  });

  it("closeReasonRequired = true for manual failure close", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "NEED_SUPPLEMENT",
        {},
        {
          failureCloseoutCheck: {
            isFailurePath: true,
            attribution: {
              reasonCode: "MANUAL_FAILURE_CLOSE",
              reasonLabel: "手動失敗結案",
              canDirectClose: false,
              closeReasonRequired: true,
            },
          },
        },
      ),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.closeReasonRequired).toBe(true);
    expect(fc.canDirectClose).toBe(false);
  });

  it("reasonCode null when attribution is absent", () => {
    const result = adaptCaseDetailAggregate(
      buildAggregate(
        "VISA_REJECTED",
        { stage: "S9" },
        { failureCloseoutCheck: { isFailurePath: true } },
      ),
    )!;
    const fc = result.detail.failureCloseout!;
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBeNull();
    expect(fc.reasonLabel).toBeNull();
  });
});

describe("failureClose write action error paths (p1-qa-001-02)", () => {
  it("failureClose calls transitionCase with S9 and closeReason", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-FAIL01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose("client_withdrawn");
    expect(ok).toBe(true);
    expect(transitionCase).toHaveBeenCalledWith("BMV-FAIL01", {
      toStage: "S9",
      closeReason: "client_withdrawn",
    });
  });

  it("failureClose without closeReason passes undefined", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.failureClose();
    expect(transitionCase).toHaveBeenCalledWith("c1", {
      toStage: "S9",
      closeReason: undefined,
    });
  });

  it("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED blocks with gate error", async () => {
    const err = makeError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED");
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
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

    const ok = await wa.failureClose();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.failureCloseoutAttributionRequired",
    );
  });

  it("CASE_S9_READONLY error is not a gate block", async () => {
    const err = makeError("CASE_S9_READONLY");
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
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

    const ok = await wa.failureClose("visa_rejected");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe("CASE_S9_READONLY");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.s9Readonly",
    );
  });

  it("CASE_TRANSITION_NOT_ALLOWED during failure close", async () => {
    const err = makeError("CASE_TRANSITION_NOT_ALLOWED");
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
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

    const ok = await wa.failureClose("visa_rejected");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_TRANSITION_NOT_ALLOWED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.transitionNotAllowed",
    );
  });

  it("failureClose blocked when readonly", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose("visa_rejected");
    expect(ok).toBe(false);
    expect(transitionCase).not.toHaveBeenCalled();
  });

  it("network error during failure close shows fallback i18n", async () => {
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
        throw new Error("Connection refused");
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose("visa_rejected");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBeNull();
    expect(wa.writeFeedback.value.errorMessage).toBe("Connection refused");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.unknown",
    );
  });
});
