/**
 * LeadAdapterBulkMappers — 批量端点响应适配。
 *
 * 服务端 `bulk/*` 端点返回 `{updatedCount: number}`，`bulk/export` 返回 Lead 数组；
 * 与单条写入端点的 `{id}` 形态不同，必须用独立适配器，否则通用
 * `adaptLeadMutationResult` 会把合法响应判成 `BAD_RESPONSE` 抛出，导致
 * 前端 toast 与列表刷新被打断（用户感知“点应用没反应”）。
 */

import type { LeadBulkResult } from "./LeadAdapterTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const v = record[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return 0;
}

/**
 * 适配批量操作响应。
 *
 * @param value - 批量端点返回的原始 JSON
 * @returns 含 `updatedCount` 的批量结果，永不返回 `null`
 */
export function adaptLeadBulkResult(value: unknown): LeadBulkResult {
  const record = asRecord(value);
  if (record) {
    return { updatedCount: readNumber(record, "updatedCount") };
  }
  if (Array.isArray(value)) {
    return { updatedCount: value.length };
  }
  return { updatedCount: 0 };
}
