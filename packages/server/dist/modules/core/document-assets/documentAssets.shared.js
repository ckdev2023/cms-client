// ── Shared Expiry Risk ──
export const EXPIRY_RISK_SUGGESTION_CODES = [
  "refresh_version",
  "waive",
  "replace_with_new_version",
];
const EXPIRING_SOON_THRESHOLD_DAYS = 30;
/**
 * 根据过期日期计算风险等级、剩余天数和建议码。
 * @param expiryDateStr YYYY-MM-DD 格式的过期日期字符串，null 表示无过期
 * @returns 风险状态、剩余天数、建议操作码
 */
export function computeExpiryRisk(expiryDateStr) {
  if (expiryDateStr === null) {
    return { riskStatus: "none", daysUntilExpiry: null, suggestions: [] };
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr + "T00:00:00Z");
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return {
      riskStatus: "expired",
      daysUntilExpiry: diffDays,
      suggestions: ["refresh_version", "waive", "replace_with_new_version"],
    };
  }
  if (diffDays <= EXPIRING_SOON_THRESHOLD_DAYS) {
    return {
      riskStatus: "expiring_soon",
      daysUntilExpiry: diffDays,
      suggestions: ["refresh_version", "replace_with_new_version"],
    };
  }
  return { riskStatus: "valid", daysUntilExpiry: diffDays, suggestions: [] };
}
/**
 * 将受影响案件行映射为 AffectedCase 实体。
 * @param row 数据库查询结果行
 * @returns AffectedCase 实体
 */
export function mapAffectedCaseRow(row) {
  return {
    caseId: row.case_id,
    caseNo: row.case_no,
    caseName: row.case_name,
    caseStatus: row.case_status,
    requirementId: row.requirement_id,
    requirementName: row.requirement_name,
    requirementStatus: row.requirement_status,
  };
}
export const AFFECTED_CASES_SQL = `
  SELECT DISTINCT ON (c.id, di.id)
    c.id   AS case_id,
    c.case_no,
    c.case_name,
    c.status AS case_status,
    di.id  AS requirement_id,
    di.name AS requirement_name,
    di.status AS requirement_status
  FROM document_requirement_file_refs drf
  JOIN document_files df ON df.id = drf.file_version_id
  JOIN document_items di ON di.id = drf.requirement_id
  JOIN cases c ON c.id = di.case_id
  WHERE df.asset_id = $1
  ORDER BY c.id, di.id, drf.created_at DESC
`;
export const LATEST_EXPIRY_SQL = `
  SELECT df.expiry_date
  FROM document_files df
  WHERE df.asset_id = $1
  ORDER BY df.version_no DESC
  LIMIT 1
`;
function toTimestampString(value) {
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return "";
}
function toDateStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof value === "bigint") return Number(value);
  return 0;
}
/**
 * 将数据库行映射为 DocumentAsset 实体。
 * @param row 数据库查询结果行
 * @returns DocumentAsset 实体
 */
export function mapDocumentAssetRow(row) {
  const expiryDate = toDateStringOrNull(row.latest_version_expiry_date);
  const now = new Date().toISOString().slice(0, 10);
  const isExpired = expiryDate !== null && expiryDate < now;
  return {
    id: row.id,
    orgId: row.org_id,
    materialCode: row.material_code,
    ownerSubjectType: row.owner_subject_type,
    ownerCustomerId: row.owner_customer_id,
    ownerEmployerIdentityKey: row.owner_employer_identity_key,
    originCaseId: row.origin_case_id,
    sourceRequirementId: row.source_requirement_id,
    activeFlag: row.active_flag,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
    latestVersionExpiryDate: expiryDate,
    referencedCaseCount: toNumber(row.referenced_case_count),
    isExpired,
  };
}
/**
 * 根据查询参数构建 WHERE 条件与参数数组。
 * @param input 列表查询参数
 * @returns where 子句数组与对应参数
 */
export function buildAssetListFilters(input) {
  const where = ["da.active_flag = true"];
  const params = [];
  if (input.materialCode) {
    params.push(input.materialCode);
    where.push("da.material_code = $" + String(params.length));
  }
  if (input.ownerCustomerId) {
    params.push(input.ownerCustomerId);
    where.push("da.owner_customer_id = $" + String(params.length));
  }
  if (input.caseId) {
    params.push(input.caseId);
    where.push(
      `da.id IN (
        SELECT df.asset_id
        FROM document_files df
        JOIN document_items di ON di.id = df.requirement_id
        WHERE di.case_id = $` +
        String(params.length) +
        ` AND df.asset_id IS NOT NULL
      )`,
    );
  }
  return { where, params };
}
/**
 * 构建 ON CONFLICT DO NOTHING 形式的 upsert 所需 SQL。
 *
 * 依赖 036 迁移新增的两个 partial unique index：
 * - idx_document_assets_unique_customer_owned  (org_id, material_code, owner_subject_type, owner_customer_id)  WHERE active_flag AND owner_customer_id IS NOT NULL
 * - idx_document_assets_unique_employer_owned  (org_id, material_code, owner_employer_identity_key)            WHERE active_flag AND owner_employer_identity_key IS NOT NULL
 *
 * 返回 insertSql（ON CONFLICT DO NOTHING RETURNING id）和 fallbackSql（用于 INSERT 返回空行时 SELECT 已有记录）。
 * 两条 SQL 共享同一个 params 数组，调用方须在同一事务内顺序执行。
 *
 * @param input upsert 输入（owner + material 标识）
 * @returns insertSql、fallbackSql 和共享 params
 */
export function buildUpsertAssetSql(input) {
  const isCustomerOwned =
    input.ownerCustomerId !== undefined && input.ownerCustomerId !== null;
  const isEmployerOwned =
    input.ownerEmployerIdentityKey !== undefined &&
    input.ownerEmployerIdentityKey !== null;
  const conflictTarget = isCustomerOwned
    ? "(org_id, material_code, owner_subject_type, owner_customer_id) WHERE active_flag = true AND owner_customer_id IS NOT NULL"
    : isEmployerOwned
      ? "(org_id, material_code, owner_employer_identity_key) WHERE active_flag = true AND owner_employer_identity_key IS NOT NULL"
      : null;
  const params = [
    input.orgId,
    input.materialCode,
    input.ownerSubjectType,
    input.ownerCustomerId ?? null,
    input.ownerEmployerIdentityKey ?? null,
    input.originCaseId ?? null,
    input.sourceRequirementId ?? null,
  ];
  const insertSql = `
    INSERT INTO document_assets
      (org_id, material_code, owner_subject_type, owner_customer_id,
       owner_employer_identity_key, origin_case_id, source_requirement_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ${conflictTarget ? `ON CONFLICT ${conflictTarget} DO NOTHING` : ""}
    RETURNING id
  `;
  const fallbackWhere = isCustomerOwned
    ? "org_id = $1 AND material_code = $2 AND owner_subject_type = $3 AND owner_customer_id = $4 AND active_flag = true"
    : isEmployerOwned
      ? "org_id = $1 AND material_code = $2 AND owner_employer_identity_key = $5 AND active_flag = true"
      : "FALSE";
  const fallbackSql = `SELECT id FROM document_assets WHERE ${fallbackWhere} LIMIT 1`;
  return { insertSql, fallbackSql, params };
}
export const ASSET_SELECT_SQL = `
  da.id,
  da.org_id,
  da.material_code,
  da.owner_subject_type,
  da.owner_customer_id,
  da.owner_employer_identity_key,
  da.origin_case_id,
  da.source_requirement_id,
  da.active_flag,
  da.created_at,
  da.updated_at
`;
export const ASSET_DERIVED_SQL = `
  (
    SELECT df_inner.expiry_date
    FROM document_files df_inner
    WHERE df_inner.asset_id = da.id
    ORDER BY df_inner.version_no DESC
    LIMIT 1
  ) AS latest_version_expiry_date,
  (
    SELECT COUNT(DISTINCT di_inner.case_id)
    FROM document_requirement_file_refs drf_inner
    JOIN document_files df_ref ON df_ref.id = drf_inner.file_version_id
    JOIN document_items di_inner ON di_inner.id = drf_inner.requirement_id
    WHERE df_ref.asset_id = da.id
  ) AS referenced_case_count
`;
//# sourceMappingURL=documentAssets.shared.js.map
