import { BadRequestException } from "@nestjs/common";

import type { DocumentFile } from "../model/coreEntities";
import type { DocumentFileUploadInput } from "../documents.types";
import type { TenantDbTx } from "../tenancy/tenantDb";
import type { RequestContext } from "../tenancy/requestContext";
import {
  buildUpsertAssetSql,
  type UpsertAssetInput,
} from "../document-assets/documentAssets.shared";

export { LOCAL_STORAGE_TYPE } from "../documents.types";

/** 数据库查询返回的 document_files 行类型。 */
export type DocumentFileQueryRow = {
  id: string;
  org_id: string;
  requirement_id: string;
  file_name: string;
  file_url: string | null;
  file_type: unknown;
  file_size: unknown;
  version_no: unknown;
  uploaded_by: string | null;
  uploaded_at: unknown;
  storage_type: string;
  relative_path: string | null;
  review_status: string;
  review_by: string | null;
  review_at: unknown;
  expiry_date: unknown;
  hash_value: unknown;
  asset_id: string | null;
  created_at: unknown;
};

export const DOC_FILE_COLS =
  "id, org_id, requirement_id, file_name, file_url, file_type, file_size, version_no, uploaded_by, uploaded_at, storage_type, relative_path, review_status, review_by, review_at, expiry_date, hash_value, asset_id, created_at";

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toTimestampString(value: unknown): string {
  return toTimestampStringOrNull(value) ?? "";
}

function toDateStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

function toNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * 将未知值转换为 number，无法解析时返回 null。
 * @param value 待转换的值
 * @returns 数值或 null
 */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * 生成二进制文件上传后的存储键。
 * @param requirementId 资料项 ID
 * @param fileName 原始文件名
 * @returns 存储键
 */
export function buildStorageKey(
  requirementId: string,
  fileName: string,
): string {
  const sanitized = fileName.replace(/[/\\]/g, "_");
  return `document-files/${requirementId}/${String(Date.now())}_${sanitized}`;
}

/**
 * 规范化并校验本地纸质归档相对路径。
 * @param value 原始相对路径
 * @returns 规范化后的相对路径
 */
export function normalizeRelativePath(value: string): string {
  const trimmed = value.trim().replace(/\\/g, "/");
  if (trimmed.length === 0) {
    throw new BadRequestException("relativePath must not be empty");
  }
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("~") ||
    /^[A-Za-z]:\//.test(trimmed)
  ) {
    throw new BadRequestException("relativePath must be a relative path");
  }
  const segments = trimmed.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === ".")) {
    throw new BadRequestException(
      "relativePath must be a normalized relative path",
    );
  }
  if (segments.includes("..")) {
    throw new BadRequestException(
      "relativePath must not escape the archive root",
    );
  }
  return trimmed;
}

/**
 * 将审核动作映射为资料文件审核状态。
 * @param decision 审核动作
 * @returns 资料文件审核状态
 */
export function mapDecisionToReviewStatus(
  decision: "approve" | "reject",
): string {
  return decision === "approve" ? "approved" : "rejected";
}

/**
 * 将数据库行映射为 DocumentFile 实体。
 * @param row 数据库查询结果行
 * @returns DocumentFile 实体
 */
export function mapDocumentFileRow(row: DocumentFileQueryRow): DocumentFile {
  return {
    id: row.id,
    orgId: row.org_id,
    requirementId: row.requirement_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileType: toNullableString(row.file_type),
    fileSize: toNumberOrNull(row.file_size),
    versionNo: toNumberOrNull(row.version_no) ?? 0,
    uploadedBy: row.uploaded_by,
    uploadedAt: toTimestampString(row.uploaded_at),
    storageType: row.storage_type,
    relativePath: row.relative_path,
    reviewStatus: row.review_status,
    reviewBy: row.review_by,
    reviewAt: toTimestampStringOrNull(row.review_at),
    expiryDate: toDateStringOrNull(row.expiry_date),
    hashValue: toNullableString(row.hash_value),
    assetId: row.asset_id,
    createdAt: toTimestampString(row.created_at),
  };
}

// ── D3: asset + requirement file ref helpers ──

/**
 * 从 cases 表取得 customer_id。
 * @param tx 事务句柄
 * @param caseId 案件 ID
 * @returns customer_id 或 null
 */
export async function getCaseCustomerId(
  tx: TenantDbTx,
  caseId: string,
): Promise<string | null> {
  const result = await tx.query<{ customer_id: string }>(
    `select customer_id from cases where id = $1 limit 1`,
    [caseId],
  );
  return result.rows.at(0)?.customer_id ?? null;
}

/**
 * 在调用方事务内 upsert document_asset（ON CONFLICT DO NOTHING + fallback SELECT）。
 * @param tx 事务句柄
 * @param input owner + material 标识
 * @returns asset id
 */
export async function upsertAssetInTx(
  tx: TenantDbTx,
  input: UpsertAssetInput,
): Promise<string> {
  const { insertSql, fallbackSql, params } = buildUpsertAssetSql(input);
  const insertResult = await tx.query<{ id: string }>(insertSql, params);
  if (insertResult.rows.length > 0) {
    return insertResult.rows[0].id;
  }
  const selectResult = await tx.query<{ id: string }>(fallbackSql, params);
  if (selectResult.rows.length === 0) {
    throw new Error(
      "upsertAssetInTx: neither INSERT nor SELECT returned a row",
    );
  }
  return selectResult.rows[0].id;
}

/**
 * 根据上传入参与 requirement 上下文解析 asset id（upsert）。
 * @param tx 事务句柄
 * @param ctx 请求上下文
 * @param input 上传参数
 * @param requirement requirement 上下文
 * @param requirement.caseId 案件 ID
 * @param requirement.checklistItemCode 清单项代码（materialCode 兜底）
 * @returns asset id
 */
export async function resolveAssetId(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: DocumentFileUploadInput,
  requirement: { caseId: string; checklistItemCode: string },
): Promise<string> {
  const customerId = await getCaseCustomerId(tx, requirement.caseId);
  const materialCode = input.materialCode ?? requirement.checklistItemCode;
  return upsertAssetInTx(tx, {
    orgId: ctx.orgId,
    materialCode,
    ownerSubjectType: input.ownerSubjectType ?? "customer",
    ownerCustomerId:
      input.ownerCustomerId !== undefined ? input.ownerCustomerId : customerId,
    ownerEmployerIdentityKey: input.ownerEmployerIdentityKey ?? null,
    originCaseId: requirement.caseId,
    sourceRequirementId: input.requirementId,
  });
}

/**
 * 写入 document_requirement_file_refs（ref_mode=direct_register）。
 * @param tx 事务句柄
 * @param requirementId 资料项 ID
 * @param fileVersionId 文件版本 ID
 * @param createdBy 操作者 ID
 */
export async function insertRequirementFileRef(
  tx: TenantDbTx,
  requirementId: string,
  fileVersionId: string,
  createdBy: string,
): Promise<void> {
  await tx.query(
    `insert into document_requirement_file_refs
       (requirement_id, file_version_id, ref_mode, created_by)
     values ($1, $2, 'direct_register', $3)`,
    [requirementId, fileVersionId, createdBy],
  );
}
