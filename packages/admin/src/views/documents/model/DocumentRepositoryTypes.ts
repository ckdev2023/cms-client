/* eslint-disable max-lines */
import type {
  WaivedReasonCode,
  DocumentListItem,
  CompletionRate,
  SharedExpiryRiskData,
} from "../types";

// ─── Error ───────────────────────────────────────────────────────

/**
 *
 */
export type DocumentRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "CONFLICT"
  | "S9_READONLY"
  | "VALIDATION";

/**
 * 资料中心仓储错误。
 */
export class DocumentRepositoryError extends Error {
  /**
   *
   */
  readonly code: DocumentRepositoryErrorCode;
  /**
   *
   */
  readonly status?: number;
  /**
   *
   */
  readonly serverCode?: string;

  /**
   * 构造一个资料中心仓储错误。
   *
   * @param input - 错误描述
   * @param input.code - 业务错误码
   * @param input.message - 可读错误消息
   * @param input.status - HTTP 状态码（如有）
   * @param input.cause - 原始异常（如有）
   * @param input.serverCode - 后端错误码（如有）
   */
  constructor(input: {
    code: DocumentRepositoryErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
    serverCode?: string;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "DocumentRepositoryError";
    this.code = input.code;
    this.status = input.status;
    this.serverCode = input.serverCode;
  }
}

// ─── Factory ─────────────────────────────────────────────────────

/**
 *
 */
export interface DocumentRepositoryFactoryInput {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken?: () => string | null;
  /**
   *
   */
  now?: () => Date;
}

// ─── List Parameters ─────────────────────────────────────────────

/**
 *
 */
export interface ListDocumentsParams {
  /**
   *
   */
  caseId?: string;
  /**
   *
   */
  status?: string;
  /**
   *
   */
  statusIn?: string[];
  /**
   *
   */
  ownerSide?: string;
  /**
   *
   */
  page?: number;
  /**
   *
   */
  limit?: number;
}

// ─── Write Params ────────────────────────────────────────────────

/**
 *
 */
export interface TransitionParams {
  /**
   *
   */
  toStatus: string;
}

/**
 *
 */
export interface WaiveParams {
  /**
   *
   */
  reasonCode: WaivedReasonCode;
  /**
   *
   */
  note?: string | null;
}

/**
 *
 */
export interface UnwaiveParams {
  /**
   *
   */
  note?: string | null;
}

/**
 *
 */
export interface UploadLocalArchiveParams {
  /**
   *
   */
  requirementId: string;
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  relativePath: string;
  /**
   *
   */
  expiryDate?: string | null;
}

/**
 *
 */
export interface CreateItemParams {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  checklistItemCode: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  ownerSide?: string;
  /**
   *
   */
  dueAt?: string | null;
  /**
   *
   */
  note?: string | null;
  /**
   *
   */
  category?: string;
}

// ─── Response DTOs ───────────────────────────────────────────────

/**
 *
 */
export interface DocumentItemDto {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  status: string;
  /**
   *
   */
  ownerSide: string;
  /**
   *
   */
  dueAt: string | null;
  /**
   *
   */
  lastFollowUpAt: string | null;
  /**
   *
   */
  waiveReasonCodeLatest: string | null;
  /**
   *
   */
  waiveReasonLatest: string | null;
  /**
   *
   */
  waivedAtLatest: string | null;
  /**
   *
   */
  waivedByUserIdLatest: string | null;
  [key: string]: unknown;
}

/**
 *
 */
export interface DocumentFileDto {
  /**
   *
   */
  id: string;
  /**
   *
   */
  requirementId: string;
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  fileUrl: string | null;
  /**
   *
   */
  relativePath: string | null;
  /**
   *
   */
  fileKey: string;
  /**
   *
   */
  versionNo: number;
  /**
   *
   */
  storageType: string;
  /**
   *
   */
  reviewStatus: string;
  /**
   *
   */
  reviewBy: string | null;
  /**
   *
   */
  reviewAt: string | null;
  /**
   *
   */
  expiryDate: string | null;
  /**
   *
   */
  uploadedBy: string | null;
  /**
   *
   */
  uploadedAt: string;
  /** 关联的 document_asset ID（D3 写入路径产生；无版本时为 null）。 */
  assetId: string | null;
  /**
   *
   */
  createdAt: string;
  [key: string]: unknown;
}

/**
 *
 */
export interface ListDocumentFilesResult {
  /**
   *
   */
  items: DocumentFileDto[];
  /**
   *
   */
  total: number;
}

/**
 *
 */
export interface PaginatedListResult {
  /**
   *
   */
  items: DocumentListItem[];
  /**
   *
   */
  total: number;
}

// ─── Reference (cross-case link) ─────────────────────────────────

/**
 *
 */
export interface ReferenceCandidateDto {
  /**
   *
   */
  fileId: string;
  /**
   *
   */
  requirementId: string;
  /**
   *
   */
  fileName: string;
  /**
   *
   */
  versionNo: number;
  /**
   *
   */
  uploadedAt: string;
  /**
   *
   */
  expiryDate: string | null;
  /**
   *
   */
  sourceCaseId: string;
  /**
   *
   */
  sourceRequirementName: string;
  /**
   *
   */
  reviewStatus: string;
}

/**
 *
 */
export interface LinkRefParams {
  /**
   *
   */
  requirementId: string;
  /**
   *
   */
  fileVersionId: string;
  /**
   *
   */
  linkedFromRequirementId?: string;
}

/**
 *
 */
export interface LinkRefResult {
  /**
   *
   */
  id: string;
  /**
   *
   */
  requirementId: string;
  /**
   *
   */
  fileVersionId: string;
  /**
   *
   */
  refMode: string;
  /**
   *
   */
  createdAt: string;
}

// ─── Repository Interface ────────────────────────────────────────

/**
 *
 */
export interface DocumentRepository {
  /**
   *
   */
  listDocuments(params?: ListDocumentsParams): Promise<PaginatedListResult>;
  /**
   *
   */
  transition(
    itemId: string,
    params: TransitionParams,
  ): Promise<DocumentItemDto>;
  /**
   *
   */
  followUp(itemId: string): Promise<DocumentItemDto>;
  /**
   *
   */
  waive(itemId: string, params: WaiveParams): Promise<DocumentItemDto>;
  /**
   *
   */
  unwaive(itemId: string, params: UnwaiveParams): Promise<DocumentItemDto>;
  /**
   *
   */
  uploadLocalArchive(
    params: UploadLocalArchiveParams,
  ): Promise<DocumentFileDto>;
  /**
   *
   */
  listFiles(
    requirementId: string,
    opts?: {
      /**
       *
       */
      page?: number; /**
       *
       */
      limit?: number;
    },
  ): Promise<ListDocumentFilesResult>;
  /**
   *
   */
  getCompletionRate(caseId: string): Promise<CompletionRate>;
  /**
   *
   */
  createItem(params: CreateItemParams): Promise<DocumentItemDto>;
  /**
   *
   */
  listReferenceCandidates(
    requirementId: string,
    opts?: { limit?: number },
  ): Promise<ReferenceCandidateDto[]>;
  /**
   *
   */
  linkRef(params: LinkRefParams): Promise<LinkRefResult>;
  /** 取 asset 共享过期风险数据（受影响案件 + 建议码）。 */
  getSharedExpiryRisk(assetId: string): Promise<SharedExpiryRiskData>;
}

// ─── DTO mappers ─────────────────────────────────────────────────

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
 * @param json - 后端 JSON 响应
 * @returns 完成率数据
 */
export function parseCompletionRate(json: unknown): CompletionRate {
  const r = (json ?? {}) as Record<string, unknown>;
  const completed = typeof r.completed === "number" ? r.completed : 0;
  const total = typeof r.total === "number" ? r.total : 0;
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
