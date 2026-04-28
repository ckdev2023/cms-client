/**
 * BillingAdapterUrls — 收费模块 URL 构造器与 filter/input 类型定义。
 *
 * 从 BillingAdapters 分离以遵守 max-lines 约束。
 */

// ─── Filter / input types ───────────────────────────────────────

/** 收费计划列表过滤参数。 */
export interface BillingListFilters {
  /** 收费状态筛选。 */
  status?: string;
  /** 分组 ID 筛选。 */
  groupId?: string;
  /** 负责人 ID 筛选。 */
  ownerId?: string;
  /** 模糊搜索关键字。 */
  q?: string;
  /** 分页页码。 */
  page?: number;
  /** 分页条数。 */
  limit?: number;
  /** 案件 ID 筛选。 */
  caseId?: string;
}

/** 回款流水列表过滤参数。 */
export interface PaymentLogFilters {
  /** 案件 ID 筛选。 */
  caseId?: string;
  /** 收费计划 ID 筛选。 */
  billingPlanId?: string;
  /** 记录状态筛选。 */
  recordStatus?: string;
  /** 模糊搜索关键字。 */
  q?: string;
  /** 起始日期。 */
  from?: string;
  /** 截止日期。 */
  to?: string;
  /** 分组 ID 筛选。 */
  groupId?: string;
  /** 负责人 ID 筛选。 */
  ownerId?: string;
  /** 分页页码。 */
  page?: number;
  /** 分页条数。 */
  limit?: number;
}

/** 收费汇总过滤参数。 */
export interface BillingSummaryFilters {
  /** 收费状态筛选。 */
  status?: string;
  /** 分组 ID 筛选。 */
  groupId?: string;
  /** 负责人 ID 筛选。 */
  ownerId?: string;
  /** 模糊搜索关键字。 */
  q?: string;
  /** 起始日期。 */
  from?: string;
  /** 截止日期。 */
  to?: string;
}

/** 登记回款输入。 */
export interface CreatePaymentInput {
  /** 收费计划 ID。 */
  billingPlanId: string;
  /** 回款金额。 */
  amountReceived: number;
  /** 回款日期（ISO 日期字符串）。 */
  receivedAt: string;
  /** 支付方式。 */
  paymentMethod?: string | null;
  /** 备注。 */
  note?: string | null;
}

/** 作废/冲正输入。 */
export interface VoidOrReverseInput {
  /** 原因码。 */
  reasonCode: string;
  /** 原因说明。 */
  reasonNote?: string | null;
}

/** 欠款风险确认输入。 */
export interface BillingRiskAckInput {
  /** 原因码。 */
  reasonCode: string;
  /** 原因说明。 */
  reasonNote?: string;
  /** 佐证 URL。 */
  evidenceUrl?: string;
}

// ─── URL builders ───────────────────────────────────────────────

function appendParam(
  params: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value !== undefined && value !== "" && value !== null) {
    params.append(key, String(value));
  }
}

/**
 * 构造收费计划列表端点 URL。
 *
 * @param apiPath - 基路径（默认 `/api`）
 * @param filters - 可选列表过滤参数
 * @returns 完整 URL 字符串
 */
export function buildBillingPlansUrl(
  apiPath: string,
  filters?: BillingListFilters,
): string {
  const params = new URLSearchParams();
  if (filters) {
    appendParam(params, "caseId", filters.caseId);
    appendParam(params, "status", filters.status);
    appendParam(params, "groupId", filters.groupId);
    appendParam(params, "ownerId", filters.ownerId);
    appendParam(params, "q", filters.q);
    appendParam(params, "page", filters.page);
    appendParam(params, "limit", filters.limit);
  }
  const qs = params.toString();
  return qs ? `${apiPath}/billing-plans?${qs}` : `${apiPath}/billing-plans`;
}

/**
 * 构造收费汇总端点 URL。
 *
 * @param apiPath - 基路径
 * @param filters - 可选汇总过滤参数
 * @returns 完整 URL 字符串
 */
export function buildBillingSummaryUrl(
  apiPath: string,
  filters?: BillingSummaryFilters,
): string {
  const params = new URLSearchParams();
  if (filters) {
    appendParam(params, "status", filters.status);
    appendParam(params, "groupId", filters.groupId);
    appendParam(params, "ownerId", filters.ownerId);
    appendParam(params, "q", filters.q);
    appendParam(params, "from", filters.from);
    appendParam(params, "to", filters.to);
  }
  const qs = params.toString();
  return qs ? `${apiPath}/billing-summary?${qs}` : `${apiPath}/billing-summary`;
}

/**
 * 构造回款记录列表端点 URL。
 *
 * @param apiPath - 基路径
 * @param filters - 可选流水过滤参数
 * @returns 完整 URL 字符串
 */
export function buildPaymentRecordsUrl(
  apiPath: string,
  filters?: PaymentLogFilters,
): string {
  const params = new URLSearchParams();
  if (filters) {
    appendParam(params, "caseId", filters.caseId);
    appendParam(params, "billingPlanId", filters.billingPlanId);
    appendParam(params, "recordStatus", filters.recordStatus);
    appendParam(params, "q", filters.q);
    appendParam(params, "from", filters.from);
    appendParam(params, "to", filters.to);
    appendParam(params, "groupId", filters.groupId);
    appendParam(params, "ownerId", filters.ownerId);
    appendParam(params, "page", filters.page);
    appendParam(params, "limit", filters.limit);
  }
  const qs = params.toString();
  return qs ? `${apiPath}/payment-records?${qs}` : `${apiPath}/payment-records`;
}

/**
 * 构造批量催款端点 URL。
 *
 * @param apiPath - 基路径
 * @returns 完整 URL 字符串
 */
export function buildBillingCollectionsBulkUrl(apiPath: string): string {
  return `${apiPath}/billing-collections/bulk`;
}

/**
 * 构造欠款风险确认端点 URL。
 *
 * @param apiPath - 基路径
 * @param caseId - 案件 ID
 * @returns 完整 URL 字符串
 */
export function buildBillingRiskAckUrl(
  apiPath: string,
  caseId: string,
): string {
  return `${apiPath}/cases/${encodeURIComponent(caseId)}/billing-risk-ack`;
}

/**
 * 构造回款作废端点 URL。
 *
 * @param apiPath - 基路径
 * @param id - 回款记录 ID
 * @returns 完整 URL 字符串
 */
export function buildPaymentRecordVoidUrl(apiPath: string, id: string): string {
  return `${apiPath}/payment-records/${encodeURIComponent(id)}/void`;
}

/**
 * 构造回款冲正端点 URL。
 *
 * @param apiPath - 基路径
 * @param id - 回款记录 ID
 * @returns 完整 URL 字符串
 */
export function buildPaymentRecordReverseUrl(
  apiPath: string,
  id: string,
): string {
  return `${apiPath}/payment-records/${encodeURIComponent(id)}/reverse`;
}
