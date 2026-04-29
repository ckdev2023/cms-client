import type { CaseDetail, CaseListItem, CaseSummaryCardData } from "../types";
import type {
  BillingData,
  DeadlineItem,
  DocumentGroup,
  DoubleReviewEntry,
  FormsData,
  LogEntry,
  MessageItem,
  SubmissionPackage,
  TaskItem,
  ValidationData,
} from "../types-detail";
import {
  adaptCaseDetailAggregate,
  adaptCaseListResult,
  adaptCaseMutationResult,
  adaptCaseSummaryCards,
  adaptCaseTransitionResult,
  adaptDeleteCaseResult,
  buildBillingRiskAckPayload,
  buildCaseDetailPath,
  buildCaseListSearchParams,
  buildCasePartiesApiPath,
  buildCreateCasePayload,
  buildCreateCasePartyPayload,
  buildPostApprovalPayload,
  buildTransitionPayload,
  buildUpdateCasePayload,
  buildWorkflowStepTransitionPayload,
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
  requestAndAdapt,
  type CaseRepositoryFactoryInput,
  type CaseRepositoryRuntime,
} from "./CaseRepositorySupport";
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
} from "./CaseRepositoryReadSide";

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
  getMessages(caseId: string): Promise<MessageItem[]>;

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
  getGeneratedDocuments(caseId: string): Promise<FormsData>;

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
   * P1 重试创建续签提醒。
   * 数据源：`POST /api/cases/:id/retry-reminder-creation`。
   */
  retryReminderCreation(caseId: string): Promise<CaseMutationResult>;
}

export { CaseRepositoryError };

function createListCases(runtime: CaseRepositoryRuntime) {
  return async (params: CaseListParams): Promise<CaseListResult> => {
    const query = buildCaseListSearchParams(params).toString();
    const url = query ? `${runtime.apiPath}?${query}` : runtime.apiPath;
    return requestAndAdapt({
      runtime,
      url,
      method: "GET",
      adapt: adaptCaseListResult,
      errorMessage: "Invalid case list response",
    });
  };
}

function createGetDetail(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<CaseDetail | null> => {
    const aggregate = await createGetDetailAggregate(runtime)(id);
    return aggregate?.detail ?? null;
  };
}

function createGetDetailAggregate(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<CaseDetailAggregate | null> => {
    const normalizedId = id.trim();
    if (!normalizedId) return null;

    return requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, normalizedId)}/aggregate`,
      method: "GET",
      adapt: adaptCaseDetailAggregate,
      errorMessage: "Invalid case detail aggregate response",
    });
  };
}

function createCreateCase(runtime: CaseRepositoryRuntime) {
  return async (input: CaseCreateInput): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: runtime.apiPath,
      method: "POST",
      body: buildCreateCasePayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid create case response",
    });
}

function createUpdateCase(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseUpdateInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildCaseDetailPath(runtime.apiPath, id),
      method: "PATCH",
      body: buildUpdateCasePayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid update case response",
    });
}

function createTransitionCase(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseTransitionInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/transition`,
      method: "POST",
      body: buildTransitionPayload(input),
      adapt: adaptCaseTransitionResult,
      errorMessage: "Invalid case transition response",
    });
}

function createTransitionPhase(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: {
      toPhase: string;
      closeReason?: string;
      resultOutcome?: string;
    },
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/phase-transition`,
      method: "POST",
      body: input,
      adapt: adaptCaseTransitionResult,
      errorMessage: "Invalid phase transition response",
    });
}

function createAcknowledgeBillingRisk(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseBillingRiskAckInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/billing-risk-ack`,
      method: "POST",
      body: buildBillingRiskAckPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid billing risk acknowledgment response",
    });
}

function createUpdatePostApprovalStage(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CasePostApprovalInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/post-approval-stage`,
      method: "POST",
      body: buildPostApprovalPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid post-approval stage response",
    });
}

function createTransitionWorkflowStep(runtime: CaseRepositoryRuntime) {
  return async (
    id: string,
    input: CaseWorkflowStepTransitionInput,
  ): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: `${buildCaseDetailPath(runtime.apiPath, id)}/workflow-step-transition`,
      method: "POST",
      body: buildWorkflowStepTransitionPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid workflow step transition response",
    });
}

function createDeleteCase(runtime: CaseRepositoryRuntime) {
  return async (id: string): Promise<void> => {
    await requestAndAdapt({
      runtime,
      url: buildCaseDetailPath(runtime.apiPath, id),
      method: "DELETE",
      adapt: adaptDeleteCaseResult,
      errorMessage: "Invalid delete case response",
    });
  };
}

// ─── Case Parties (p0-fe-008-01) ─────────────────────────────────

function createCreateCaseParty(runtime: CaseRepositoryRuntime) {
  return async (input: CasePartyCreateInput): Promise<CaseMutationResult> =>
    requestAndAdapt({
      runtime,
      url: buildCasePartiesApiPath(runtime.apiPath),
      method: "POST",
      body: buildCreateCasePartyPayload(input),
      adapt: adaptCaseMutationResult,
      errorMessage: "Invalid create case party response",
    });
}

// ─── Retry Reminder Creation (p1-fe-005-01) ──────────────────────

function createRetryReminderCreation(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<CaseMutationResult> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) {
      throw new CaseRepositoryError({
        code: "VALIDATION_ERROR",
        message: "Missing case ID",
      });
    }
    return requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/${normalizedId}/retry-reminder-creation`,
      method: "POST",
      adapt: adaptCaseMutationResult,
      errorMessage: "Failed to retry reminder creation",
    });
  };
}

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
  };
}
