import type { CaseDetail, CaseListItem, CaseSummaryCardData } from "../types";
import type {
  BillingData,
  DeadlineItem,
  DocumentGroup,
  DoubleReviewEntry,
  FormTemplate,
  FormsData,
  LogEntry,
  MessageItem,
  SubmissionPackage,
  TaskItem,
  ValidationData,
} from "../types-detail";
import {
  adaptCaseSummaryCards,
  type CaseBillingRiskAckInput,
  type CaseCreateInput,
  type CaseDetailAggregate,
  type CaseListParams,
  type CaseListResult,
  type CaseMutationResult,
  type CasePartyCreateInput,
  type CasePostApprovalInput,
  type CaseTransitionInput,
  type CaseUpdateInput,
  type CaseWorkflowStepTransitionInput,
} from "./CaseAdapter";
import {
  CaseRepositoryError,
  createRuntime,
  type CaseRepositoryFactoryInput,
} from "./CaseRepositorySupport";
import {
  createAcknowledgeBillingRisk,
  createBootstrapChecklist,
  createCreateCase,
  createCreateCaseParty,
  createDeleteCase,
  createGetDetail,
  createGetDetailAggregate,
  createListCases,
  createRetryReminderCreation,
  createTransitionCase,
  createTransitionPhase,
  createTransitionWorkflowStep,
  createUpdateCase,
  createUpdatePostApprovalStage,
} from "./CaseRepositoryFactories";
import {
  createGetBillingTabAggregate,
  createGetDeadlines,
  createGetDocumentItems,
  createGetDoubleReviewEntries,
  createGetGeneratedDocuments,
  createGetLogEntries,
  createGetMessages,
  createGetSubmissionPackages,
  createGetTasks,
  createGetValidationData,
  createGetBillingData,
  createListDocumentTemplates,
  createPreviewChecklistCount,
} from "./CaseRepositoryReadSide";
import {
  createCompleteTask,
  createCreateCommunicationLog,
  createCreateGeneratedDocument,
  createCreateReminder,
  createCreateSubmissionPackage,
  createCreateTask,
  createFinalizeGeneratedDocument,
  createExportGeneratedDocument,
  type SubmissionPackageCreateInput,
  type WriteResultWithId,
} from "./CaseRepositoryWriteSide";
import type { CommunicationLogCreateInput } from "./CaseAdapterMessageWriteBuilders";
import type { GeneratedDocumentCreateInput } from "./CaseAdapterGeneratedDocumentWriteBuilders";
import type { ReminderCreateInput } from "./CaseAdapterReminderWriteBuilders";
import type { TaskCreateInput } from "./CaseAdapterTaskWriteBuilders";

// ─── Responsibility Boundary ────────────────────────────────────
// CaseRepository is request-orchestration only:
//   1. URL construction    → buildCaseListSearchParams / buildCaseDetailPath
//   2. Payload building    → buildXxxPayload (CaseAdapterWriteBuilders)
//   3. Response adaptation → adaptXxx (CaseAdapterMappers / MutationResults / DetailAggregate)
//   4. Error normalization → CaseRepositorySupport (requestAndAdapt)
//
// CaseRepository MUST NOT contain inline field mapping, raw body
// construction, or response parsing logic.

/**
 * 案件仓储接口——所有案件 CRUD 操作的统一入口。
 *
 * 实现只做请求编排、错误归一化与 builders/adapters 委托，
 * 不承担任何字段级映射。
 */
export interface CaseRepository {
  /**
   *
   */
  listCases(params: CaseListParams): Promise<CaseListResult>;
  /**
   *
   */
  getSummaryCards(items: CaseListItem[]): CaseSummaryCardData[];
  /**
   *
   */
  getDetail(id: string): Promise<CaseDetail | null>;
  /**
   *
   */
  getDetailAggregate(id: string): Promise<CaseDetailAggregate | null>;
  /**
   *
   */
  createCase(input: CaseCreateInput): Promise<CaseMutationResult>;
  /**
   *
   */
  updateCase(id: string, input: CaseUpdateInput): Promise<CaseMutationResult>;
  /**
   *
   */
  transitionCase(
    id: string,
    input: CaseTransitionInput,
  ): Promise<CaseMutationResult>;
  /**
   *
   */
  acknowledgeBillingRisk(
    id: string,
    input: CaseBillingRiskAckInput,
  ): Promise<CaseMutationResult>;
  /**
   *
   */
  updatePostApprovalStage(
    id: string,
    input: CasePostApprovalInput,
  ): Promise<CaseMutationResult>;
  /**
   * P1 业务子步骤流转。
   * 数据源：`POST /api/cases/:id/workflow-step-transition`。
   */
  transitionWorkflowStep(
    id: string,
    input: CaseWorkflowStepTransitionInput,
  ): Promise<CaseMutationResult>;

  /**
   *
   */
  transitionPhase(
    id: string,
    input: {
      toPhase: string;
      closeReason?: string;
      resultOutcome?: string;
    },
  ): Promise<CaseMutationResult>;

  /**
   *
   */
  deleteCase(id: string): Promise<void>;

  /**
   * 通过独立 CaseCommsLogsAdapter 获取沟通记录（messages tab）。
   * 数据源：`GET /api/communication-logs?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getMessages(caseId: string, locale?: string): Promise<MessageItem[]>;

  /**
   * 通过独立 CaseCommsLogsAdapter 获取操作日志（log tab）。
   * 数据源：`GET /api/timeline?entityType=case&entityId=xxx`，不经由 detail aggregate 主链。
   */
  getLogEntries(caseId: string): Promise<LogEntry[]>;

  /**
   * 获取按提交方分组的资料清单（documents tab）。
   * 数据源：`GET /api/document-items?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getDocumentItems(caseId: string): Promise<DocumentGroup[]>;

  /**
   * 获取生成文书列表（forms tab）。
   * 数据源：`GET /api/generated-documents?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getGeneratedDocuments(caseId: string, locale?: string): Promise<FormsData>;

  /**
   * 获取校验运行列表并适配为门禁视图模型（validation tab）。
   * 数据源：`GET /api/validation-runs?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getValidationData(caseId: string): Promise<ValidationData>;

  /**
   * 获取收费计划与入金记录（billing tab）。
   * 首屏优先 aggregate 端点，失败时回退 plans+payments 双拉。
   */
  getBillingData(caseId: string): Promise<BillingData>;

  /**
   * 获取 billing tab aggregate 原始数据。
   * 数据源：`GET /api/cases/:id/billing-tab-aggregate`。
   */
  getBillingTabAggregate(caseId: string): Promise<unknown>;

  /**
   * 获取提交包列表（validation tab - 提交包区）。
   * 数据源：`GET /api/submission-packages?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getSubmissionPackages(caseId: string): Promise<SubmissionPackage[]>;

  /**
   * 获取复核记录列表（validation tab - 双人复核区）。
   * 数据源：`GET /api/review-records?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getDoubleReviewEntries(caseId: string): Promise<DoubleReviewEntry[]>;

  /**
   * 获取任务列表（tasks tab）。
   * 数据源：`GET /api/tasks?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getTasks(caseId: string): Promise<TaskItem[]>;

  /**
   * 获取期限/提醒列表（deadlines tab）。
   * 数据源：`GET /api/reminders?caseId=xxx`，不经由 detail aggregate 主链。
   */
  getDeadlines(caseId: string): Promise<DeadlineItem[]>;

  /**
   * 创建案件关联人。
   * 数据源：`POST /api/case-parties`。
   *
   * 对接边界（p0-fe-008-01）：
   * - 单案件模式：先 `createCase` 获取 caseId，再逐条 `createCaseParty`。
   * - 家族批量模式：每个家庭成员独立建案，每案各自提交关联人，不使用批量 API。
   * - 服务端 `POST /case-parties` 要求父案件存在且非 S9，并执行资源级鉴权。
   */
  createCaseParty(input: CasePartyCreateInput): Promise<CaseMutationResult>;

  /**
   * 为空 document_items 案件从模板补生成资料清单。
   * 数据源：`POST /api/cases/:id/checklist/bootstrap-from-template`。
   */
  bootstrapChecklist(caseId: string): Promise<CaseMutationResult>;

  /**
   * P1 重试创建续签提醒。
   * 数据源：`POST /api/cases/:id/retry-reminder-creation`。
   */
  retryReminderCreation(caseId: string): Promise<CaseMutationResult>;

  /**
   * 创建沟通记录。
   * 数据源：`POST /api/communication-logs`。
   *
   * UI `channelChoice` (`internal` / `client_visible` / `phone` / `meeting`)
   * 由 `CaseAdapterMessageWriteBuilders` 映射为 server `channelType + visibleToClient`。
   */
  createCommunicationLog(
    input: CommunicationLogCreateInput,
  ): Promise<WriteResultWithId>;

  /**
   * 创建生成文書。
   * 数据源：`POST /api/generated-documents`。
   */
  createGeneratedDocument(
    input: GeneratedDocumentCreateInput,
  ): Promise<WriteResultWithId>;

  /**
   * 创建期限/提醒。
   * 数据源：`POST /api/reminders`。
   *
   * UI `kind` (`residence_expiry` / `renewal_reminder` / `custom`) 通过
   * `CaseAdapterReminderWriteBuilders` 落入 `payloadSnapshot.kind`，
   * 配合 `targetType` 决定提醒挂在 case 还是 case_party_residence。
   */
  createReminder(input: ReminderCreateInput): Promise<WriteResultWithId>;

  /**
   * 创建任务。
   * 数据源：`POST /api/tasks`。
   */
  createTask(input: TaskCreateInput): Promise<WriteResultWithId>;

  /**
   * 将任务标记为完成。
   * 数据源：`POST /api/tasks/:id/complete`。
   */
  completeTask(taskId: string): Promise<WriteResultWithId>;

  /**
   * 新建提交包。
   * 数据源：`POST /api/submission-packages`。
   * 前置门禁（校验通过、复核通过等）由后端兜底。
   */
  createSubmissionPackage(
    input: SubmissionPackageCreateInput,
  ): Promise<WriteResultWithId>;

  /**
   * 资料清单预览：返回给定 caseTypeCode 的 checklist 条数与必须项条数。
   * 数据源：`GET /api/cases/checklist-preview?caseTypeCode=xxx`。
   */
  previewChecklistCount(
    caseTypeCode: string,
  ): Promise<{ count: number; requiredCount: number }>;

  /**
   * 获取文書模板列表。
   * 数据源：`GET /api/document-templates?caseType=xxx`。
   */
  listDocumentTemplates(params: {
    caseType: string;
    language?: string;
  }): Promise<FormTemplate[]>;

  /**
   * 将生成文書定稿。
   * 数据源：`POST /api/generated-documents/:id/finalize`。
   */
  finalizeGeneratedDocument(id: string): Promise<WriteResultWithId>;

  /**
   * 导出生成文書。
   * 数据源：`POST /api/generated-documents/:id/export`。
   */
  exportGeneratedDocument(id: string): Promise<WriteResultWithId>;
}

export { CaseRepositoryError };

/**
 * 创建基于 HTTP 请求的真实 CaseRepository。
 *
 * 仓储只做请求编排与错误归一化：
 * - URL 构造委托给 `buildCaseListSearchParams` / `buildCaseDetailPath`
 * - 请求体构造委托给 `buildXxxPayload`（CaseAdapterWriteBuilders）
 * - 响应适配委托给 `adaptXxx`（CaseAdapterMappers / MutationResults / DetailAggregate）
 * - 错误归一化由 `CaseRepositorySupport.requestAndAdapt` 统一处理
 *
 * @param input - 可选的 fetch、令牌提供者和 API 路径覆盖
 * @returns 实现所有案件 CRUD 操作的仓库实例
 */
export function createCaseRepository(
  input: CaseRepositoryFactoryInput = {},
): CaseRepository {
  const runtime = createRuntime(input);

  return {
    listCases: createListCases(runtime),
    getSummaryCards: adaptCaseSummaryCards,
    getDetail: createGetDetail(runtime),
    getDetailAggregate: createGetDetailAggregate(runtime),
    createCase: createCreateCase(runtime),
    updateCase: createUpdateCase(runtime),
    transitionCase: createTransitionCase(runtime),
    transitionPhase: createTransitionPhase(runtime),
    acknowledgeBillingRisk: createAcknowledgeBillingRisk(runtime),
    updatePostApprovalStage: createUpdatePostApprovalStage(runtime),
    transitionWorkflowStep: createTransitionWorkflowStep(runtime),
    deleteCase: createDeleteCase(runtime),
    bootstrapChecklist: createBootstrapChecklist(runtime),
    getMessages: createGetMessages(runtime),
    getLogEntries: createGetLogEntries(runtime),
    getDocumentItems: createGetDocumentItems(runtime),
    getGeneratedDocuments: createGetGeneratedDocuments(runtime),
    getValidationData: createGetValidationData(runtime),
    getBillingData: createGetBillingData(runtime),
    getBillingTabAggregate: createGetBillingTabAggregate(runtime),
    getSubmissionPackages: createGetSubmissionPackages(runtime),
    getDoubleReviewEntries: createGetDoubleReviewEntries(runtime),
    getTasks: createGetTasks(runtime),
    getDeadlines: createGetDeadlines(runtime),
    createCaseParty: createCreateCaseParty(runtime),
    retryReminderCreation: createRetryReminderCreation(runtime),
    createCommunicationLog: createCreateCommunicationLog(runtime),
    createGeneratedDocument: createCreateGeneratedDocument(runtime),
    finalizeGeneratedDocument: createFinalizeGeneratedDocument(runtime),
    exportGeneratedDocument: createExportGeneratedDocument(runtime),
    createReminder: createCreateReminder(runtime),
    createTask: createCreateTask(runtime),
    completeTask: createCompleteTask(runtime),
    createSubmissionPackage: createCreateSubmissionPackage(runtime),
    listDocumentTemplates: createListDocumentTemplates(runtime),
    previewChecklistCount: createPreviewChecklistCount(runtime),
  };
}
