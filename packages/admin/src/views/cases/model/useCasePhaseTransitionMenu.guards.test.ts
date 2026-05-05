import { describe, it, expect, vi } from "vitest";
import { ref, type Ref } from "vue";
import type { CaseDetail } from "../types";
import type { CaseRepository } from "./CaseRepository";
import { useCasePhaseTransitionMenu } from "./useCasePhaseTransitionMenu";

function makeDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    id: "case-001",
    title: "Test Case",
    client: "Client",
    owner: "Owner",
    agency: "Agency",
    stage: "S8",
    stageCode: "S8",
    stageMeta: "",
    statusBadge: "badge-green",
    deadline: "",
    deadlineMeta: "",
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: "10/10",
    billingAmount: "¥600,000",
    billingMeta: "",
    billingStatusKey: "unpaid",
    docsCounter: "10/10",
    readonly: false,
    customerId: "cust-001",
    groupId: "group-001",
    groupName: "Group 1",
    caseType: "BMV",
    applicationType: "new",
    businessPhase: "SUCCESS",
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

function makeRepo(): CaseRepository {
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
  } as unknown as CaseRepository;
}

describe("useCasePhaseTransitionMenu — availableOptions with transitionGuards", () => {
  it("marks RESIDENCE_PERIOD_RECORDED as disabled when guard present", () => {
    const detail: Ref<CaseDetail | null> = ref(
      makeDetail({
        businessPhase: "SUCCESS",
        transitionGuards: {
          RESIDENCE_PERIOD_RECORDED: {
            key: "cases.detail.phaseMenu.guards.successCloseoutBlocked",
            params: { amount: "¥200,000" },
          },
        },
      }),
    );

    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: makeRepo(),
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    const opts = menu.availableOptions.value;
    expect(opts).toHaveLength(1);
    expect(opts[0].phase).toBe("RESIDENCE_PERIOD_RECORDED");
    expect(opts[0].disabled).toBe(true);
    expect(opts[0].disabledReasonLoc).toEqual({
      key: "cases.detail.phaseMenu.guards.successCloseoutBlocked",
      params: { amount: "¥200,000" },
    });
  });

  it("marks RESIDENCE_PERIOD_RECORDED as enabled when no guard (unpaid=0)", () => {
    const detail: Ref<CaseDetail | null> = ref(
      makeDetail({
        businessPhase: "SUCCESS",
        transitionGuards: {},
      }),
    );

    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: makeRepo(),
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    const opts = menu.availableOptions.value;
    expect(opts).toHaveLength(1);
    expect(opts[0].phase).toBe("RESIDENCE_PERIOD_RECORDED");
    expect(opts[0].disabled).toBe(false);
    expect(opts[0].disabledReasonLoc).toBeUndefined();
  });

  it("marks RESIDENCE_PERIOD_RECORDED as enabled when billingRiskAck=true", () => {
    const detail: Ref<CaseDetail | null> = ref(
      makeDetail({
        businessPhase: "SUCCESS",
        transitionGuards: {},
      }),
    );

    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: makeRepo(),
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    const opts = menu.availableOptions.value;
    expect(opts).toHaveLength(1);
    expect(opts[0].disabled).toBe(false);
  });

  it("returns empty options when detail is null", () => {
    const detail: Ref<CaseDetail | null> = ref(null);

    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: makeRepo(),
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    expect(menu.availableOptions.value).toEqual([]);
  });

  it("non-guarded targets remain enabled alongside guarded ones", () => {
    const detail: Ref<CaseDetail | null> = ref(
      makeDetail({
        businessPhase: "UNDER_REVIEW",
        transitionGuards: {
          APPROVED: {
            key: "some.guard.key",
            params: {},
          },
        },
      }),
    );

    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: makeRepo(),
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });

    const opts = menu.availableOptions.value;
    expect(opts).toHaveLength(4);
    expect(opts.find((o) => o.phase === "APPROVED")?.disabled).toBe(true);
    expect(opts.find((o) => o.phase === "REJECTED")?.disabled).toBe(false);
    expect(opts.find((o) => o.phase === "NEED_SUPPLEMENT")?.disabled).toBe(
      false,
    );
    expect(opts.find((o) => o.phase === "CLOSED_FAILED")?.disabled).toBe(false);
  });
});
