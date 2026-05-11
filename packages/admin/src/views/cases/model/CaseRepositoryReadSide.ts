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
  adaptCaseBillingData,
  adaptCaseDeadlineList,
  adaptCaseDocumentGroups,
  adaptCaseDoubleReviewEntries,
  adaptCaseFormsData,
  adaptCaseLogListResult,
  adaptCaseMessageListResult,
  adaptCaseSubmissionPackages,
  adaptCaseTaskList,
  adaptCaseValidationData,
  adaptDocumentTemplateList,
  buildCaseBillingPlansUrl,
  buildCaseBillingTabAggregateUrl,
  buildCaseDocumentItemsUrl,
  buildCaseDocumentTemplatesUrl,
  buildCaseGeneratedDocumentsUrl,
  buildCaseLogEntriesUrl,
  buildCaseMessagesUrl,
  buildCasePaymentRecordsUrl,
  buildCaseRemindersUrl,
  buildCaseReviewRecordsUrl,
  buildCaseSubmissionPackagesUrl,
  buildCaseTasksUrl,
  buildCaseValidationRunsUrl,
} from "./CaseAdapter";
import {
  requestAndAdapt,
  type CaseRepositoryRuntime,
} from "./CaseRepositorySupport";
import { adaptChecklistPreviewLine } from "./adaptChecklistPreviewLine";
import type { ChecklistPreviewLineItem } from "./checklistPreview.contract";

function parseChecklistPreviewResponsePayload(value: unknown): {
  count: number;
  requiredCount: number;
  items: ChecklistPreviewLineItem[];
} {
  const obj = value as Record<string, unknown>;
  const count = typeof obj.count === "number" ? obj.count : 0;
  const requiredCount =
    typeof obj.requiredCount === "number" ? obj.requiredCount : 0;
  const rawItems = obj.items;
  const items =
    Array.isArray(rawItems) && rawItems.length > 0
      ? rawItems
          .map((row) => adaptChecklistPreviewLine(row))
          .filter((x): x is ChecklistPreviewLineItem => x !== null)
      : [];
  return { count, requiredCount, items };
}

const EMPTY_VALIDATION: ValidationData = {
  lastTime: "",
  blocking: [],
  warnings: [],
  info: [],
};

const EMPTY_BILLING: BillingData = {
  total: "—",
  received: "¥0",
  outstanding: "¥0",
  payments: [],
};

/**
 * 创建获取沟通记录的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取沟通记录的异步函数
 */
export function createGetMessages(runtime: CaseRepositoryRuntime) {
  return async (caseId: string, locale?: string): Promise<MessageItem[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseMessagesUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseMessageListResult(value, locale),
      errorMessage: "Invalid communication logs response",
    });
  };
}

/**
 * 创建获取时间线日志的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取时间线日志的异步函数
 */
export function createGetLogEntries(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<LogEntry[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseLogEntriesUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: adaptCaseLogListResult,
      errorMessage: "Invalid timeline response",
    });
  };
}

/**
 * 创建获取资料清单的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取资料清单的异步函数
 */
export function createGetDocumentItems(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<DocumentGroup[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseDocumentItemsUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseDocumentGroups(value) ?? [],
      errorMessage: "Invalid document items response",
    });
  };
}

/**
 * 创建获取已生成文书列表的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取已生成文书列表的异步函数
 */
export function createGetGeneratedDocuments(runtime: CaseRepositoryRuntime) {
  const emptyForms: FormsData = { templates: [], generated: [] };
  return async (caseId: string, locale?: string): Promise<FormsData> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return emptyForms;

    return requestAndAdapt({
      runtime,
      url: buildCaseGeneratedDocumentsUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseFormsData(value, locale) ?? emptyForms,
      errorMessage: "Invalid generated documents response",
    });
  };
}

/**
 * 创建获取校验运行数据的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取校验运行数据的异步函数
 */
export function createGetValidationData(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<ValidationData> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return EMPTY_VALIDATION;

    return requestAndAdapt({
      runtime,
      url: buildCaseValidationRunsUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseValidationData(value) ?? EMPTY_VALIDATION,
      errorMessage: "Invalid validation runs response",
    });
  };
}

function extractItemsArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const items = (value as Record<string, unknown>).items;
    if (Array.isArray(items)) return items;
  }
  return [];
}

/**
 * 适配 billing tab aggregate 响应为 `{ plans, payments }` 输入，
 * 再交由 `adaptCaseBillingData` 统一适配为 `BillingData`。
 *
 * @param body - aggregate 端点返回的原始 JSON
 * @returns 适配后的 BillingData 或 null
 */
function adaptBillingTabAggregateResponse(body: unknown): BillingData | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const r = body as Record<string, unknown>;

  return adaptCaseBillingData({
    plans: extractItemsArray(r.plans),
    payments: extractItemsArray(r.recentPayments),
  });
}

/**
 * 创建获取 billing tab aggregate 的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取 billing tab aggregate 的异步函数（返回原始 JSON body）
 */
export function createGetBillingTabAggregate(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<unknown> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return null;

    return requestAndAdapt({
      runtime,
      url: buildCaseBillingTabAggregateUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (v) => v,
      errorMessage: "Invalid billing tab aggregate response",
    });
  };
}

async function fetchBillingDataViaLegacy(
  runtime: CaseRepositoryRuntime,
  caseId: string,
): Promise<BillingData> {
  const plansUrl = buildCaseBillingPlansUrl(runtime.apiPath, caseId);
  const paymentsUrl = buildCasePaymentRecordsUrl(runtime.apiPath, caseId);

  const [plansBody, paymentsBody] = await Promise.all([
    requestAndAdapt({
      runtime,
      url: plansUrl,
      method: "GET",
      adapt: (v) => v,
      errorMessage: "Invalid billing plans response",
    }),
    requestAndAdapt({
      runtime,
      url: paymentsUrl,
      method: "GET",
      adapt: (v) => v,
      errorMessage: "Invalid payment records response",
    }).catch(() => ({ items: [], total: 0 })),
  ]);

  const combined = { plans: plansBody, payments: paymentsBody };
  return adaptCaseBillingData(combined) ?? EMPTY_BILLING;
}

/**
 * 创建获取收费计划与入金记录的读侧请求函数。
 *
 * 首屏优先 aggregate 端点（`GET /api/cases/:id/billing-tab-aggregate`）；
 * aggregate 失败（404 / 500 / 网络错误）时回退到 plans+payments 双拉（P0 双轨期）。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取收费与入金数据的异步函数
 */
export function createGetBillingData(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<BillingData> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return EMPTY_BILLING;

    try {
      const aggregateBody = await requestAndAdapt({
        runtime,
        url: buildCaseBillingTabAggregateUrl(runtime.apiPath, normalizedId),
        method: "GET",
        adapt: (v) => v,
        errorMessage: "Invalid billing tab aggregate response",
      });
      const result = adaptBillingTabAggregateResponse(aggregateBody);
      if (result) return result;
    } catch {
      // aggregate 失败（404 / 500 / 网络），回退 legacy 双拉
    }

    return fetchBillingDataViaLegacy(runtime, normalizedId);
  };
}

/**
 * 创建获取提交包列表的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取提交包列表的异步函数
 */
export function createGetSubmissionPackages(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<SubmissionPackage[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseSubmissionPackagesUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseSubmissionPackages(value) ?? [],
      errorMessage: "Invalid submission packages response",
    });
  };
}

/**
 * 创建获取双人复核记录的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取双人复核记录的异步函数
 */
export function createGetDoubleReviewEntries(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<DoubleReviewEntry[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseReviewRecordsUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseDoubleReviewEntries(value) ?? [],
      errorMessage: "Invalid review records response",
    });
  };
}

/**
 * 创建获取任务列表的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取任务列表的异步函数
 */
export function createGetTasks(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<TaskItem[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseTasksUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseTaskList(value) ?? [],
      errorMessage: "Invalid tasks response",
    });
  };
}

/**
 * 创建获取期限/提醒列表的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取期限/提醒列表的异步函数
 */
export function createGetDeadlines(runtime: CaseRepositoryRuntime) {
  return async (caseId: string): Promise<DeadlineItem[]> => {
    const normalizedId = caseId.trim();
    if (!normalizedId) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseRemindersUrl(runtime.apiPath, normalizedId),
      method: "GET",
      adapt: (value) => adaptCaseDeadlineList(value) ?? [],
      errorMessage: "Invalid reminders response",
    });
  };
}

/**
 * 创建获取文書模板列表的读侧请求函数。
 *
 * @param runtime - 仓储运行时上下文
 * @returns 读取文書模板列表的异步函数
 */
export function createListDocumentTemplates(runtime: CaseRepositoryRuntime) {
  return async (params: {
    caseType: string;
    language?: string;
  }): Promise<FormTemplate[]> => {
    if (!params.caseType.trim()) return [];

    return requestAndAdapt({
      runtime,
      url: buildCaseDocumentTemplatesUrl(runtime.apiPath, params),
      method: "GET",
      adapt: (value) => adaptDocumentTemplateList(value) ?? [],
      errorMessage: "Invalid document templates response",
    });
  };
}

/**
 * 创建资料清单条数预览闭包（建案前置校验用）。
 * @param runtime - 仓库运行时上下文
 * @returns 接收 caseTypeCode 返回 checklist 总条数与必须项条数
 */
export function createPreviewChecklistCount(runtime: CaseRepositoryRuntime) {
  return async (
    caseTypeCode: string,
  ): Promise<{
    count: number;
    requiredCount: number;
    items?: ChecklistPreviewLineItem[];
  }> => {
    if (!caseTypeCode.trim()) return { count: 0, requiredCount: 0, items: [] };

    return requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/checklist-preview?caseTypeCode=${encodeURIComponent(caseTypeCode)}&includeItems=1`,
      method: "GET",
      adapt: parseChecklistPreviewResponsePayload,
      errorMessage: "Invalid checklist preview response",
    });
  };
}
