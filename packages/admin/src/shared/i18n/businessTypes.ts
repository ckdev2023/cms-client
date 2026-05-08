/**
 * 业务类型单一 catalog（跨 leads / cases / customers）。
 *
 * 命名为 businessTypes 而非 visaTypes——permanent / company-setup / other
 * 并非签证类型，「业务类型」更准确地涵盖全集。
 *
 * 每个 canonical code 对应三个展示变体：
 * - `primary`  — 详情页默认标签
 * - `short`    — 表格 / chip / 筛选器（缺省回落到 primary）
 * - `full`     — 长文本 / 正式场景（缺省回落到 primary）
 *
 * 此文件同时是 canonical 枚举值、legacy 别名、caseTypeCode 映射的
 * 单一权威来源（原先位于 `i18n/messages/_shared/businessTypes.ts`，
 * 为满足 dep-cruiser `shared-no-local-outside-shared` 规则迁入此处）。
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

/** @deprecated 下一 release 移除；改用 getBusinessTypeSelectOptions。 */
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
  family_stay: "family-stay",
  work_visa: "work-visa",
  highly_skilled: "highly-skilled",
  company_setup: "company-setup",
  business_management_visa: "business-management-visa",
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

// ---------------------------------------------------------------------------
// Catalog & label resolution
// ---------------------------------------------------------------------------

/**
 *
 */
export type BusinessTypeLocale = "zh-CN" | "en-US" | "ja-JP";

/**
 *
 */
export type BusinessTypeLabelVariant = "primary" | "short" | "full";

/**
 *
 */
export interface BusinessTypeLabelEntry {
  /**
   *
   */
  primary: string;
  /**
   *
   */
  short?: string;
  /**
   *
   */
  full?: string;
}

export const BUSINESS_TYPE_LABELS: Record<
  BusinessType,
  Record<BusinessTypeLocale, BusinessTypeLabelEntry>
> = {
  "highly-skilled": {
    "zh-CN": { primary: "高度人才", full: "高度专门职" },
    "ja-JP": { primary: "高度専門職" },
    "en-US": { primary: "Highly Skilled Professional" },
  },
  "work-visa": {
    "zh-CN": { primary: "技人国", full: "技术·人文知识·国际业务" },
    "ja-JP": {
      primary: "技術・人文知識・国際業務",
      short: "技人国",
    },
    "en-US": {
      primary: "Engineer/Specialist in Humanities",
      short: "Work Visa",
    },
  },
  "family-stay": {
    "zh-CN": { primary: "家族滞在" },
    "ja-JP": { primary: "家族滞在" },
    "en-US": { primary: "Dependent" },
  },
  "business-management-visa": {
    "zh-CN": { primary: "经营管理", full: "经营管理签" },
    "ja-JP": { primary: "経営・管理", full: "経営管理ビザ" },
    "en-US": { primary: "Business Manager", full: "Business Manager Visa" },
  },
  "company-setup": {
    "zh-CN": { primary: "设立法人", full: "公司设立" },
    "ja-JP": { primary: "会社設立" },
    "en-US": { primary: "Company Establishment" },
  },
  permanent: {
    "zh-CN": { primary: "永住", full: "永住者" },
    "ja-JP": { primary: "永住", full: "永住者" },
    "en-US": { primary: "Permanent Resident" },
  },
  other: {
    "zh-CN": { primary: "其他" },
    "ja-JP": { primary: "その他" },
    "en-US": { primary: "Other" },
  },
};

function normalizeLocale(locale?: string): BusinessTypeLocale {
  const l = locale?.trim().toLowerCase();
  if (l?.startsWith("zh")) return "zh-CN";
  if (l?.startsWith("en")) return "en-US";
  if (l?.startsWith("ja")) return "ja-JP";
  return "ja-JP";
}

/**
 * 将业务类型 canonical code（kebab-case）解析为本地化展示标签。
 *
 * @param code  canonical BusinessType 或 legacy 别名
 * @param locale  目标语言（模糊匹配：`"zh"` → zh-CN 等）；缺省 ja-JP
 * @param variant  展示变体；缺省 `"primary"`
 * @returns 命中 catalog 时返回对应标签（variant 缺省回落 primary）；
 *          未命中返回原始 code；空值返回 `"—"`
 */
export function resolveBusinessTypeLabel(
  code: string | undefined | null,
  locale?: string,
  variant: BusinessTypeLabelVariant = "primary",
): string {
  if (!code?.trim()) return "—";

  const normalized = normalizeBusinessType(code.trim());
  if (!normalized) return code;

  const target = normalizeLocale(locale);
  const entry = BUSINESS_TYPE_LABELS[normalized]?.[target];
  if (!entry) return code;

  return entry[variant] ?? entry.primary;
}

/**
 *
 */
export interface BusinessTypeSelectOption {
  /**
   *
   */
  value: BusinessType;
  /**
   *
   */
  label: string;
}

/**
 * 返回所有 canonical 业务类型选项（label 已按 locale + variant 解析），
 * 供下拉 / 筛选组件直接渲染，不再依赖 i18n `t()` 间接查找。
 *
 * @param locale  目标语言（模糊匹配）；缺省 ja-JP
 * @param variant 展示变体；缺省 `"primary"`
 * @returns value/label 选项数组
 */
export function getBusinessTypeSelectOptions(
  locale?: string,
  variant: BusinessTypeLabelVariant = "primary",
): BusinessTypeSelectOption[] {
  return BUSINESS_TYPE_VALUES.map((bt) => ({
    value: bt,
    label: resolveBusinessTypeLabel(bt, locale, variant),
  }));
}
