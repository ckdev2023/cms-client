/**
 * LeadAdapterWriteBuilders — 写入请求体构造 + URL 构造 + 筛选转换。
 */

import type { LeadFiltersState } from "../types";
import type {
  LeadListParams,
  LeadCreateInput,
  LeadUpdateInput,
  LeadStatusInput,
  LeadFollowupInput,
  LeadDedupParams,
  LeadConvertCustomerInput,
  LeadConvertCaseInput,
  LeadBulkAssignInput,
  LeadBulkStatusInput,
  LeadBulkFollowupInput,
  LeadBulkTagsInput,
  LeadBulkExportInput,
} from "./LeadAdapterTypes";
import {
  LEAD_LIST_PARAM_KEYS,
  LEAD_LIST_HTTP_FIELD_MAP,
} from "./LeadAdapterTypes";

// ─── URL / Path builders ────────────────────────────────────────

function normalizeFilterValue(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * 将列表筛选参数转换为 URLSearchParams，空值自动省略。
 *
 * @param params - 线索列表查询参数
 * @returns 序列化后的 URLSearchParams
 */
export function buildLeadListSearchParams(
  params: LeadListParams,
): URLSearchParams {
  const sp = new URLSearchParams();

  for (const key of LEAD_LIST_PARAM_KEYS) {
    const raw = params[key];
    if (raw === undefined || raw === null) continue;

    const httpKey = LEAD_LIST_HTTP_FIELD_MAP[key] ?? key;

    if (Array.isArray(raw)) {
      for (const item of raw) {
        const v = typeof item === "string" ? item.trim() : "";
        if (v) sp.append(httpKey, v);
      }
    } else if (typeof raw === "number") {
      if (raw > 0) sp.set(httpKey, String(raw));
    } else {
      const normalized = normalizeFilterValue(raw);
      if (normalized) sp.set(httpKey, normalized);
    }
  }

  return sp;
}

/**
 * 构造线索详情 REST 路径。
 *
 * @param apiPath - API 基路径
 * @param leadId - 线索 ID
 * @returns 完整路径
 */
export function buildLeadDetailPath(apiPath: string, leadId: string): string {
  return `${apiPath}/${encodeURIComponent(leadId)}`;
}

/**
 * 构造线索跟进记录路径。
 *
 * @param apiPath - API 基路径
 * @param leadId - 线索 ID
 * @returns 完整路径
 */
export function buildLeadFollowupsPath(
  apiPath: string,
  leadId: string,
): string {
  return `${apiPath}/${encodeURIComponent(leadId)}/followups`;
}

/**
 * 构造线索日志路径。
 *
 * @param apiPath - API 基路径
 * @param leadId - 线索 ID
 * @returns 完整路径
 */
export function buildLeadLogsPath(apiPath: string, leadId: string): string {
  return `${apiPath}/${encodeURIComponent(leadId)}/logs`;
}

/**
 * 构造线索状态流转路径。
 *
 * @param apiPath - API 基路径
 * @param leadId - 线索 ID
 * @returns 完整路径
 */
export function buildLeadStatusPath(apiPath: string, leadId: string): string {
  return `${apiPath}/${encodeURIComponent(leadId)}/status`; // i18n-skip
}

/**
 * 构造去重查询路径。
 *
 * @param apiPath - API 基路径
 * @returns 完整路径
 */
export function buildLeadDedupPath(apiPath: string): string {
  return `${apiPath.replace(/\/leads\/?$/, "")}/leads/dedup`;
}

/**
 * 构造批量操作路径。
 *
 * @param apiPath - API 基路径
 * @param action - 操作名称
 * @returns 完整路径
 */
export function buildLeadBulkPath(apiPath: string, action: string): string {
  return `${apiPath}/bulk/${action}`;
}

// ─── Filters → Params conversion ────────────────────────────────

/**
 * 将 UI 筛选状态转换为列表查询参数。
 *
 * @param filters - UI 筛选状态
 * @returns 列表查询参数
 */
export function filtersToListParams(
  filters: LeadFiltersState & { tags?: string[] },
): LeadListParams {
  return {
    scope: filters.scope || undefined,
    search: filters.search || undefined,
    status: filters.status || undefined,
    ownerUserId: filters.owner || undefined,
    groupId: filters.group || undefined,
    businessType: filters.businessType || undefined,
    tags: filters.tags && filters.tags.length > 0 ? filters.tags : undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
}

// ─── Internal helpers ───────────────────────────────────────────

function trimOrUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function nullableString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed || null;
}

// ─── Write Payload Builders ─────────────────────────────────────

/**
 * 构造创建线索请求体。
 *
 * @param input - 创建表单输入
 * @returns JSON 请求体
 */
export function buildLeadCreatePayload(
  input: LeadCreateInput,
): Record<string, unknown> {
  return {
    name: input.name.trim(),
    phone: trimOrUndefined(input.phone),
    email: trimOrUndefined(input.email),
    sourceChannel: trimOrUndefined(input.source),
    referrer: trimOrUndefined(input.referrer),
    intendedCaseType: trimOrUndefined(input.businessType),
    groupId: trimOrUndefined(input.groupId),
    ownerUserId: trimOrUndefined(input.ownerUserId),
    nextAction: trimOrUndefined(input.nextAction),
    nextFollowUpAt: trimOrUndefined(input.nextFollowUp),
    language: trimOrUndefined(input.language),
    note: trimOrUndefined(input.note),
  };
}

/**
 * 构造更新线索请求体（patch 语义，仅发送变更字段）。
 *
 * @param input - 更新表单输入
 * @returns JSON 请求体
 */
export function buildLeadUpdatePayload(
  input: LeadUpdateInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const fieldMap: Array<[keyof LeadUpdateInput, string]> = [
    ["name", "name"],
    ["phone", "phone"],
    ["email", "email"],
    ["source", "sourceChannel"],
    ["referrer", "referrer"],
    ["businessType", "intendedCaseType"],
    ["nextAction", "nextAction"],
    ["note", "note"],
  ];

  for (const [inputKey, payloadKey] of fieldMap) {
    const val = input[inputKey];
    if (val !== undefined) {
      payload[payloadKey] = typeof val === "string" ? nullableString(val) : val;
    }
  }

  if (input.groupId !== undefined) payload.groupId = input.groupId;
  if (input.ownerUserId !== undefined) payload.ownerUserId = input.ownerUserId;
  if (input.nextFollowUp !== undefined)
    payload.nextFollowUpAt = nullableString(input.nextFollowUp);
  if (input.language !== undefined)
    payload.language = trimOrUndefined(input.language);
  if (input.quoteAmount !== undefined) payload.quoteAmount = input.quoteAmount;

  return payload;
}

/**
 * 构造状态流转请求体。
 *
 * @param input - 状态流转输入
 * @returns JSON 请求体
 */
export function buildLeadStatusPayload(
  input: LeadStatusInput,
): Record<string, unknown> {
  return {
    status: input.toStatus,
    ...(input.lostReason !== undefined ? { lostReason: input.lostReason } : {}),
  };
}

/**
 * 构造跟进记录请求体。
 *
 * @param input - 跟进记录输入
 * @returns JSON 请求体
 */
export function buildLeadFollowupPayload(
  input: LeadFollowupInput,
): Record<string, unknown> {
  return {
    channel: input.channel,
    summary: input.summary.trim(),
    conclusion: trimOrUndefined(input.conclusion),
    nextAction: trimOrUndefined(input.nextAction),
    nextFollowUpAt: trimOrUndefined(input.nextFollowUp),
  };
}

/**
 * 构造去重查询参数。
 *
 * @param input - 去重查询参数
 * @returns 序列化后的查询参数
 */
export function buildLeadDedupParams(input: LeadDedupParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (input.phone?.trim()) sp.set("phone", input.phone.trim());
  if (input.email?.trim()) sp.set("email", input.email.trim());
  return sp;
}

/**
 * 构造批量指派请求体。
 *
 * @param input - 批量指派输入
 * @returns JSON 请求体
 */
export function buildBulkAssignPayload(
  input: LeadBulkAssignInput,
): Record<string, unknown> {
  return { leadIds: input.leadIds, ownerUserId: input.ownerUserId };
}

/**
 * 构造批量状态变更请求体。
 *
 * @param input - 批量状态变更输入
 * @returns JSON 请求体
 */
export function buildBulkStatusPayload(
  input: LeadBulkStatusInput,
): Record<string, unknown> {
  return {
    leadIds: input.leadIds,
    status: input.toStatus,
    ...(input.lostReason !== undefined ? { lostReason: input.lostReason } : {}),
  };
}

/**
 * 构造批量跟进请求体。
 *
 * @param input - 批量跟进输入
 * @returns JSON 请求体
 */
export function buildBulkFollowupPayload(
  input: LeadBulkFollowupInput,
): Record<string, unknown> {
  return {
    leadIds: input.leadIds,
    channel: input.channel,
    summary: input.summary.trim(),
    nextAction: trimOrUndefined(input.nextAction),
    nextFollowUpAt: trimOrUndefined(input.nextFollowUp),
  };
}

/**
 * 构造批量标签请求体。
 *
 * @param input - 批量标签输入
 * @returns JSON 请求体
 */
export function buildBulkTagsPayload(
  input: LeadBulkTagsInput,
): Record<string, unknown> {
  return { leadIds: input.leadIds, tags: input.tags };
}

/**
 * 构造批量导出请求体。
 *
 * @param input - 批量导出输入
 * @returns JSON 请求体
 */
export function buildBulkExportPayload(
  input: LeadBulkExportInput,
): Record<string, unknown> {
  return {
    leadIds: input.leadIds,
    ...(input.format ? { format: input.format } : {}),
  };
}

// ─── Convert Path / Payload Builders ────────────────────────────

/**
 * 构造转客户 REST 路径。
 *
 * @param apiPath - API 基路径
 * @param leadId - 线索 ID
 * @returns 完整路径
 */
export function buildLeadConvertCustomerPath(
  apiPath: string,
  leadId: string,
): string {
  return `${buildLeadDetailPath(apiPath, leadId)}/convert-customer`;
}

/**
 * 构造转案件 REST 路径。
 *
 * @param apiPath - API 基路径
 * @param leadId - 线索 ID
 * @returns 完整路径
 */
export function buildLeadConvertCasePath(
  apiPath: string,
  leadId: string,
): string {
  return `${buildLeadDetailPath(apiPath, leadId)}/convert-case`;
}

/**
 * 构造转客户请求体。
 *
 * @param input - 转客户输入
 * @returns JSON 请求体
 */
export function buildLeadConvertCustomerPayload(
  input: LeadConvertCustomerInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.customerId?.trim()) payload.customerId = input.customerId.trim();
  if (input.localizedNames) payload.localizedNames = input.localizedNames;
  if (input.confirmDedup) payload.confirmDedup = true;
  return payload;
}

/**
 * 构造转案件请求体。
 *
 * @param input - 转案件输入
 * @returns JSON 请求体
 */
export function buildLeadConvertCasePayload(
  input: LeadConvertCaseInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
  };
  if (input.groupId?.trim()) payload.groupId = input.groupId.trim();
  return payload;
}
