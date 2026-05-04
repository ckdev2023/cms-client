import { describe, it, expect, vi } from "vitest";
import { ref, type Ref } from "vue";
import type { CaseDetail } from "../types";
import type { CaseRepository } from "./CaseRepository";
import { useCasePhaseTransitionMenu } from "./useCasePhaseTransitionMenu";
import { PHASE_TRANSITIONS } from "./businessPhaseTransitions";
import type { BusinessPhaseId } from "../constantsBusinessPhase";

function makeDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    id: "case-001",
    title: "Test Case",
    client: "Client",
    owner: "Owner",
    agency: "Agency",
    stage: "S1",
    stageCode: "S1",
    stageMeta: "",
    statusBadge: "badge-blue",
    deadline: "",
    deadlineMeta: "",
    deadlineDanger: false,
    progressPercent: 0,
    progressCount: "0/0",
    billingAmount: "¥0",
    billingMeta: "",
    billingStatusKey: "none",
    docsCounter: "0/0",
    readonly: false,
    customerId: "cust-001",
    groupId: "group-001",
    groupName: "Group 1",
    caseType: "BMV",
    applicationType: "new",
    businessPhase: "CONSULTING",
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

function getTargets(phase: BusinessPhaseId): readonly string[] {
  const detail = ref<CaseDetail | null>(
    makeDetail({ businessPhase: phase }),
  ) as Ref<CaseDetail | null>;
  const menu = useCasePhaseTransitionMenu({
    detail,
    repo: makeRepo(),
    getCaseId: () => "case-001",
    onSuccess: vi.fn().mockResolvedValue(undefined),
  });
  return menu.availableTargets.value;
}

const PHASES_WITH_CLOSED_FAILED: BusinessPhaseId[] = [
  "CONSULTING",
  "CONTRACTED",
  "WAITING_MATERIAL",
  "MATERIAL_PREPARING",
  "REVIEWING",
  "APPLYING",
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
  "REJECTED",
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
  "VISA_REJECTED",
];

const PHASES_WITHOUT_CLOSED_FAILED: BusinessPhaseId[] = [
  "APPROVED",
  "SUCCESS",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
];

const TERMINAL_PHASES: BusinessPhaseId[] = ["CLOSED_SUCCESS", "CLOSED_FAILED"];

describe("useCasePhaseTransitionMenu — full phase transition matrix", () => {
  describe("phases that MUST include CLOSED_FAILED", () => {
    it.each(PHASES_WITH_CLOSED_FAILED)(
      "%s → availableTargets includes CLOSED_FAILED",
      (phase) => {
        const targets = getTargets(phase);
        expect(targets).toContain("CLOSED_FAILED");
      },
    );
  });

  describe("phases that must NOT include CLOSED_FAILED", () => {
    it.each(PHASES_WITHOUT_CLOSED_FAILED)(
      "%s → availableTargets does NOT include CLOSED_FAILED",
      (phase) => {
        const targets = getTargets(phase);
        expect(targets).not.toContain("CLOSED_FAILED");
      },
    );
  });

  describe("terminal phases return empty targets", () => {
    it.each(TERMINAL_PHASES)("%s → availableTargets is empty", (phase) => {
      const targets = getTargets(phase);
      expect(targets).toEqual([]);
    });
  });

  describe("availableTargets matches PHASE_TRANSITIONS exactly", () => {
    it.each(Object.keys(PHASE_TRANSITIONS) as BusinessPhaseId[])(
      "%s → composable targets match SSoT table",
      (phase) => {
        const targets = getTargets(phase);
        expect(targets).toEqual(PHASE_TRANSITIONS[phase]);
      },
    );
  });

  it("detail=null yields empty targets", () => {
    const detail = ref<CaseDetail | null>(null) as Ref<CaseDetail | null>;
    const menu = useCasePhaseTransitionMenu({
      detail,
      repo: makeRepo(),
      getCaseId: () => "case-001",
      onSuccess: vi.fn().mockResolvedValue(undefined),
    });
    expect(menu.availableTargets.value).toEqual([]);
  });
});
