// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-03 — success closeout model E2E focused tests.
// Covers: successCloseout state projection via useCaseDetailModel.
// Does NOT test: failure closeout or write-action lifecycle.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import type { CaseDetail } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import type { CaseRepository } from "./CaseRepository";
import { useCaseDetailModel } from "./useCaseDetailModel";

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

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

describe("success closeout end-to-end via useCaseDetailModel (p1-qa-001-03)", () => {
  const BASE_DETAIL: CaseDetail = {
    id: "CASE-SC-E2E",
    title: "成功結案E2E",
    client: "テスト太郎",
    owner: "担当者A",
    agency: "",
    stage: "成功結案",
    stageCode: "S8",
    stageMeta: "",
    statusBadge: "active",
    deadline: "",
    deadlineMeta: "",
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: "10/10",
    billingAmount: "¥500,000",
    billingMeta: "",
    billingStatusKey: "paid",
    docsCounter: "10/10",
    readonly: false,
    customerId: "CUS-SC-E2E",
    groupId: "tokyo",
    groupName: "東京",
    caseType: "business_manager_visa",
    applicationType: "new",
    businessPhase: "SUCCESS",
    acceptedDate: "",
    targetDate: "",
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      arrearsStatus: "cases.detail.arrearsNo",
      arrearsDetail: "",
      deadlineAlert: "",
      deadlineAlertDetail: "",
      lastValidation: "",
      reviewStatus: "",
    },
    nextAction: "",
    validationHint: "",
    overviewActions: {
      primary: { label: "cases.coach.docManagement", tab: "documents" },
      secondary: { label: "cases.coach.runValidation", tab: "validation" },
    },
    timeline: [],
    team: [],
    relatedParties: [],
    deadlines: [],
    billing: {
      total: "¥500,000",
      received: "¥500,000",
      outstanding: "¥0",
      payments: [],
    },
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
    providerProgress: [],
    workflowStep: {
      stepCode: "ENTRY_SUCCESS",
      stepLabel: "入境成功",
      parentStage: "S8",
      parentStageLabel: "成功結案",
      sortOrder: 12,
      isFailureStep: false,
    },
    visaPlan: "new_establishment",
    residencePeriod: null,
    reminderSchedule: null,
    successCloseout: {
      allSatisfied: true,
      preconditions: [
        { code: "ENTRY_CONFIRMED", label: "入境已確認", satisfied: true },
        {
          code: "RESIDENCE_PERIOD_RECORDED",
          label: "在留期間已録入",
          satisfied: true,
        },
        {
          code: "RENEWAL_REMINDER_SCHEDULED",
          label: "续签提醒已設定",
          satisfied: true,
        },
      ],
    },
  };

  function d(o: Partial<CaseDetail> = {}): CaseDetail {
    return { ...BASE_DETAIL, ...o };
  }

  function agg(
    det: CaseDetail,
    o: Partial<CaseDetailAggregate> = {},
  ): CaseDetailAggregate {
    return {
      detail: det,
      tabCounts: {
        documentItemsTotal: 10,
        documentItemsDone: 10,
        questionnaireItemsTotal: 3,
        questionnaireItemsDone: 3,
        caseParties: 2,
        tasks: 0,
        tasksPending: 0,
        communicationLogs: 0,
        submissionPackages: 1,
        generatedDocuments: 0,
        validationRuns: 0,
        reviewRecords: 0,
        billingRecords: 0,
        paymentRecords: 0,
      },
      customerId: det.customerId,
      customerName: det.client,
      groupId: det.groupId,
      groupName: det.groupName,
      ownerUserId: "u1",
      ownerDisplayName: det.owner,
      assistantUserId: null,
      assistantDisplayName: null,
      ...o,
    };
  }

  it("all preconditions met → successCloseout.allSatisfied on model", async () => {
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(d())),
    });
    const model = useCaseDetailModel(ref("CASE-SC-E2E"), { repo });
    await flushFetch();
    expect(model.detail.value!.successCloseout).not.toBeNull();
    expect(model.detail.value!.successCloseout!.allSatisfied).toBe(true);
    expect(model.detail.value!.successCloseout!.preconditions).toHaveLength(3);
  });

  it("blocked precondition → successCloseout.allSatisfied=false on model", async () => {
    const blockedDetail = d({
      successCloseout: {
        allSatisfied: false,
        preconditions: [
          { code: "ENTRY_CONFIRMED", label: "入境已確認", satisfied: true },
          {
            code: "RESIDENCE_PERIOD_RECORDED",
            label: "在留期間已録入",
            satisfied: false,
          },
          {
            code: "RENEWAL_REMINDER_SCHEDULED",
            label: "续签提醒已設定",
            satisfied: false,
          },
        ],
      },
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(blockedDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-SC-BLK"), { repo });
    await flushFetch();
    expect(model.detail.value!.successCloseout!.allSatisfied).toBe(false);
    const unsatisfied =
      model.detail.value!.successCloseout!.preconditions.filter(
        (p) => !p.satisfied,
      );
    expect(unsatisfied).toHaveLength(2);
  });
});
