import { describe, it, expect, vi } from "vitest";
import { ref, type Ref } from "vue";
import type { CaseDetail } from "../types";
import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import {
  useCasePhaseTransitionMenu,
  extractErrorCode,
} from "./useCasePhaseTransitionMenu";

function makeDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    id: "case-001",
    title: "Test Case",
    client: "Client",
    owner: "Owner",
    agency: "Agency",
    stage: "S6",
    stageCode: "S6",
    stageMeta: "",
    statusBadge: "badge-blue",
    deadline: "",
    deadlineMeta: "",
    deadlineDanger: false,
    progressPercent: 50,
    progressCount: "5/10",
    billingAmount: "¥100,000",
    billingMeta: "",
    billingStatusKey: "partial",
    docsCounter: "5/10",
    readonly: false,
    customerId: "cust-001",
    groupId: "group-001",
    groupName: "Group 1",
    caseType: "BMV",
    applicationType: "new",
    businessPhase: "UNDER_REVIEW",
    acceptedDate: "2026-01-01",
    targetDate: "2026-06-01",
    providerProgress: [],
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      arrearsStatus: "",
      arrearsDetail: "",
      deadlineAlert: "",
      deadlineAlertDetail: "",
      lastValidation: "",
      reviewStatus: "",
    },
    nextAction: "",
    validationHint: "",
    overviewActions: {
      primary: { label: "docs", tab: "documents" },
      secondary: { label: "validation", tab: "validation" },
    },
    timeline: [],
    team: [],
    relatedParties: [],
    deadlines: [],
    billing: { total: "¥0", received: "¥0", outstanding: "¥0", payments: [] },
    validation: { lastTime: "", blocking: [], warnings: [], info: [] },
    submissionPackages: [],
    correctionPackage: null,
    doubleReview: [],
    reviewEnabled: false,
    riskConfirmationRecord: null,
    documents: [],
    forms: { templates: [], generated: [] },
    tasks: [],
    logEntries: [],
    messages: [],
    ...overrides,
  };
}

function makeRepo(overrides: Partial<CaseRepository> = {}): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn(),
    getDetail: vi.fn(),
    getDetailAggregate: vi.fn(),
    createCase: vi.fn(),
    updateCase: vi.fn(),
    transitionCase: vi.fn(),
    acknowledgeBillingRisk: vi.fn(),
    updatePostApprovalStage: vi.fn(),
    transitionWorkflowStep: vi.fn(),
    transitionPhase: vi.fn().mockResolvedValue({ id: "case-001" }),
    deleteCase: vi.fn(),
    getMessages: vi.fn(),
    getLogEntries: vi.fn(),
    getDocumentItems: vi.fn(),
    getGeneratedDocuments: vi.fn(),
    getValidationData: vi.fn(),
    getBillingData: vi.fn(),
    getBillingTabAggregate: vi.fn(),
    getSubmissionPackages: vi.fn(),
    getDoubleReviewEntries: vi.fn(),
    getTasks: vi.fn(),
    getDeadlines: vi.fn(),
    createCaseParty: vi.fn(),
    retryReminderCreation: vi.fn(),
    ...overrides,
  } as unknown as CaseRepository;
}

const PHASE_ERROR_CODES = [
  "CASE_POST_APPROVAL_BILLING_BLOCKED",
  "CASE_CLOSE_REASON_REQUIRED",
  "CASE_TRANSITION_NOT_ALLOWED",
  "CASE_TRANSITION_CONFLICT",
  "CASE_GATE_C_BILLING_RISK_UNACKNOWLEDGED",
  "CASE_BILLING_RISK_ACK_FAILED",
  "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED",
  "CASE_S9_READONLY",
  "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
  "CASE_WAITING_PAYMENT_BILLING_REQUIRED",
] as const;

describe("extractErrorCode", () => {
  it("extracts serverErrorCode from CaseRepositoryError", () => {
    const err = new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "Transition not allowed",
      status: 400,
      serverErrorCode: "CASE_TRANSITION_NOT_ALLOWED",
    });
    expect(extractErrorCode(err)).toEqual({
      code: "CASE_TRANSITION_NOT_ALLOWED",
      raw: "Transition not allowed",
    });
  });

  it("returns null code when CaseRepositoryError has no serverErrorCode", () => {
    const err = new CaseRepositoryError({
      code: "NETWORK",
      message: "Case request failed",
    });
    expect(extractErrorCode(err)).toEqual({
      code: null,
      raw: "Case request failed",
    });
  });

  it("returns null code for plain Error", () => {
    const err = new Error("Something went wrong");
    expect(extractErrorCode(err)).toEqual({
      code: null,
      raw: "Something went wrong",
    });
  });

  it("returns null code for non-Error throw", () => {
    expect(extractErrorCode("string error")).toEqual({
      code: null,
      raw: "string error",
    });
  });

  it.each(PHASE_ERROR_CODES)(
    "extracts %s from CaseRepositoryError",
    (errorCode) => {
      const err = new CaseRepositoryError({
        code: "CASE_WRITE_ERROR",
        message: `Error: ${errorCode}`,
        status: 400,
        serverErrorCode: errorCode,
      });
      const result = extractErrorCode(err);
      expect(result.code).toBe(errorCode);
      expect(result.raw).toBe(`Error: ${errorCode}`);
    },
  );
});

describe("useCasePhaseTransitionMenu — errorCode propagation", () => {
  it("sets errorCode when CaseRepositoryError has serverErrorCode", async () => {
    const failRepo = makeRepo({
      transitionPhase: vi.fn().mockRejectedValue(
        new CaseRepositoryError({
          code: "CASE_WRITE_ERROR",
          message: "Billing blocked",
          status: 400,
          serverErrorCode: "CASE_POST_APPROVAL_BILLING_BLOCKED",
        }),
      ),
    });
    const detail = ref<CaseDetail | null>(
      makeDetail(),
    ) as Ref<CaseDetail | null>;
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: failRepo,
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    await menu.performTransition("APPROVED");
    expect(menu.errorCode.value).toBe("CASE_POST_APPROVAL_BILLING_BLOCKED");
    expect(menu.errorMessage.value).toBe("Billing blocked");
  });

  it("sets errorCode to null for plain Error", async () => {
    const failRepo = makeRepo({
      transitionPhase: vi.fn().mockRejectedValue(new Error("Network timeout")),
    });
    const detail = ref<CaseDetail | null>(
      makeDetail(),
    ) as Ref<CaseDetail | null>;
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: failRepo,
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    await menu.performTransition("APPROVED");
    expect(menu.errorCode.value).toBeNull();
    expect(menu.errorMessage.value).toBe("Network timeout");
  });

  it("clears errorCode on openMenu", async () => {
    const failRepo = makeRepo({
      transitionPhase: vi.fn().mockRejectedValue(
        new CaseRepositoryError({
          code: "CASE_WRITE_ERROR",
          message: "fail",
          status: 400,
          serverErrorCode: "CASE_S9_READONLY",
        }),
      ),
    });
    const detail = ref<CaseDetail | null>(
      makeDetail(),
    ) as Ref<CaseDetail | null>;
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: failRepo,
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    await menu.performTransition("APPROVED");
    expect(menu.errorCode.value).toBe("CASE_S9_READONLY");

    menu.openMenu();
    expect(menu.errorCode.value).toBeNull();
    expect(menu.errorMessage.value).toBeNull();
  });

  it("clears errorCode on successful transition", async () => {
    let shouldFail = true;
    const repo = makeRepo({
      transitionPhase: vi.fn().mockImplementation(async () => {
        if (shouldFail) {
          throw new CaseRepositoryError({
            code: "CASE_WRITE_ERROR",
            message: "conflict",
            status: 409,
            serverErrorCode: "CASE_TRANSITION_CONFLICT",
          });
        }
        return { id: "case-001" };
      }),
    });
    const detail = ref<CaseDetail | null>(
      makeDetail(),
    ) as Ref<CaseDetail | null>;
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    await menu.performTransition("APPROVED");
    expect(menu.errorCode.value).toBe("CASE_TRANSITION_CONFLICT");

    shouldFail = false;
    await menu.performTransition("APPROVED");
    expect(menu.errorCode.value).toBeNull();
    expect(menu.errorMessage.value).toBeNull();
  });
});

function getErrorKeys(msgs: Record<string, unknown>): Record<string, string> {
  const detail = msgs.detail as Record<string, unknown>;
  const phaseMenu = detail.phaseMenu as Record<string, unknown>;
  return phaseMenu.errors as Record<string, string>;
}

describe("i18n keys — all 9 error codes have three-language translations", () => {
  it.each(PHASE_ERROR_CODES)(
    "%s → zh-CN key exists and is non-empty",
    async (code) => {
      const { default: msgs } =
        await import("../../../i18n/messages/cases/zh-CN");
      expect(getErrorKeys(msgs)[code]).toBeTruthy();
    },
  );

  it.each(PHASE_ERROR_CODES)(
    "%s → en-US key exists and is non-empty",
    async (code) => {
      const { default: msgs } =
        await import("../../../i18n/messages/cases/en-US");
      expect(getErrorKeys(msgs)[code]).toBeTruthy();
    },
  );

  it.each(PHASE_ERROR_CODES)(
    "%s → ja-JP key exists and is non-empty",
    async (code) => {
      const { default: msgs } =
        await import("../../../i18n/messages/cases/ja-JP");
      expect(getErrorKeys(msgs)[code]).toBeTruthy();
    },
  );
});
