import type {
  CustomerDtoAggregates,
  CustomerQueryRow,
} from "./customers.types";

/**
 * 将客户查询结果中的聚合字段映射为 DTO 使用的结构。
 * @param row 数据库查询返回的客户行
 * @returns 供摘要/详情 DTO 复用的案件聚合字段
 */
export function mapCustomerAggregates(
  row: CustomerQueryRow,
): CustomerDtoAggregates {
  return {
    totalCases: toOptionalNumber(row.total_cases),
    activeCases: toOptionalNumber(row.active_cases),
    archivedCases: toOptionalNumber(row.archived_cases),
    caseNames: toStringArray(row.case_names),
    lastCaseCreatedDate: toOptionalDateString(row.last_case_created_date),
    ownerName: toOptionalString(row.owner_name),
  };
}

function toOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toOptionalDateString(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim().length > 0) return value;
  return null;
}
