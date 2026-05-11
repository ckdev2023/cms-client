import { nextTick } from "vue";
import { vi } from "vitest";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";

const BASE_DETAIL: CaseDetail = {
  id: "CASE-001",
  title: "テスト案件",
  titleFallbackParts: {
    applicant: "テスト太郎",
    caseTypeCode: "work_visa_renewal",
    caseNo: "CASE-001",
    id: "CASE-001",
  },
  client: "テスト太郎",
  owner: "担当者A",
  agency: "",
  stage: "S3",
  stageCode: "S3",
  stageMeta: "Stage S3",
  statusBadge: "active",
  deadline: "2026-06-01",
  deadlineMeta: "",
  deadlineMetaLoc: {
    key: "cases.detail.overview.deadlineMeta",
    params: { date: "2026-06-01" },
  },
  deadlineDanger: false,
  progressPercent: 50,
  progressCount: "8/16",
  billingAmount: "¥300,000",
  billingMeta: "",
  billingStatusKey: "paid",
  docsCounter: "8/16",
  readonly: false,
  customerId: "CUS-001",
  groupId: "tokyo",
  groupName: "東京",
  caseType: "work",
  applicationType: "new",
  businessPhase: "MATERIAL_PREPARING",
  acceptedDate: "2026-01-15",
  targetDate: "2026-06-01",
  acceptedDateInput: "2026-01-15",
  targetDateInput: "2026-06-01",
  priority: "normal",
  riskLevel: "low",
  ownerUserId: "user-1",
  assistantUserId: "",
  jurisdictionAuthority: "",
  remark: "",
  providerProgress: [],
  risk: {
    blockingCount: "2",
    blockingDetail: "",
    blockingDetailLoc: {
      key: "cases.detail.overview.risk.blockingDetail",
      params: { count: 2 },
    },
    arrearsStatus: "cases.detail.arrearsNo",
    arrearsDetail: "",
    deadlineAlert: "",
    deadlineAlertDetail: "",
    lastValidation: "",
    reviewStatus: "",
  },
  nextAction: "",
  validationHint: "",
  validationHintLoc: {
    key: "cases.detail.overview.validationHint.blockingWarning",
    params: { b: 2, w: 0 },
  },
  overviewActions: {
    primary: { label: "cases.coach.docManagement", tab: "documents" },
    secondary: { label: "cases.coach.runValidation", tab: "validation" },
  },
  timeline: [],
  team: [],
  relatedParties: [],
  deadlines: [
    {
      id: 1,
      title: "提出期限",
      desc: "入管提出期限",
      date: "2026-05-01",
      remaining: "あと5日",
      severity: "danger",
    },
    {
      id: 2,
      title: "回答期限",
      desc: "追加資料回答期限",
      date: "2026-06-01",
      remaining: "あと36日",
      severity: "warning",
    },
  ] as CaseDetail["deadlines"],
  billing: {
    total: "¥300,000",
    received: "¥300,000",
    outstanding: "¥0",
    payments: [],
  },
  validation: {
    lastTime: "",
    blocking: [
      { gate: "missing_documents", title: "必須書類不足" },
      { gate: "unsigned_application", title: "申請書未署名" },
    ] as CaseDetail["validation"]["blocking"],
    warnings: [],
    info: [],
  },
  submissionPackages: [],
  correctionPackage: null,
  doubleReview: [],
  reviewEnabled: false,
  riskConfirmationRecord: null,
  documents: [],
  documentTemplateMissing: false,
  checklistBootstrapAvailable: false,
  forms: { templates: [], generated: [] },
  tasks: [
    { done: false, label: "書類確認" },
    { done: false, label: "資料送付" },
    { done: true, label: "受付完了" },
  ] as CaseDetail["tasks"],
  logEntries: [],
  messages: [],
};

const DEFAULT_TAB_COUNTS = {
  documentItemsTotal: 16,
  documentItemsDone: 8,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 2,
  tasks: 3,
  tasksPending: 2,
  communicationLogs: 5,
  submissionPackages: 1,
  generatedDocuments: 0,
  validationRuns: 1,
  reviewRecords: 0,
  billingRecords: 1,
  paymentRecords: 1,
};

export const ZERO_TAB_COUNTS = {
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
};

/** 等待 Vue 更新与微任务队列完成，便于断言异步加载后的状态。 */
export async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

/**
 * 创建详情模型测试用基础案件，可按需覆盖任意字段。
 *
 * @param overrides 覆盖基础案件详情的字段。
 * @returns 合成后的案件详情测试数据。
 */
export function createMockDetail(
  overrides: Partial<CaseDetail> = {},
): CaseDetail {
  return {
    ...BASE_DETAIL,
    risk: { ...BASE_DETAIL.risk },
    overviewActions: {
      primary: { ...BASE_DETAIL.overviewActions.primary },
      secondary: { ...BASE_DETAIL.overviewActions.secondary },
    },
    deadlines: [...BASE_DETAIL.deadlines],
    billing: {
      ...BASE_DETAIL.billing,
      payments: [...BASE_DETAIL.billing.payments],
    },
    validation: {
      ...BASE_DETAIL.validation,
      blocking: [...BASE_DETAIL.validation.blocking],
      warnings: [...BASE_DETAIL.validation.warnings],
      info: [...BASE_DETAIL.validation.info],
    },
    timeline: [...BASE_DETAIL.timeline],
    team: [...BASE_DETAIL.team],
    relatedParties: [...BASE_DETAIL.relatedParties],
    submissionPackages: [...BASE_DETAIL.submissionPackages],
    doubleReview: [...BASE_DETAIL.doubleReview],
    documents: [...BASE_DETAIL.documents],
    forms: {
      templates: [...BASE_DETAIL.forms.templates],
      generated: [...BASE_DETAIL.forms.generated],
    },
    tasks: [...BASE_DETAIL.tasks],
    logEntries: [...BASE_DETAIL.logEntries],
    messages: [...BASE_DETAIL.messages],
    providerProgress: [...BASE_DETAIL.providerProgress],
    ...overrides,
  };
}

/**
 * 创建详情聚合测试桩，并补齐默认 tabCounts 与关联显示字段。
 *
 * @param detail 聚合内返回的案件详情。
 * @param overrides 对聚合默认字段的覆盖值。
 * @returns 可注入 repository stub 的详情聚合对象。
 */
export function createMockAggregate(
  detail: CaseDetail,
  overrides: Partial<CaseDetailAggregate> = {},
): CaseDetailAggregate {
  return {
    detail,
    tabCounts: { ...DEFAULT_TAB_COUNTS },
    customerId: detail.customerId,
    customerName: detail.client,
    customerLocalizedNames: detail.customerLocalizedNames ?? {
      zh: "",
      ja: "",
      en: "",
    },
    groupId: detail.groupId,
    groupName: detail.groupName,
    ownerUserId: "user-001",
    ownerDisplayName: detail.owner,
    assistantUserId: null,
    assistantDisplayName: null,
    ...overrides,
  };
}

/**
 * 创建仅实现 `getDetailAggregate` 的仓库 stub，并暴露调用 spy。
 *
 * @param handler 仓库读取逻辑的测试实现。
 * @returns 包含 repository stub 与调用 spy 的对象。
 */
export function createDetailRepoStub(
  handler: (id: string) => Promise<CaseDetailAggregate | null>,
) {
  const spy = vi.fn(handler);
  return {
    repo: { getDetailAggregate: spy } as unknown as CaseRepository,
    spy,
  };
}
