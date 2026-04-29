// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-03 — failure closeout model E2E focused tests.
// Covers: failureCloseout state projection via useCaseDetailModel.
// Does NOT test: success closeout or write-action lifecycle.
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

describe("failure closeout end-to-end via useCaseDetailModel (p1-qa-001-03)", () => {
  const BASE_FAILURE_DETAIL: CaseDetail = {
    id: "CASE-FC-E2E",
    title: "失敗結案E2E",
    client: "テスト二郎",
    owner: "担当者B",
    agency: "",
    stage: "已归档",
    stageCode: "S9",
    stageMeta: "",
    statusBadge: "badge-gray",
    deadline: "",
    deadlineMeta: "",
    deadlineDanger: false,
    progressPercent: 100,
    progressCount: "10/10",
    billingAmount: "¥600,000",
    billingMeta: "",
    billingStatusKey: "paid",
    docsCounter: "10/10",
    readonly: true,
    customerId: "CUS-FC-E2E",
    groupId: "tokyo",
    groupName: "東京",
    caseType: "business_manager_visa",
    applicationType: "new",
    businessPhase: "CLOSED_FAILED",
    acceptedDate: "",
    targetDate: "",
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      arrearsStatus: "なし",
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
      total: "¥600,000",
      received: "¥600,000",
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
      stepCode: "VISA_REJECTED",
      stepLabel: "签证拒否",
      parentStage: "S9",
      parentStageLabel: "已归档",
      sortOrder: 16,
      isFailureStep: true,
    },
    visaPlan: "new_establishment",
    failureCloseout: {
      isFailurePath: true,
      reasonCode: "VISA_REJECTED",
      reasonLabel: "签证拒否",
      canDirectClose: true,
      closeReasonRequired: false,
    },
  };

  function d(o: Partial<CaseDetail> = {}): CaseDetail {
    return { ...BASE_FAILURE_DETAIL, ...o };
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
        questionnaireItemsTotal: 0,
        questionnaireItemsDone: 0,
        caseParties: 2,
        tasks: 0,
        tasksPending: 0,
        communicationLogs: 0,
        submissionPackages: 0,
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
      ownerUserId: "u2",
      ownerDisplayName: det.owner,
      assistantUserId: null,
      assistantDisplayName: null,
      ...o,
    };
  }

  it("visa rejected failure — reason displayed on model", async () => {
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(d())),
    });
    const model = useCaseDetailModel(ref("CASE-FC-E2E"), { repo });
    await flushFetch();
    const fc = model.detail.value!.failureCloseout!;
    expect(fc).not.toBeNull();
    expect(fc.isFailurePath).toBe(true);
    expect(fc.reasonCode).toBe("VISA_REJECTED");
    expect(fc.reasonLabel).toBe("签证拒否");
    expect(fc.canDirectClose).toBe(true);
  });

  it("client withdrawn — closeReasonRequired on model", async () => {
    const cwDetail = d({
      failureCloseout: {
        isFailurePath: true,
        reasonCode: "CLIENT_WITHDRAWN",
        reasonLabel: "顧客取下げ",
        canDirectClose: false,
        closeReasonRequired: true,
      },
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(cwDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-FC-CW"), { repo });
    await flushFetch();
    const fc = model.detail.value!.failureCloseout!;
    expect(fc.reasonCode).toBe("CLIENT_WITHDRAWN");
    expect(fc.closeReasonRequired).toBe(true);
    expect(fc.canDirectClose).toBe(false);
  });

  it("S9 readonly is true after failure closeout", async () => {
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(d())),
    });
    const model = useCaseDetailModel(ref("CASE-FC-RO"), { repo });
    await flushFetch();
    expect(model.detail.value!.readonly).toBe(true);
    expect(model.detail.value!.stageCode).toBe("S9");
  });

  it("workflowStep shows isFailureStep=true on failure closeout", async () => {
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(d())),
    });
    const model = useCaseDetailModel(ref("CASE-FC-WS"), { repo });
    await flushFetch();
    const ws = model.detail.value!.workflowStep!;
    expect(ws.isFailureStep).toBe(true);
    expect(ws.stepCode).toBe("VISA_REJECTED");
  });

  it("failureCloseout null when not on failure path", async () => {
    const happyDetail = d({
      stageCode: "S8",
      stage: "成功結案",
      readonly: false,
      failureCloseout: undefined,
      workflowStep: {
        stepCode: "ENTRY_SUCCESS",
        stepLabel: "入境成功",
        parentStage: "S8",
        parentStageLabel: "成功結案",
        sortOrder: 12,
        isFailureStep: false,
      },
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(happyDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-FC-HAPPY"), { repo });
    await flushFetch();
    expect(model.detail.value!.failureCloseout).toBeUndefined();
  });
});
