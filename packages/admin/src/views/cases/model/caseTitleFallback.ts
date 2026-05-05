/**
 * 案件标题兜底逻辑——列表行与详情 heading 共用同一口径，
 * 避免跨页跳转后 heading 与列表行不一致。
 */

/**
 * 名称为空时使用申请人与类型拼接兜底显示名。
 *
 * @param applicant - 申请人名称
 * @param typeLabel - 签证类型翻译后标签（`"—"` 视为缺失）
 * @param caseNo - 案件业务编号
 * @param id - 案件 UUID
 * @returns 兜底显示名
 */
export function buildFallbackName(
  applicant: string | undefined,
  typeLabel: string,
  caseNo: string | undefined,
  id: string,
): string {
  const app = applicant?.trim();
  const label = typeLabel !== "—" ? typeLabel : "";
  if (app && label) return `${app} · ${label}`;
  if (app) return app;
  if (label) return label;
  return caseNo || id;
}

/**
 * 判断 `name` 是否实际只是编号/UUID 兜底（需要替换为更有意义的兜底文案）。
 *
 * @param name - 后端返回的 caseName
 * @param caseNo - 案件业务编号
 * @param id - 案件 UUID
 * @returns 是否为兜底标题
 */
export function isFallbackTitle(
  name: string | undefined | null,
  caseNo: string | undefined | null,
  id: string,
): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return trimmed === caseNo || trimmed === id;
}
