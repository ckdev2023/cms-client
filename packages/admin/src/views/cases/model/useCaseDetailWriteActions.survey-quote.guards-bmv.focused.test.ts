import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import { createWriteActions } from "./useCaseDetailWriteActions";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";

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
    ...overrides,
  } as unknown as CaseRepository;
}

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

describe("readonly guard (p1-fe-003-03)", () => {
  it("updateCaseFields returns false when readonly", async () => {
    const updateCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ updateCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.updateCaseFields({ visaPlan: "change_status" });
    expect(ok).toBe(false);
    expect(updateCase).not.toHaveBeenCalled();
  });

  it("transitionWorkflowStep returns false when readonly", async () => {
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionWorkflowStep("MATERIAL_PREPARING");
    expect(ok).toBe(false);
    expect(transitionWorkflowStep).not.toHaveBeenCalled();
  });

  it("no feedback state change when readonly blocks action", async () => {
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.updateCaseFields({ quotePrice: 500000 });
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });
});

describe("double-submit guard (p1-fe-003-03)", () => {
  it("second call returns false while first is in-flight", async () => {
    let resolve!: () => void;
    const updateCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ updateCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p1 = wa.updateCaseFields({ visaPlan: "new_establishment" });
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const ok2 = await wa.updateCaseFields({ visaPlan: "change_status" });
    expect(ok2).toBe(false);
    expect(updateCase).toHaveBeenCalledTimes(1);

    resolve();
    const ok1 = await p1;
    expect(ok1).toBe(true);
  });

  it("writeFeedback.submitting prevents all write actions", async () => {
    let resolve!: () => void;
    const updateCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ updateCase, transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    wa.updateCaseFields({ quotePrice: 300000 });
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const stepOk = await wa.transitionWorkflowStep("REVIEWING");
    expect(stepOk).toBe(false);
    expect(transitionWorkflowStep).not.toHaveBeenCalled();

    const stageOk = await wa.transitionStage("S4");
    expect(stageOk).toBe(false);

    resolve();
    await flushFetch();
  });
});

describe("isBmvCase composable computed (p1-fe-003-03)", () => {
  const BASE_DETAIL: CaseDetail = {
    id: "CASE-BMV",
    title: "BMV テスト",
    client: "テスト太郎",
    owner: "担当者A",
    agency: "",
    stage: "S3",
    stageCode: "S3",
    stageMeta: "",
    statusBadge: "active",
    deadline: "",
    deadlineMeta: "",
    deadlineDanger: false,
    progressPercent: 50,
    progressCount: "5/10",
    billingAmount: "",
    billingMeta: "",
    billingStatusKey: "paid",
    docsCounter: "5/10",
    readonly: false,
    customerId: "CUS-BMV",
    groupId: "tokyo",
    groupName: "東京",
    caseType: "business_manager_visa",
    applicationType: "new",
    businessPhase: "MATERIAL_PREPARING",
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
      primary: { label: "資料管理", tab: "documents" },
      secondary: { label: "校験実行", tab: "validation" },
    },
    timeline: [],
    team: [],
    relatedParties: [],
    deadlines: [],
    billing: { total: "", received: "", outstanding: "", payments: [] },
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
        documentItemsTotal: 0,
        documentItemsDone: 0,
        questionnaireItemsTotal: 0,
        questionnaireItemsDone: 0,
        caseParties: 0,
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
      ownerUserId: "u1",
      ownerDisplayName: det.owner,
      assistantUserId: null,
      assistantDisplayName: null,
      ...o,
    };
  }

  it("true when workflowStep present", async () => {
    const bmvDetail = d({
      workflowStep: {
        stepCode: "MATERIAL_PREPARING",
        stepLabel: "資料準備中",
        parentStage: "S2",
        parentStageLabel: "資料収集",
        sortOrder: 2,
        isFailureStep: false,
      },
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(bmvDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-BMV"), { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(true);
  });

  it("true when visaPlan present (no workflowStep)", async () => {
    const bmvDetail = d({ visaPlan: "new_establishment" });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(bmvDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-BMV"), { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(true);
  });

  it("false for non-BMV case (no workflowStep, no visaPlan)", async () => {
    const generalDetail = d({
      caseType: "work",
      workflowStep: undefined,
      visaPlan: undefined,
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(generalDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-GEN"), { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(false);
  });

  it("false when workflowStep and visaPlan are null", async () => {
    const generalDetail = d({ workflowStep: null, visaPlan: null });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(generalDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-GEN"), { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(false);
  });

  it("false when detail is null (not found)", async () => {
    const repo = stubRepo({ getDetailAggregate: vi.fn(async () => null) });
    const model = useCaseDetailModel(ref("CASE-MISSING"), { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(false);
  });

  it("transitions non-BMV → BMV when caseId changes", async () => {
    const nonBmvAgg = agg(d({ id: "CASE-GEN", caseType: "work" }));
    const bmvAgg = agg(
      d({
        id: "CASE-BMV",
        caseType: "business_manager_visa",
        visaPlan: "new_establishment",
      }),
    );
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async (id: string) =>
        id === "CASE-BMV" ? bmvAgg : nonBmvAgg,
      ),
    });
    const caseId = ref("CASE-GEN");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(false);

    caseId.value = "CASE-BMV";
    await flushFetch();
    expect(model.isBmvCase.value).toBe(true);
  });
});
