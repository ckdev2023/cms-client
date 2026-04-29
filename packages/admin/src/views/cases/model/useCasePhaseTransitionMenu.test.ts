import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref, type Ref } from "vue";
import type { CaseDetail } from "../types";
import type { CaseRepository } from "./CaseRepository";
import {
  useCasePhaseTransitionMenu,
  getAvailablePhaseTargets,
  isTerminalPhase,
  isValidBusinessPhase,
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

describe("getAvailablePhaseTargets", () => {
  it("returns valid targets for UNDER_REVIEW", () => {
    expect(getAvailablePhaseTargets("UNDER_REVIEW")).toEqual([
      "APPROVED",
      "REJECTED",
      "NEED_SUPPLEMENT",
    ]);
  });

  it("returns empty array for terminal phases", () => {
    expect(getAvailablePhaseTargets("CLOSED_SUCCESS")).toEqual([]);
    expect(getAvailablePhaseTargets("CLOSED_FAILED")).toEqual([]);
  });

  it("returns empty array for unknown phase", () => {
    expect(getAvailablePhaseTargets("UNKNOWN_PHASE")).toEqual([]);
  });
});

describe("isTerminalPhase", () => {
  it("returns true for CLOSED_SUCCESS", () => {
    expect(isTerminalPhase("CLOSED_SUCCESS")).toBe(true);
  });
  it("returns true for CLOSED_FAILED", () => {
    expect(isTerminalPhase("CLOSED_FAILED")).toBe(true);
  });
  it("returns false for UNDER_REVIEW", () => {
    expect(isTerminalPhase("UNDER_REVIEW")).toBe(false);
  });
});

describe("isValidBusinessPhase", () => {
  it("returns true for known phases", () => {
    expect(isValidBusinessPhase("CONSULTING")).toBe(true);
    expect(isValidBusinessPhase("CLOSED_SUCCESS")).toBe(true);
  });
  it("returns false for unknown strings", () => {
    expect(isValidBusinessPhase("NOT_A_PHASE")).toBe(false);
  });
});

describe("useCasePhaseTransitionMenu", () => {
  let repo: CaseRepository;
  let detail: Ref<CaseDetail | null>;
  let onSuccess: () => Promise<void>;

  beforeEach(() => {
    repo = makeRepo();
    detail = ref<CaseDetail | null>(makeDetail()) as Ref<CaseDetail | null>;
    onSuccess = vi.fn().mockResolvedValue(undefined) as () => Promise<void>;
  });

  it("computes availableTargets from current business phase", () => {
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess,
    });
    expect(menu.availableTargets.value).toEqual([
      "APPROVED",
      "REJECTED",
      "NEED_SUPPLEMENT",
    ]);
  });

  it("returns empty targets when detail is null", () => {
    detail.value = null;
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess,
    });
    expect(menu.availableTargets.value).toEqual([]);
  });

  it("openMenu sets menuOpen to true", () => {
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess,
    });
    expect(menu.menuOpen.value).toBe(false);
    menu.openMenu();
    expect(menu.menuOpen.value).toBe(true);
  });

  it("closeMenu sets menuOpen to false", () => {
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess,
    });
    menu.openMenu();
    menu.closeMenu();
    expect(menu.menuOpen.value).toBe(false);
  });

  it("performTransition calls repo.transitionPhase with correct body", async () => {
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess,
    });

    const result = await menu.performTransition("APPROVED");
    expect(result).toBe(true);
    expect(repo.transitionPhase).toHaveBeenCalledWith("case-001", {
      toPhase: "APPROVED",
      closeReason: undefined,
      resultOutcome: undefined,
    });
    expect(onSuccess).toHaveBeenCalled();
    expect(menu.menuOpen.value).toBe(false);
  });

  it("CLOSED_FAILED with closeReason sends closeReason in body", async () => {
    detail.value = makeDetail({ businessPhase: "REJECTED" });
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo,
      getCaseId: () => "case-001",
      onSuccess,
    });

    await menu.performTransition("CLOSED_FAILED", {
      closeReason: "BMV-VISA-REJECTED",
    });
    expect(repo.transitionPhase).toHaveBeenCalledWith("case-001", {
      toPhase: "CLOSED_FAILED",
      closeReason: "BMV-VISA-REJECTED",
      resultOutcome: undefined,
    });
  });

  it("sets errorMessage on repository failure", async () => {
    const failRepo = makeRepo({
      transitionPhase: vi.fn().mockRejectedValue(new Error("Server error")),
    });
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: failRepo,
      getCaseId: () => "case-001",
      onSuccess,
    });

    const result = await menu.performTransition("APPROVED");
    expect(result).toBe(false);
    expect(menu.errorMessage.value).toBe("Server error");
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("prevents double submission", async () => {
    let resolveTransition: (() => void) | undefined;
    const slowRepo = makeRepo({
      transitionPhase: vi.fn().mockImplementation(
        () =>
          new Promise<{ id: string }>((resolve) => {
            resolveTransition = () => resolve({ id: "case-001" });
          }),
      ),
    });
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: slowRepo,
      getCaseId: () => "case-001",
      onSuccess,
    });

    const p1 = menu.performTransition("APPROVED");
    expect(menu.submitting.value).toBe(true);

    const p2 = menu.performTransition("REJECTED");
    const result2 = await p2;
    expect(result2).toBe(false);

    resolveTransition!();
    const result1 = await p1;
    expect(result1).toBe(true);
  });
});
