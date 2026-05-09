import type { DocumentItemDtoLike } from "./DocumentAdapter";

/** 资料中心列表响应 envelope。 */
export interface DocumentItemListResponse {
  /**
   *
   */
  items: unknown;
  /**
   *
   */
  total?: unknown;
}

/** 案件摘要 — 仅取 list/repository 关心的最小子集。 */
export interface CaseSummaryRow {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseName?: string | null;
}

interface DocumentItemDtoLikeRequired {
  id: string;
  caseId: string;
  name: string;
  status: string;
}

function readOptionalString(
  r: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = r[key];
  return typeof v === "string" ? v : undefined;
}

function readRequiredString(
  r: Record<string, unknown>,
  key: string,
): string | null {
  const v = r[key];
  return typeof v === "string" ? v : null;
}

function readDocumentItemRequired(
  r: Record<string, unknown>,
): DocumentItemDtoLikeRequired | null {
  const id = readRequiredString(r, "id");
  const caseId = readRequiredString(r, "caseId");
  const name = readRequiredString(r, "name");
  const status = readRequiredString(r, "status");
  if (!id || !caseId || !name || !status) return null;
  return { id, caseId, name, status };
}

function buildDocumentItemDtoLike(
  r: Record<string, unknown>,
  required: DocumentItemDtoLikeRequired,
): DocumentItemDtoLike {
  return {
    ...required,
    ownerSide: readOptionalString(r, "ownerSide") ?? "applicant",
    providedByRole: readOptionalString(r, "providedByRole") ?? null,
    dueAt: readOptionalString(r, "dueAt") ?? null,
    lastFollowUpAt: readOptionalString(r, "lastFollowUpAt") ?? null,
    referenceCount:
      typeof r.referenceCount === "number" ? r.referenceCount : undefined,
    category: readOptionalString(r, "category"),
    checklistItemCode: readOptionalString(r, "checklistItemCode"),
  };
}

/**
 * 把 list 响应中的单条 raw item 转换为 `DocumentItemDtoLike`，必填字段缺失时返回 null。
 *
 * @param value - 原始响应行（unknown）
 * @returns 转换后的 DTO 或 `null`
 */
export function toDocumentItemDtoLike(
  value: unknown,
): DocumentItemDtoLike | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  const required = readDocumentItemRequired(r);
  if (!required) return null;
  return buildDocumentItemDtoLike(r, required);
}

/**
 * 从案件摘要响应中提取 `id` + `caseName`，兼容 camelCase 与 snake_case 两种返回。
 *
 * @param value - 原始响应行（unknown）
 * @returns 案件摘要行或 `null`
 */
export function toCaseSummaryRow(value: unknown): CaseSummaryRow | null {
  if (!value || typeof value !== "object") return null;
  const r = value as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  const caseName =
    typeof r.caseName === "string"
      ? r.caseName
      : typeof r.case_name === "string"
        ? r.case_name
        : null;
  return { id: r.id, caseName };
}
