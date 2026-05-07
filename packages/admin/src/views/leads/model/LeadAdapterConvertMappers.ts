/**
 * LeadAdapterConvertMappers — 线索转化端点响应适配。
 */

import type { LeadMutationResult } from "./LeadAdapterTypes";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  return typeof v === "string" ? v : "";
}

function readNestedLeadId(record: Record<string, unknown>): string {
  const nested = asRecord(record.lead);
  return nested ? readString(nested, "id") : "";
}

/**
 * 适配 convert-customer 端点返回：`{ lead: { id }, customerId }`。
 *
 * @param value - convert-customer 接口返回的原始 JSON
 * @returns 包含 `id` 和可选 `customerId` 的结果
 */
export function adaptLeadConvertCustomerResult(
  value: unknown,
): LeadMutationResult | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id") || readNestedLeadId(record);
  if (!id) return null;
  return { id, customerId: readString(record, "customerId") || undefined };
}

/**
 * 适配 convert-case 端点返回：`{ lead: { id }, caseId }`。
 *
 * @param value - convert-case 接口返回的原始 JSON
 * @returns 包含 `id` 和可选 `caseId` 的结果
 */
export function adaptLeadConvertCaseResult(
  value: unknown,
): LeadMutationResult | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id") || readNestedLeadId(record);
  if (!id) return null;
  return { id, caseId: readString(record, "caseId") || undefined };
}
