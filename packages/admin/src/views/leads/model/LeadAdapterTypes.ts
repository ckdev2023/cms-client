/**
 * LeadAdapterTypes — 线索适配层类型契约。
 */

import type { LeadSummary, LeadStatus } from "../types";
import type {
  LeadDetail,
  LeadFollowupRecord,
  LeadLogEntry,
  FollowupChannel,
} from "../types-detail";

// ─── List Params ────────────────────────────────────────────────

/**
 * 线索列表 HTTP 查询参数。
 */
export interface LeadListParams {
  /** */
  scope?: string;
  /** */
  search?: string;
  /** */
  status?: string;
  /** */
  ownerUserId?: string;
  /** */
  groupId?: string;
  /** */
  businessType?: string;
  /** */
  tags?: string[];
  /** */
  dateFrom?: string;
  /** */
  dateTo?: string;
  /** */
  page?: number;
  /** */
  limit?: number;
}

export const LEAD_LIST_PARAM_KEYS = [
  "scope",
  "search",
  "status",
  "ownerUserId",
  "groupId",
  "businessType",
  "tags",
  "dateFrom",
  "dateTo",
  "page",
  "limit",
] as const;

export const LEAD_LIST_HTTP_FIELD_MAP: Record<string, string> = {
  scope: "scope",
  search: "search",
  status: "status",
  ownerUserId: "ownerUserId",
  groupId: "groupId",
  businessType: "businessType",
  tags: "tags",
  dateFrom: "dateFrom",
  dateTo: "dateTo",
  page: "page",
  limit: "limit",
};

// ─── Results ────────────────────────────────────────────────────

/**
 * 线索列表接口返回结果（分页）。
 */
export interface LeadListResult {
  /** */
  items: LeadSummary[];
  /** */
  total: number;
  /** */
  page: number;
  /** */
  limit: number;
}

/**
 * 写入操作统一返回结构。
 */
export interface LeadMutationResult {
  /** */
  id: string;
  /** 转客户时服务端返回的客户 ID。 */
  customerId?: string;
  /** 转案件时服务端返回的案件 ID。 */
  caseId?: string;
}

/**
 * 批量操作统一返回结构。
 *
 * 服务端 `bulk/*` 端点返回 `{updatedCount}`（导出端点返回数组），
 * 与单条写入的 `{id}` 形态不同，因此必须用独立类型与适配器避免
 * `adaptLeadMutationResult` 在合法响应上误判为格式错误。
 */
export interface LeadBulkResult {
  /** */
  updatedCount: number;
}

/**
 * 线索详情聚合。
 */
export interface LeadDetailAggregate {
  /** */
  detail: LeadDetail;
  /** */
  followups: LeadFollowupRecord[];
  /** */
  logs: LeadLogEntry[];
}

// ─── Write Inputs ───────────────────────────────────────────────

/**
 * 创建线索表单输入。
 */
export interface LeadCreateInput {
  /** */
  name: string;
  /** */
  phone?: string;
  /** */
  email?: string;
  /** */
  source?: string;
  /** */
  referrer?: string;
  /** */
  businessType?: string;
  /** */
  groupId?: string;
  /** */
  ownerUserId?: string;
  /** */
  nextAction?: string;
  /** */
  nextFollowUp?: string;
  /** */
  language?: string;
  /** */
  note?: string;
}

/**
 * 更新线索表单输入（patch 语义）。
 */
export interface LeadUpdateInput {
  /** */
  name?: string;
  /** */
  phone?: string;
  /** */
  email?: string;
  /** */
  source?: string;
  /** */
  referrer?: string;
  /** */
  businessType?: string;
  /** */
  groupId?: string | null;
  /** */
  ownerUserId?: string | null;
  /** */
  nextAction?: string | null;
  /** */
  nextFollowUp?: string | null;
  /** */
  language?: string;
  /** */
  note?: string | null;
  /** */
  quoteAmount?: number | null;
}

/**
 * 状态流转输入。
 */
export interface LeadStatusInput {
  /** */
  toStatus: LeadStatus;
  /** */
  lostReason?: string;
}

/**
 * 跟进记录输入。
 */
export interface LeadFollowupInput {
  /** */
  channel: FollowupChannel;
  /** */
  summary: string;
  /** */
  conclusion?: string;
  /** */
  nextAction?: string;
  /** */
  nextFollowUp?: string;
}

/**
 * 去重查询参数。
 */
export interface LeadDedupParams {
  /** */
  phone?: string;
  /** */
  email?: string;
}

/**
 * 去重查询结果。
 */
export interface LeadDedupResult {
  /** */
  leads: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    status: string;
  }>;
  /** */
  customers: Array<{ id: string; name: string; phone: string; email: string }>;
}

// ─── Convert Inputs ─────────────────────────────────────────────

/**
 * 转客户输入。
 */
export interface LeadConvertCustomerInput {
  /** 已有客户 ID（传入则跳过创建，直接关联）。 */
  customerId?: string;
  /** 多语名称。 */
  localizedNames?: {
    zh?: string;
    ja?: string;
    en?: string;
    defaultLocale?: "zh" | "ja" | "en";
  };
  /** 去重确认标记。 */
  confirmDedup?: boolean;
}

/**
 * 转案件输入。
 */
export interface LeadConvertCaseInput {
  /** 案件类型代码（snake_case）。 */
  caseTypeCode: string;
  /** 案件负责人 UUID。 */
  ownerUserId: string;
  /** 案件所属组 UUID。 */
  groupId?: string;
}

// ─── Bulk Inputs ────────────────────────────────────────────────

/**
 * 批量指派输入。
 */
export interface LeadBulkAssignInput {
  /** */
  leadIds: string[];
  /** */
  ownerUserId: string;
}

/**
 * 批量状态变更输入。
 */
export interface LeadBulkStatusInput {
  /** */
  leadIds: string[];
  /** */
  toStatus: LeadStatus;
  /** */
  lostReason?: string;
}

/**
 * 批量跟进输入。
 */
export interface LeadBulkFollowupInput {
  /** */
  leadIds: string[];
  /** */
  channel: FollowupChannel;
  /** */
  summary: string;
  /** */
  nextAction?: string;
  /** */
  nextFollowUp?: string;
}

/**
 * 批量标签输入。
 */
export interface LeadBulkTagsInput {
  /** */
  leadIds: string[];
  /** */
  tags: string[];
}

/**
 * 批量导出输入。
 */
export interface LeadBulkExportInput {
  /** */
  leadIds: string[];
  /** */
  format?: "csv" | "xlsx";
}
