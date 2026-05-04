/**
 * SubmissionPackage 数量重算 supplement_count（真相源）。
 *
 * 业务规范：supplement_count 的真相源是 submission_packages 表中
 * submission_kind='supplement' 的记录数。
 * phase-transition 路径（path1）和补正包创建路径（path2）
 * 都统一走此函数回写，避免 +1 累积漂移。
 *
 * @param tx 事务连接
 * @param caseId 案件 ID
 * @returns 重算后的 supplement_count
 * @see BUG-118
 */
export async function recalcSupplementCount(tx, caseId) {
  const countResult = await tx.query(
    `SELECT count(*)::text AS cnt
       FROM submission_packages
      WHERE case_id = $1
        AND submission_kind = 'supplement'`,
    [caseId],
  );
  const count = Number(countResult.rows.at(0)?.cnt ?? "0");
  await tx.query(
    `UPDATE cases
        SET supplement_count = $2, updated_at = now()
      WHERE id = $1`,
    [caseId, count],
  );
  return count;
}
//# sourceMappingURL=casesSupplementCount.js.map
