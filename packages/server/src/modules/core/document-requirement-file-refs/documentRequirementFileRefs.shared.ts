/** 数据库查询返回的 document_requirement_file_refs 行类型。 */
export type DocumentRequirementFileRefQueryRow = {
  id: string;
  requirement_id: string;
  file_version_id: string;
  ref_mode: string;
  linked_from_requirement_id: string | null;
  created_by: string | null;
  created_at: unknown;
};

/** DocumentRequirementFileRef 实体。 */
export type DocumentRequirementFileRef = {
  id: string;
  requirementId: string;
  fileVersionId: string;
  refMode: string;
  linkedFromRequirementId: string | null;
  createdBy: string | null;
  createdAt: string;
};

/** 创建引用链接的请求参数。 */
export type LinkRefInput = {
  requirementId: string;
  fileVersionId: string;
  linkedFromRequirementId?: string | null;
};

/** 跨案件引用候选行（含来源案件与资料项信息）。 */
export type ReferenceCandidateRow = {
  id: string;
  requirement_id: string;
  file_name: string;
  file_url: string | null;
  file_type: string | null;
  file_size: unknown;
  version_no: unknown;
  uploaded_by: string | null;
  uploaded_at: unknown;
  storage_type: string;
  relative_path: string | null;
  review_status: string;
  expiry_date: unknown;
  source_case_id: string;
  source_requirement_name: string;
};

/** 跨案件引用候选实体。 */
export type ReferenceCandidate = {
  fileId: string;
  requirementId: string;
  fileName: string;
  fileUrl: string | null;
  fileType: string | null;
  fileSize: number | null;
  versionNo: number;
  uploadedBy: string | null;
  uploadedAt: string;
  storageType: string;
  relativePath: string | null;
  reviewStatus: string;
  expiryDate: string | null;
  sourceCaseId: string;
  sourceRequirementName: string;
  fileKey: string;
};

export const REF_COLS =
  "id, requirement_id, file_version_id, ref_mode, linked_from_requirement_id, created_by, created_at";

function toTimestampString(value: unknown): string {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return "";
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "bigint") return Number(value);
  return null;
}

function toDateStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

/**
 * 将数据库行映射为 DocumentRequirementFileRef 实体。
 * @param row 数据库查询结果行
 * @returns DocumentRequirementFileRef 实体
 */
export function mapRefRow(
  row: DocumentRequirementFileRefQueryRow,
): DocumentRequirementFileRef {
  return {
    id: row.id,
    requirementId: row.requirement_id,
    fileVersionId: row.file_version_id,
    refMode: row.ref_mode,
    linkedFromRequirementId: row.linked_from_requirement_id,
    createdBy: row.created_by,
    createdAt: toTimestampString(row.created_at),
  };
}

/**
 * 将候选行映射为 ReferenceCandidate 实体。
 * @param row 查询结果行
 * @returns ReferenceCandidate 实体
 */
export function mapCandidateRow(
  row: ReferenceCandidateRow,
): ReferenceCandidate {
  return {
    fileId: row.id,
    requirementId: row.requirement_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileType: row.file_type,
    fileSize: toNumberOrNull(row.file_size),
    versionNo: toNumberOrNull(row.version_no) ?? 0,
    uploadedBy: row.uploaded_by,
    uploadedAt: toTimestampString(row.uploaded_at),
    storageType: row.storage_type,
    relativePath: row.relative_path,
    reviewStatus: row.review_status,
    expiryDate: toDateStringOrNull(row.expiry_date),
    sourceCaseId: row.source_case_id,
    sourceRequirementName: row.source_requirement_name,
    fileKey: row.file_url ?? row.relative_path ?? "",
  };
}
