/**
 * 文書模板 adapter — 从 CaseAdapterSupportSeams 抽出以遵守 max-lines 约束。
 */

import type { FormTemplate } from "../types-detail";
import { asRecord, readNumber, readString } from "./CaseAdapterShared";

function readArrayOrItems(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  const r = asRecord(value);
  return r && Array.isArray(r.items) ? (r.items as unknown[]) : null;
}

const DOC_TYPE_I18N_PREFIX = "cases.detail.forms.docType.";

function adaptDocumentTemplateDto(value: unknown): FormTemplate | null {
  const r = asRecord(value);
  if (!r) return null;
  const id = readString(r, "id");
  const templateName = readString(r, "templateName");
  if (!id || !templateName) return null;

  const docType = readString(r, "docType");
  const language = readString(r, "language");
  const versionNo = readNumber(r, "versionNo");

  const metaParts: string[] = [];
  if (docType) metaParts.push(docType);
  if (language) metaParts.push(language);
  if (versionNo > 0) metaParts.push(`v${versionNo}`);

  return {
    id,
    name: templateName,
    meta: metaParts.join(" · "),
    actionLabel: "生成",
    docTypeKey: docType ? `${DOC_TYPE_I18N_PREFIX}${docType}` : undefined,
    docTypeRaw: docType || undefined,
    language: language || undefined,
    versionNo: versionNo > 0 ? versionNo : undefined,
  };
}

/**
 * 适配 `/api/document-templates?caseType=xxx` 返回值为文書模板列表。
 *
 * @param value - 原始 JSON（`{ items: [...] }` 或数组）
 * @returns 模板列表，格式无效时返回 `null`
 */
export function adaptDocumentTemplateList(
  value: unknown,
): FormTemplate[] | null {
  const items = readArrayOrItems(value);
  if (!items) return null;

  return items
    .map((item) => adaptDocumentTemplateDto(item))
    .filter((item): item is FormTemplate => item !== null);
}

function deriveApiPrefix(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "");
}

/**
 * 构建文書模板列表 URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @param params - 查询参数
 * @param params.caseType - 案件类型
 * @param params.language - 语言（可选）
 * @returns 完整 URL，如 `/api/document-templates?caseType=family_stay`
 */
export function buildCaseDocumentTemplatesUrl(
  casesApiPath: string,
  params: { caseType: string; language?: string },
): string {
  const base = `${deriveApiPrefix(casesApiPath)}/document-templates`;
  const qs = new URLSearchParams();
  qs.set("caseType", params.caseType);
  if (params.language) qs.set("language", params.language);
  return `${base}?${qs.toString()}`;
}
