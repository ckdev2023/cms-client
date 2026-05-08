/**
 * 将案件类型代码转为 i18n key（`cases.constants.caseTypes.<code>`）。
 * @param code - 案件类型代码
 * @returns i18n key；未匹配时返回 `""`
 */
export function getCaseTypeI18nKey(code: string): string {
  if (!code) return "";
  return `cases.constants.caseTypes.${code}`;
}
