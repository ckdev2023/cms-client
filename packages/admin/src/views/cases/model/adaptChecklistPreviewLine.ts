import type { ChecklistPreviewLineItem } from "./checklistPreview.contract";

function readOptionalString(
  rec: Record<string, unknown>,
  key: string,
): string | undefined {
  const v = rec[key];
  return typeof v === "string" ? v : undefined;
}

function normalizeOwnerSide(ownerRaw: string | undefined): string {
  const trimmed = ownerRaw?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "applicant";
}

/**
 * 规范化 checklist-preview HTTP `items[]` 单条（兼容字段缺失）。
 *
 * @param raw JSON 条目
 * @returns 可读条目；`code` 与 `name` 皆缺时返回 `null`
 */
export function adaptChecklistPreviewLine(
  raw: unknown,
): ChecklistPreviewLineItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const code = readOptionalString(r, "code") ?? "";
  const name = readOptionalString(r, "name") ?? "";
  if (!code && !name) return null;

  const ownerSide = normalizeOwnerSide(readOptionalString(r, "ownerSide"));
  const category = readOptionalString(r, "category") ?? null;
  const requiredFlag = r.requiredFlag === true;
  const providedByRole = readOptionalString(r, "providedByRole") ?? null;

  return {
    code: code || name,
    name: name || code || "—",
    ownerSide,
    category,
    requiredFlag,
    providedByRole,
  };
}
