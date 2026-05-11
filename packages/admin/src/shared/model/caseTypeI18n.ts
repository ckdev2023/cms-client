/**
 * 将案件类型代码转为 i18n key（`cases.constants.caseTypes.<code>`）。
 * @param code - 案件类型代码
 * @returns i18n key；未匹配时返回 `""`
 */
export function getCaseTypeI18nKey(code: string): string {
  if (!code) return "";
  return `cases.constants.caseTypes.${code}`;
}

const BMV_CASE_TYPE = "business_manager_visa";

/**
 * 与 server {@link isBmvCaseTypeCode} 对齐前的轻量归一化（大小写、连字符）。
 *
 * @param code - 原始案件类型码
 * @returns 归一化后的 snake_case 风格字符串
 */
function normalizeCaseTypeCode(code: string): string {
  return code.trim().toLowerCase().replace(/-/g, "_");
}

/**
 * 判定案件类型是否为经营管理签系列（对齐 server `cases.template-bmv`）。
 *
 * 扩展：建案草稿 `templateId` 可能为总览 `bmv`；列表/客户下游可能出现
 * `business-management` 等 kebab 或 `business_management_visa` 旧值，均需与
 * `biz_mgmt*` / `business_manager_visa` 同等对待，避免会社侧资料误标为「受入机构」。
 *
 * @param code - `case_templates.case_type` / Case 聚合中的 `caseTypeCode`
 * @returns 属于经管系列时返回 `true`
 */
export function isBizManagementVisaCaseTypeCode(
  code: string | null | undefined,
): boolean {
  if (!code) return false;
  const n = normalizeCaseTypeCode(code);
  if (n === BMV_CASE_TYPE) return true;
  if (n === "bmv") return true;
  if (n.startsWith("biz_mgmt")) return true;
  if (n === "business_management" || n === "business_management_visa")
    return true;
  return false;
}
