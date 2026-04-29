// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-004-03 — COE transition fallback + detail model focused tests.
// Covers: success closeout transition failure fallback and detail-model exposure of COE/reminder fields.
// Does NOT test: core advance/step lifecycles, adapter internals, or guard classification.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import type { CaseDetail } from "../types";
import { useCaseDetailModel } from "./useCaseDetailModel";
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
    ...overrides,
  } as unknown as CaseRepository;
}

function makeCoeGateError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Gate blocked: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

describe("success closeout transition failure fallback (p1-fe-004-03)", () => {
  it("transitionStage to S9 blocked by success closeout gate", async () => {
    const err = makeCoeGateError("CASE_SUCCESS_CLOSEOUT_BLOCKED");
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

    const ok = await wa.transitionStage("S9");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_SUCCESS_CLOSEOUT_BLOCKED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.successCloseoutBlocked",
    );
  });

  it("failure closeout missing attribution → gate block", async () => {
    const err = makeCoeGateError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED");
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

    const ok = await wa.transitionStage("S9", "failure_close");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.failureCloseoutAttributionRequired",
    );
  });

  it("successful transition clears feedback", async () => {
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionStage("S9");
    expect(ok).toBe(true);
    expect(wa.writeFeedback.value).toMatchObject({
      submitting: false,
      errorMessage: null,
      isGateBlock: false,
    });
  });
});

describe("useCaseDetailModel COE/residence/reminder fields (p1-fe-004-03)", () => {
  const BASE_DETAIL: CaseDetail = {
    id: "CASE-COE",
    title: "COEテスト",
    client: "テスト太郎",
    owner: "担当者A",
    agency: "",
    stage: "S8",
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
    customerId: "CUS-COE",
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
    residencePeriod: {
      id: "rp-001",
      tone: "success",
      statusLabel: "有効",
      residenceStatus: "経営管理",
      visaType: "business_manager",
      periodLabel: "5年",
      startDate: "2026-01-15",
      endDate: "2031-01-15",
      cardNumber: "AB12345678CD",
      entryDate: "2026-01-20",
      reminderCreated: true,
      recordMeta: "カード: AB12345678CD · 提醒: 已设置",
    },
    reminderSchedule: {
      tone: "success",
      statusLabel: "設定済み",
      reminderDate: "2031-01-15",
      reminders: [
        { label: "180 日前", date: "2030-07-19", severity: "primary" },
        { label: "90 日前", date: "2030-10-17", severity: "primary" },
        { label: "30 日前", date: "2030-12-16", severity: "primary" },
      ],
      recordMeta: "180/90/30 日前リマインダー生成済み",
    },
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

  it("residencePeriod is accessible from detail model", async () => {
    const repo = stubRepo({ getDetailAggregate: vi.fn(async () => agg(d())) });
    const model = useCaseDetailModel(ref("CASE-COE"), { repo });
    await flushFetch();
    expect(model.detail.value!.residencePeriod).not.toBeNull();
    expect(model.detail.value!.residencePeriod!.id).toBe("rp-001");
  });

  it("reminderSchedule is accessible from detail model", async () => {
    const repo = stubRepo({ getDetailAggregate: vi.fn(async () => agg(d())) });
    const model = useCaseDetailModel(ref("CASE-COE"), { repo });
    await flushFetch();
    expect(model.detail.value!.reminderSchedule).not.toBeNull();
    expect(model.detail.value!.reminderSchedule!.reminders).toHaveLength(3);
  });

  it("successCloseout is accessible from detail model", async () => {
    const repo = stubRepo({ getDetailAggregate: vi.fn(async () => agg(d())) });
    const model = useCaseDetailModel(ref("CASE-COE"), { repo });
    await flushFetch();
    expect(model.detail.value!.successCloseout).not.toBeNull();
    expect(model.detail.value!.successCloseout!.allSatisfied).toBe(true);
  });

  it("residencePeriod null when not present on detail", async () => {
    const detailNoResidence = d({
      residencePeriod: null,
      reminderSchedule: null,
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(detailNoResidence)),
    });
    const model = useCaseDetailModel(ref("CASE-COE"), { repo });
    await flushFetch();
    expect(model.detail.value!.residencePeriod).toBeNull();
    expect(model.detail.value!.reminderSchedule).toBeNull();
  });

  it("successCloseout null when not a BMV S8 case", async () => {
    const nonBmvDetail = d({
      caseType: "work",
      workflowStep: undefined,
      visaPlan: undefined,
      successCloseout: null,
    });
    const repo = stubRepo({
      getDetailAggregate: vi.fn(async () => agg(nonBmvDetail)),
    });
    const model = useCaseDetailModel(ref("CASE-GEN"), { repo });
    await flushFetch();
    expect(model.detail.value!.successCloseout).toBeNull();
  });

  it("isBmvCase true when residence data present with workflowStep", async () => {
    const repo = stubRepo({ getDetailAggregate: vi.fn(async () => agg(d())) });
    const model = useCaseDetailModel(ref("CASE-COE"), { repo });
    await flushFetch();
    expect(model.isBmvCase.value).toBe(true);
  });
});
