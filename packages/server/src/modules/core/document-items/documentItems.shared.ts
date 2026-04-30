import type { DocumentItem } from "../model/coreEntities";
import type { DocumentItemListInput } from "../documents.types";

/** 数据库查询返回的 document_item 行类型。 */
export type DocumentItemQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  checklist_item_code: string;
  name: string;
  status: string;
  required_flag: boolean;
  requested_at: unknown;
  received_at: unknown;
  reviewed_at: unknown;
  due_at: unknown;
  owner_side: string;
  last_follow_up_at: unknown;
  note: unknown;
  category: string | null;
  survey_data: unknown;
  waive_reason_latest: unknown;
  waive_reason_code_latest: unknown;
  waived_by_user_id_latest: unknown;
  waived_at_latest: unknown;
  created_at: unknown;
  updated_at: unknown;
};

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toTimestampString(value: unknown): string {
  return toTimestampStringOrNull(value) ?? "";
}

function toJsonObjectOrNull(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      )
        return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** 将数据库行映射为 DocumentItem 实体。
 * @param row 数据库查询结果行
 * @returns DocumentItem 实体
 */
export function mapDocumentItemRow(row: DocumentItemQueryRow): DocumentItem {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    checklistItemCode: row.checklist_item_code,
    name: row.name,
    status: row.status,
    requiredFlag: row.required_flag,
    requestedAt: toTimestampStringOrNull(row.requested_at),
    receivedAt: toTimestampStringOrNull(row.received_at),
    reviewedAt: toTimestampStringOrNull(row.reviewed_at),
    dueAt: toTimestampStringOrNull(row.due_at),
    ownerSide: row.owner_side,
    lastFollowUpAt: toTimestampStringOrNull(row.last_follow_up_at),
    note: toStringOrNull(row.note),
    category: row.category ?? null,
    surveyData: toJsonObjectOrNull(row.survey_data),
    waiveReasonLatest: toStringOrNull(row.waive_reason_latest),
    waiveReasonCodeLatest: toStringOrNull(row.waive_reason_code_latest),
    waivedByUserIdLatest: toStringOrNull(row.waived_by_user_id_latest),
    waivedAtLatest: toTimestampStringOrNull(row.waived_at_latest),
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

export const DOC_ITEM_COLS = `id, org_id, case_id, checklist_item_code, name, status, required_flag, requested_at, received_at, reviewed_at, due_at, owner_side, last_follow_up_at, note, category, survey_data, waive_reason_latest, waive_reason_code_latest, waived_by_user_id_latest, waived_at_latest, created_at, updated_at`;

// ── list filter helpers ──

/** list 查询构建结果。 */
export type ListWhereResult = { where: string[]; params: unknown[] };

/** statusIn 虚拟值展开（missing → pending+revision_required）。
 * @param statusIn 原始状态值列表
 * @returns 展开后的状态值列表（已去重）
 */
export function expandStatusIn(statusIn: string[]): string[] {
  const result: string[] = [];
  for (const s of statusIn) {
    if (s === "missing") {
      result.push("pending", "revision_required");
    } else {
      result.push(s);
    }
  }
  return [...new Set(result)];
}

/** 根据查询参数构建 WHERE 条件与参数数组。
 * @param input 列表查询参数
 * @returns where 子句数组与对应参数
 */
export function buildListFilters(
  input: DocumentItemListInput,
): ListWhereResult {
  const where: string[] = ["status != 'deleted'"];
  const params: unknown[] = [];

  if (input.caseId) {
    params.push(input.caseId);
    where.push("case_id = $" + String(params.length));
  }
  if (input.ownerSide) {
    params.push(input.ownerSide);
    where.push("owner_side = $" + String(params.length));
  }
  if (input.statusIn && input.statusIn.length > 0) {
    appendStatusInClause(input.statusIn, where, params);
  } else if (input.status) {
    params.push(input.status);
    where.push("status = $" + String(params.length));
  }
  if (input.category) {
    params.push(input.category);
    where.push("category = $" + String(params.length));
  }
  return { where, params };
}

function appendStatusInClause(
  statusIn: string[],
  where: string[],
  params: unknown[],
): void {
  const expanded = expandStatusIn(statusIn);
  const hasExpired = expanded.includes("expired");
  const directStatuses = expanded.filter((s) => s !== "expired");

  const clauses: string[] = [];
  if (directStatuses.length > 0) {
    const placeholders = directStatuses.map((s) => {
      params.push(s);
      return "$" + String(params.length);
    });
    clauses.push(`status IN (${placeholders.join(",")})`);
  }
  if (hasExpired) {
    clauses.push(`(status = 'approved' AND due_at < now())`);
  }
  if (clauses.length === 1) {
    where.push(clauses[0]);
  } else {
    where.push(`(${clauses.join(" OR ")})`);
  }
}
