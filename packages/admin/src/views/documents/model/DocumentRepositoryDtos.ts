import type { DocumentItemDtoLike } from "./DocumentAdapter";
import type { CompletionRate, SharedExpiryRiskData } from "../types";
import type {
  DocumentItemDto,
  DocumentFileDto,
} from "./DocumentRepositoryTypes";

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

// ─── 自 DocumentRepositoryTypes.ts 迁入（该文件名为 Types 却混着运行时 parser）───

function str(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function strNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

/**
 * 后端资料项 JSON → 强类型 DTO 映射。
 *
 * @param value - 后端 JSON 响应
 * @returns 资料项 DTO
 */
export function toFullDocumentItemDto(value: unknown): DocumentItemDto {
  const r = (value ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id, ""),
    caseId: str(r.caseId, ""),
    name: str(r.name, ""),
    status: str(r.status, ""),
    ownerSide: str(r.ownerSide, "applicant"),
    dueAt: strNull(r.dueAt),
    lastFollowUpAt: strNull(r.lastFollowUpAt),
    waiveReasonCodeLatest: strNull(r.waiveReasonCodeLatest),
    waiveReasonLatest: strNull(r.waiveReasonLatest),
    waivedAtLatest: strNull(r.waivedAtLatest),
    waivedByUserIdLatest: strNull(r.waivedByUserIdLatest),
  };
}

/**
 * 后端资料文件 JSON → 强类型 DTO 映射。
 *
 * @param value - 后端 JSON 响应
 * @returns 资料文件 DTO
 */
export function toDocumentFileDto(value: unknown): DocumentFileDto {
  const r = (value ?? {}) as Record<string, unknown>;
  return {
    id: str(r.id, ""),
    requirementId: str(r.requirementId, ""),
    fileName: str(r.fileName, ""),
    fileUrl: strNull(r.fileUrl),
    relativePath: strNull(r.relativePath),
    fileKey: str(r.fileKey, ""),
    versionNo: typeof r.versionNo === "number" ? r.versionNo : 0,
    storageType: str(r.storageType, "local_server"),
    reviewStatus: str(r.reviewStatus, "pending"),
    reviewBy: strNull(r.reviewBy),
    reviewAt: strNull(r.reviewAt),
    expiryDate: strNull(r.expiryDate),
    uploadedBy: strNull(r.uploadedBy),
    uploadedAt: str(r.uploadedAt, ""),
    assetId: strNull(r.assetId),
    createdAt: str(r.createdAt, ""),
  };
}

const SUGGESTION_LABELS: Record<string, string> = {
  refresh_version: "请通知客户提供新版本资料",
  waive: "可考虑免除该资料要求",
  replace_with_new_version: "可使用其他版本替代",
};

function buildVersionInfo(
  expiryDate: string | null,
  riskStatus: string,
  daysUntilExpiry: number | null,
): string {
  const parts: string[] = [];
  if (expiryDate) parts.push(`有効期限: ${expiryDate}`);
  if (riskStatus === "expired") parts.push("（过期）");
  else if (riskStatus === "expiring_soon" && daysUntilExpiry !== null) {
    parts.push(`（${daysUntilExpiry} 日後に期限切れ）`);
  }
  return parts.join("") || "—";
}

function mapAffectedCase(c: Record<string, unknown>) {
  const caseName =
    typeof c.caseName === "string" ? c.caseName : str(c.caseNo, "");
  return {
    caseId: str(c.caseId, ""),
    caseName,
    docName: str(c.requirementName, ""),
  };
}

/**
 * 后端共享过期风险 JSON → SharedExpiryRiskData 映射。
 *
 * @param json - 后端 JSON 响应
 * @returns 共享过期风险数据（面板展示用）
 */
export function parseSharedExpiryRiskData(json: unknown): SharedExpiryRiskData {
  const r = (json ?? {}) as Record<string, unknown>;
  const expiryDate = strNull(r.latestVersionExpiryDate);
  const riskStatus = str(r.riskStatus, "none");
  const daysUntilExpiry =
    typeof r.daysUntilExpiry === "number" ? r.daysUntilExpiry : null;

  const versionInfo = buildVersionInfo(expiryDate, riskStatus, daysUntilExpiry);

  const rawCases = Array.isArray(r.affectedCases) ? r.affectedCases : [];
  const affectedCases = rawCases
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map(mapAffectedCase);

  const suggestions = Array.isArray(r.suggestions) ? r.suggestions : [];
  const suggestedAction =
    suggestions
      .filter((s): s is string => typeof s === "string")
      .map((s) => SUGGESTION_LABELS[s] ?? s)
      .join("；") || "—";

  return { versionInfo, affectedCases, suggestedAction };
}

/**
 * 后端完成率 JSON → CompletionRate 映射。
 *
 * 口径与 R31-G 验收一致：分母为「实际需要处理的资料项」（即排除 waived），
 * 分子为「已审核通过」（仅 approved，不含 waived）。这样案件详情资料 Tab 的
 * 全局完成率与各分组完成率（computeDocumentStatusBreakdown 等本地工具）一致，
 * 避免 waived 同时计入分子/分母带来的「2/10 50%（共 9 项 · 8 项待提交）」错位。
 *
 * 兼容旧响应：若不含 approved/waived 字段，则退回 completed/total 旧口径。
 *
 * @param json - 后端 JSON 响应
 * @returns 完成率数据
 */
export function parseCompletionRate(json: unknown): CompletionRate {
  const r = (json ?? {}) as Record<string, unknown>;
  const total = typeof r.total === "number" ? r.total : 0;
  const completed = typeof r.completed === "number" ? r.completed : 0;
  const hasApproved = typeof r.approved === "number";
  const hasWaived = typeof r.waived === "number";
  if (hasApproved && hasWaived) {
    const approved = r.approved as number;
    const waived = r.waived as number;
    const activeTotal = Math.max(0, total - waived);
    const percent =
      activeTotal > 0 ? Math.round((approved / activeTotal) * 100) : 0;
    return {
      collected: approved,
      total: activeTotal,
      percent,
      label: `${approved}/${activeTotal}`,
    };
  }
  const percent =
    typeof r.completionRate === "number"
      ? r.completionRate
      : total > 0
        ? Math.round((completed / total) * 100)
        : 0;
  return {
    collected: completed,
    total,
    percent,
    label: `${completed}/${total}`,
  };
}
