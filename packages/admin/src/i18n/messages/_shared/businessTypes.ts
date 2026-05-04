/**
 * 业务类型单一枚举源。
 *
 * admin 模块使用 kebab-case（如 `business-management-visa`），
 * cases 模块使用 snake_case caseTypeCode（如 `business_manager_visa`）。
 * 二者为映射关系而非别名——不可互相直接替换。
 */

export const BUSINESS_TYPE_VALUES = [
  "highly-skilled",
  "work-visa",
  "family-stay",
  "business-management-visa",
  "company-setup",
  "permanent",
  "other",
] as const;

/**
 *
 */
export type BusinessType = (typeof BUSINESS_TYPE_VALUES)[number];

/**
 *
 */
export interface BusinessTypeOptionI18N {
  /**
   *
   */
  value: BusinessType;
  /**
   *
   */
  labelKey: string;
}

export const BUSINESS_TYPE_OPTIONS_I18N: readonly BusinessTypeOptionI18N[] = [
  {
    value: "highly-skilled",
    labelKey: "leads.options.businessType.highlySkilled",
  },
  { value: "work-visa", labelKey: "leads.options.businessType.workVisa" },
  { value: "family-stay", labelKey: "leads.options.businessType.familyStay" },
  {
    value: "business-management-visa",
    labelKey: "leads.options.businessType.businessManagementVisa",
  },
  {
    value: "company-setup",
    labelKey: "leads.options.businessType.companySetup",
  },
  { value: "permanent", labelKey: "leads.options.businessType.permanent" },
  { value: "other", labelKey: "leads.options.businessType.other" },
] as const;

/**
 * 旧值 → 新枚举值的兼容映射。
 *
 * 旧持久化数据中可能存在 `"business-manager"`，
 * 通过此映射规范化为 `"business-management-visa"`。
 */
export const LEGACY_BUSINESS_TYPE_ALIAS: Readonly<
  Record<string, BusinessType>
> = {
  "business-manager": "business-management-visa",
};

const BUSINESS_TYPE_TO_CASE_TYPE_CODE: Record<BusinessType, string> = {
  "highly-skilled": "highly_skilled",
  "work-visa": "work",
  "family-stay": "dependent_visa",
  "business-management-visa": "business_manager_visa",
  "company-setup": "company_setup",
  permanent: "permanent",
  other: "other",
};

/**
 * admin kebab-case → cases snake_case caseTypeCode 单向映射。
 *
 * @param value admin 侧业务类型（kebab-case）
 * @returns cases 侧 caseTypeCode（snake_case）
 */
export function mapBusinessTypeToCaseTypeCode(value: BusinessType): string {
  return BUSINESS_TYPE_TO_CASE_TYPE_CODE[value];
}

/**
 * 将可能含旧值的字符串规范化为当前枚举值。
 *
 * @param raw 原始字符串（可能是旧格式如 `"business-manager"`）
 * @returns 规范化后的 BusinessType；无法识别时返回 `undefined`
 */
export function normalizeBusinessType(raw: string): BusinessType | undefined {
  if ((BUSINESS_TYPE_VALUES as readonly string[]).includes(raw)) {
    return raw as BusinessType;
  }
  return LEGACY_BUSINESS_TYPE_ALIAS[raw];
}
