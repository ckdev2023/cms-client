export const REF_COLS =
  "id, requirement_id, file_version_id, ref_mode, linked_from_requirement_id, created_by, created_at";
function toTimestampString(value) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return "";
}
function toNumberOrNull(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "bigint") return Number(value);
  return null;
}
function toDateStringOrNull(value) {
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
export function mapRefRow(row) {
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
export function mapCandidateRow(row) {
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
//# sourceMappingURL=documentRequirementFileRefs.shared.js.map
