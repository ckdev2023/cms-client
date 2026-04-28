/**
 * BillingAdapters — 收费模块 DTO → 前端类型适配器。
 *
 * 职责：
 * - DTO adapters：将服务端 DTO 适配为 types.ts 视图模型
 * - displayName fallback：recordedByDisplayName / voidedByDisplayName 缺失时回落 '—'
 * - D10 复用语义：recordStatus='reversed' 时 voidedByDisplayName 表示冲正操作人
 *
 * URL builders 与 filter/input 类型定义见 BillingAdapterUrls.ts。
 */

import type {
  BillingNextNode,
  BillingPlanNode,
  BillingSummaryData,
  CaseBillingRow,
  CollectionResult,
  CollectionResultDetail,
  PaymentLogEntry,
  PaymentRecordStatus,
} from "../types";

export type {
  BillingListFilters,
  BillingRiskAckInput,
  BillingSummaryFilters,
  CreatePaymentInput,
  PaymentLogFilters,
  VoidOrReverseInput,
} from "./BillingAdapterUrls";

export type { BillingListFilters as BillingListParams } from "./BillingAdapterUrls";
export type { BillingSummaryFilters as BillingSummaryParams } from "./BillingAdapterUrls";
export type { PaymentLogFilters as PaymentLogParams } from "./BillingAdapterUrls";
export {
  buildBillingCollectionsBulkUrl,
  buildBillingPlansUrl,
  buildBillingRiskAckUrl,
  buildBillingSummaryUrl,
  buildPaymentRecordReverseUrl,
  buildPaymentRecordVoidUrl,
  buildPaymentRecordsUrl,
} from "./BillingAdapterUrls";

// ─── Shared helpers ─────────────────────────────────────────────

const DISPLAY_NAME_FALLBACK = "—";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(r: Record<string, unknown>, key: string): string {
  const v = r[key];
  return typeof v === "string" ? v : "";
}

function readNullableString(
  r: Record<string, unknown>,
  key: string,
): string | null {
  const v = r[key];
  return typeof v === "string" ? v : null;
}

function readOptionalString(
  r: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = r[key];
  return typeof v === "string" ? v : undefined;
}

function readNumber(r: Record<string, unknown>, key: string): number {
  const v = r[key];
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

// ─── Response wrapper types ─────────────────────────────────────

/** 收费计划列表响应。 */
export interface BillingListResult {
  /** 行项目。 */
  items: CaseBillingRow[];
  /** 总数。 */
  total: number;
}

/** 回款流水列表响应。 */
export interface PaymentLogResult {
  /** 行项目。 */
  items: PaymentLogEntry[];
  /** 行项目别名（向后兼容）。 */
  entries: PaymentLogEntry[];
  /** 总数。 */
  total: number;
}

/** 欠款风险确认状态。 */
export interface BillingRiskAckStatus {
  /** 是否已确认。 */
  acknowledged: boolean;
  /** 确认时间。 */
  acknowledgedAt: string | null;
  /** 确认人展示名。 */
  acknowledgedByDisplayName: string | null;
  /** 原因码。 */
  reasonCode: string | null;
  /** 原因说明。 */
  reasonNote: string | null;
  /** 佐证 URL。 */
  evidenceUrl: string | null;
}

/** 写操作通用响应。 */
export interface BillingMutationResult {
  /** 资源 ID。 */
  id: string;
}

// ─── DTO → view-model adapters ──────────────────────────────────

function computeOverdueDays(dueDate: string | null): number | undefined {
  if (!dueDate) return undefined;
  try {
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) return undefined;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / 86_400_000);
    return diff > 0 ? diff : undefined;
  } catch {
    return undefined;
  }
}

function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "";
  try {
    const d = new Date(dueDate);
    return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("ja-JP");
  } catch {
    return "";
  }
}

function buildNextNode(
  status: string,
  milestoneName: string | null,
  dueDate: string | null,
  unpaidAmount: number,
): BillingNextNode | null {
  if (status === "paid" || !milestoneName) return null;
  return {
    name: milestoneName,
    dueDate: formatDueDate(dueDate),
    amount: unpaidAmount > 0 ? unpaidAmount : undefined,
    overdueDays: computeOverdueDays(dueDate),
  };
}

/**
 * 从 DTO 中提取展示字段（caseName / caseNo / customerName 等），缺失时回落 '—'。
 *
 * @param r - 原始 DTO record
 * @returns 展示字段对象
 */
function readDisplayFields(r: Record<string, unknown>) {
  return {
    caseName: readNullableString(r, "caseName") ?? DISPLAY_NAME_FALLBACK,
    caseNo: readNullableString(r, "caseNo") ?? DISPLAY_NAME_FALLBACK,
    customerName:
      readNullableString(r, "customerName") ?? DISPLAY_NAME_FALLBACK,
    groupId: (readNullableString(r, "groupId") ??
      "") as CaseBillingRow["group"],
    ownerDisplayName:
      readNullableString(r, "ownerDisplayName") ?? DISPLAY_NAME_FALLBACK,
  };
}

/**
 * 将收费计划 DTO 适配为前端列表行数据。
 *
 * @param value - 原始 DTO
 * @returns 适配后的列表行，格式无效时返回 `null`
 */
export function adaptCaseBillingRow(value: unknown): CaseBillingRow | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;
  const caseId = readNullableString(r, "caseId") ?? id;
  const display = readDisplayFields(r);

  const amountDue = readNumber(r, "amountDue");
  const paidAmount = readNumber(r, "paidAmount");
  const unpaidAmount = readNumber(r, "unpaidAmount");
  const status = readString(r, "status") || "due";
  const dueDate = readNullableString(r, "dueDate");
  const milestoneName = readNullableString(r, "milestoneName");

  return {
    id,
    caseId,
    caseName: display.caseName,
    caseNo: display.caseNo,
    client: { name: display.customerName, type: DISPLAY_NAME_FALLBACK },
    group: display.groupId,
    owner: display.ownerDisplayName,
    amountDue,
    amountReceived: paidAmount,
    amountOutstanding: unpaidAmount,
    status: status as CaseBillingRow["status"],
    nextNode: buildNextNode(status, milestoneName, dueDate, unpaidAmount),
    billingRiskAcknowledged: r.billingRiskAcknowledged === true,
    billingRiskAcknowledgedAt: readNullableString(
      r,
      "billingRiskAcknowledgedAt",
    ),
    billingRiskAcknowledgedByDisplayName: readNullableString(
      r,
      "billingRiskAcknowledgedByDisplayName",
    ),
  };
}

/**
 * `CasePaymentRecordDto` → `PaymentLogEntry`。
 *
 * displayName fallback：缺失时回落 '—'。
 * D10 复用语义：`recordStatus='reversed'` 时 `voidedByDisplayName` 表示冲正操作人，
 * adapter 映射到 `operator` 字段；`recordStatus='voided'` 同理。
 *
 * @param value - 原始 DTO
 * @returns 适配后的流水行，格式无效时返回 `null`
 */
export function adaptPaymentLogEntry(value: unknown): PaymentLogEntry | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;

  const recordStatus = (readString(r, "recordStatus") ||
    "valid") as PaymentRecordStatus;
  const recordedBy =
    readNullableString(r, "recordedByDisplayName") ?? DISPLAY_NAME_FALLBACK;
  const voidedBy =
    readNullableString(r, "voidedByDisplayName") ?? DISPLAY_NAME_FALLBACK;
  const operator = recordStatus === "valid" ? recordedBy : voidedBy;

  return {
    id,
    date: readString(r, "receivedAt"),
    caseNo: readNullableString(r, "caseNo") ?? DISPLAY_NAME_FALLBACK,
    caseName: readNullableString(r, "caseName") ?? DISPLAY_NAME_FALLBACK,
    amount: readNumber(r, "amountReceived"),
    node: readNullableString(r, "milestoneName") ?? DISPLAY_NAME_FALLBACK,
    receipt: readNullableString(r, "receiptStorageType") !== null,
    recordStatus,
    operator,
    note: readNullableString(r, "note") ?? "",
    voidedByDisplayName: readOptionalString(r, "voidedByDisplayName"),
    reasonCode: readOptionalString(r, "voidReasonCode"),
  };
}

/**
 * 将汇总 DTO 适配为前端摘要数据。
 *
 * @param value - 原始 DTO
 * @returns 适配后的摘要数据，格式无效时返回 `null`
 */
export function adaptBillingSummary(value: unknown): BillingSummaryData | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    totalDue: readNumber(r, "totalDue"),
    totalReceived: readNumber(r, "totalReceived"),
    totalOutstanding: readNumber(r, "totalOutstanding"),
    overdueAmount: readNumber(r, "overdueAmount"),
  };
}

/**
 * 服务端批量催款响应 → `CollectionResult`。
 *
 * @param value - 原始 DTO
 * @returns 适配后的催款结果，格式无效时返回 `null`
 */
export function adaptCollectionResult(value: unknown): CollectionResult | null {
  const r = asRecord(value);
  if (!r) return null;
  const rawDetails = Array.isArray(r.details) ? (r.details as unknown[]) : [];
  const details: CollectionResultDetail[] = [];
  for (const d of rawDetails) {
    const dr = asRecord(d);
    if (!dr) continue;
    const detail: CollectionResultDetail = {
      caseNo: readString(dr, "caseNo"),
      result: (readString(dr, "result") ||
        "failed") as CollectionResultDetail["result"],
    };
    const reason = readNullableString(dr, "reason");
    if (reason) detail.reason = reason as CollectionResultDetail["reason"];
    const taskId = readNullableString(dr, "taskId");
    if (taskId) detail.taskId = taskId;
    details.push(detail);
  }
  return {
    success: readNumber(r, "success"),
    skipped: readNumber(r, "skipped"),
    failed: readNumber(r, "failed"),
    details,
  };
}

/**
 * 将收费计划 DTO 适配为前端收费节点。
 *
 * @param value - 原始 DTO
 * @returns 适配后的收费节点，格式无效时返回 `null`
 */
export function adaptBillingPlanNode(value: unknown): BillingPlanNode | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;
  return {
    id,
    name: readNullableString(r, "milestoneName") ?? DISPLAY_NAME_FALLBACK,
    amount: readNumber(r, "amountDue"),
    dueDate: readNullableString(r, "dueDate") ?? "",
    status: (readString(r, "status") || "due") as BillingPlanNode["status"],
  };
}

// ─── List / aggregate response adapters ─────────────────────────

/**
 * 将列表响应适配为收费列表结果。
 *
 * @param value - 原始列表响应
 * @returns 适配后的列表结果，格式无效时返回 `null`
 */
export function adaptBillingListResult(
  value: unknown,
): BillingListResult | null {
  const r = asRecord(value);
  if (!r) return null;
  const rawItems = Array.isArray(r.items) ? (r.items as unknown[]) : null;
  if (!rawItems) return null;
  return {
    items: rawItems
      .map(adaptCaseBillingRow)
      .filter((row): row is CaseBillingRow => row !== null),
    total: readNumber(r, "total"),
  };
}

/**
 * 将列表响应适配为流水列表结果。
 *
 * @param value - 原始列表响应
 * @returns 适配后的流水结果，格式无效时返回 `null`
 */
export function adaptPaymentLogResult(value: unknown): PaymentLogResult | null {
  const r = asRecord(value);
  if (!r) return null;
  const rawItems = Array.isArray(r.items) ? (r.items as unknown[]) : null;
  if (!rawItems) return null;
  const adapted = rawItems
    .map(adaptPaymentLogEntry)
    .filter((entry): entry is PaymentLogEntry => entry !== null);
  return {
    items: adapted,
    entries: adapted,
    total: readNumber(r, "total"),
  };
}

/**
 * 将列表响应适配为收费节点数组。
 *
 * @param value - 原始列表响应
 * @returns 适配后的节点列表，格式无效时返回 `null`
 */
export function adaptBillingPlanNodes(
  value: unknown,
): BillingPlanNode[] | null {
  const r = asRecord(value);
  if (!r) return null;
  const rawItems = Array.isArray(r.items) ? (r.items as unknown[]) : null;
  if (!rawItems) return null;
  return rawItems
    .map(adaptBillingPlanNode)
    .filter((node): node is BillingPlanNode => node !== null);
}

/**
 * 通用写操作响应 → `BillingMutationResult`。
 *
 * @param value - 原始 DTO
 * @returns 写操作结果，格式无效时返回 `null`
 */
export function adaptBillingMutationResult(
  value: unknown,
): BillingMutationResult | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  if (!id) return null;
  return { id };
}

/**
 * billing-tab-aggregate 子结构 → `BillingRiskAckStatus`。
 *
 * @param value - aggregate 响应中的 `summary.billingRiskAck` 子对象
 * @returns 风险确认状态，格式无效时返回 `null`
 */
export function adaptBillingRiskAckStatus(
  value: unknown,
): BillingRiskAckStatus | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    acknowledged: r.acknowledged === true,
    acknowledgedAt: readNullableString(r, "acknowledgedAt"),
    acknowledgedByDisplayName: readNullableString(
      r,
      "acknowledgedByDisplayName",
    ),
    reasonCode: readNullableString(r, "reasonCode"),
    reasonNote: readNullableString(r, "reasonNote"),
    evidenceUrl: readNullableString(r, "evidenceUrl"),
  };
}
