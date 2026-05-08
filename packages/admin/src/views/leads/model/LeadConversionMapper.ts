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

/**
 * R-FLOW5-A-8：服务端 `queryCustomerSummary / queryCaseSummary` 的
 * `group` 字段从 string 升级为 `{ id, name } | null`，UI 侧的
 * `resolveGroupLabel` 仍按 string 工作（catalog slug / 本地化 label /
 * UUID 别名表三路解析）。这里把对象形态归一为字符串：
 *
 * - 对象 `name` 优先（多为 catalog slug，如 `tokyo-1` / `osaka`，
 *   能直接命中 catalog 路径并返回本地化 label）；
 * - `name` 缺失时退到 `id`（UUID），交给 `resolveGroupLabel` 走
 *   `groupAliases` 别名表路径；
 * - 兼容旧 fixture / 历史响应直接返回字符串的形态。
 *
 * @param value 服务端返回的 group 字段（string / { id, name } / null / undefined）
 * @returns 适配后的 group 字符串；无可用值时返回空串
 */
function readGroupString(value: unknown): string {
  if (typeof value === "string") return value;
  const obj = asRecord(value);
  if (!obj) return "";
  return readString(obj, "name") || readString(obj, "id");
}

function adaptConvertedCustomerDto(value: unknown): ConvertedCustomer | null {
  const r = asRecord(value);
  if (!r) return null;
  return {
    id: readString(r, "id"),
    customerNo: readString(r, "customerNo") || readString(r, "customerNumber"),
    name: readString(r, "displayName") || readString(r, "name"),
    group: readGroupString(r.group),
    convertedAt: readString(r, "convertedAt"),
    convertedBy: readString(r, "convertedBy"),
  };
}

function adaptConvertedCaseDto(value: unknown): ConvertedCase | null {
  const r = asRecord(value);
  if (!r) return null;
  const caseNo = readString(r, "caseNo");
  return {
    id: readString(r, "id"),
    title: readString(r, "title") || caseNo,
    caseNo,
    applicantName: readString(r, "applicantName") || undefined,
    type: readString(r, "caseTypeCode") || readString(r, "type"),
    group: readGroupString(r.group),
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
