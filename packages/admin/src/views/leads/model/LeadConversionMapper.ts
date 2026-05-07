/**
 * 线索转化 DTO 适配 — 将服务端 convertedCustomer / convertedCase
 * 响应映射为类型化视图模型。
 */

import type {
  LeadConversionInfo,
  ConvertedCustomer,
  ConvertedCase,
} from "../types-detail";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const v = record[key];
  return typeof v === "string" ? v : "";
}

function adaptConvertedCustomerDto(value: unknown): ConvertedCustomer | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    id: readString(r, "id"),
    customerNo: readString(r, "customerNo") || readString(r, "customerNumber"),
    name: readString(r, "displayName") || readString(r, "name"),
    group: readString(r, "group"),
    convertedAt: readString(r, "convertedAt"),
    convertedBy: readString(r, "convertedBy"),
  };
}

function adaptConvertedCaseDto(value: unknown): ConvertedCase | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    id: readString(r, "id"),
    title: readString(r, "caseNo") || readString(r, "title"),
    type: readString(r, "caseTypeCode") || readString(r, "type"),
    group: readString(r, "group"),
    convertedAt: readString(r, "convertedAt"),
    convertedBy: readString(r, "convertedBy"),
  };
}

/**
 * 将详情聚合中的转化信息适配为类型化结构。
 *
 * 同时支持 `record.conversion.convertedCustomer`（嵌套）与
 * `record.convertedCustomer`（顶层）两种服务端响应布局。
 *
 * @param value - 详情聚合原始 JSON
 * @returns 适配后的转化信息
 */
export function adaptConversionInfo(value: unknown): LeadConversionInfo {
  const empty: LeadConversionInfo = {
    dedupResult: null,
    convertedCustomer: null,
    convertedCase: null,
    conversions: [],
  };
  const r = asRecord(value);
  if (!r) return empty;

  const nested = asRecord(r.conversion);
  const customerRaw = nested?.convertedCustomer ?? r.convertedCustomer;
  const caseRaw = nested?.convertedCase ?? r.convertedCase;
  const conversionsRaw = nested?.conversions ?? r.conversions;

  return {
    dedupResult: null,
    convertedCustomer: adaptConvertedCustomerDto(customerRaw),
    convertedCase: adaptConvertedCaseDto(caseRaw),
    conversions: Array.isArray(conversionsRaw)
      ? (conversionsRaw as LeadConversionInfo["conversions"])
      : [],
  };
}
