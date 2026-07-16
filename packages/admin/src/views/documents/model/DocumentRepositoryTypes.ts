/**
 * 资料中心仓储 —— 类型声明（纯类型，无运行时代码）。
 *
 * 原文件名为 Types 却混着运行时代码（DocumentRepositoryError 类与 4 个 DTO
 * parser），共 684 行、长期挂 `eslint-disable max-lines`。本批按职责归位：
 * - 错误码与错误类 → `DocumentRepositoryError.ts`
 * - 4 个 DTO parser → `DocumentRepositoryDtos.ts`（既有的 DTO 映射缝）
 * 余下纯类型 469 行，豁免已摘除。
 */
import type {
  WaivedReasonCode,
  DocumentListItem,
  CompletionRate,
  SharedExpiryRiskData,
} from "../types";
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
