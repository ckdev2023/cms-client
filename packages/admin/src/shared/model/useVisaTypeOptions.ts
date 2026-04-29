/**
 * 跨模块「在留資格 / 签证类型」选项与标签的统一来源。
 *
 * 同一份 enum 同时供 `leads`（线索业务类型筛选）与 `customers`
 * （签证类型字段）使用，避免 lead → customer 转化时枚举不对齐。
 *
 * 当前阶段仍以静态目录驱动，labels 内嵌 zh-CN/en-US/ja-JP 三语；
 * 未来接 API 后替换数据源即可，消费侧无需改动。
 */

export const VISA_TYPE_CODES = [
  "business_manager",
  "engineer_specialist",
  "highly_skilled_professional",
  "skilled_labor",
  "student",
  "dependent",
  "permanent_resident",
  "spouse_of_jp_national",
  "long_term_resident",
  "designated_activities",
  "other",
] as const;

/** 签证类型枚举值。 */
export type VisaTypeCode = (typeof VISA_TYPE_CODES)[number];

type VisaTypeLocale = "zh-CN" | "en-US" | "ja-JP";

interface VisaTypeCatalogEntry {
  value: VisaTypeCode;
  labels: Record<VisaTypeLocale, string>;
}

/** 选项条目，供选择器/下拉/筛选使用。 */
export interface VisaTypeSelectOption {
  /** */
  value: VisaTypeCode;
  /** */
  label: string;
}

const VISA_TYPE_CATALOG: readonly VisaTypeCatalogEntry[] = [
  {
    value: "business_manager",
    labels: {
      "zh-CN": "经营管理",
      "en-US": "Business manager",
      "ja-JP": "経営・管理",
    },
  },
  {
    value: "engineer_specialist",
    labels: {
      "zh-CN": "技术·人文知识·国际业务",
      "en-US": "Engineer / Specialist in humanities",
      "ja-JP": "技術・人文知識・国際業務",
    },
  },
  {
    value: "highly_skilled_professional",
    labels: {
      "zh-CN": "高度专门职",
      "en-US": "Highly skilled professional",
      "ja-JP": "高度専門職",
    },
  },
  {
    value: "skilled_labor",
    labels: { "zh-CN": "技能", "en-US": "Skilled labor", "ja-JP": "技能" },
  },
  {
    value: "student",
    labels: { "zh-CN": "留学", "en-US": "Student", "ja-JP": "留学" },
  },
  {
    value: "dependent",
    labels: { "zh-CN": "家族滞在", "en-US": "Dependent", "ja-JP": "家族滞在" },
  },
  {
    value: "permanent_resident",
    labels: {
      "zh-CN": "永住者",
      "en-US": "Permanent resident",
      "ja-JP": "永住者",
    },
  },
  {
    value: "spouse_of_jp_national",
    labels: {
      "zh-CN": "日本人配偶",
      "en-US": "Spouse of Japanese national",
      "ja-JP": "日本人の配偶者等",
    },
  },
  {
    value: "long_term_resident",
    labels: {
      "zh-CN": "定住者",
      "en-US": "Long-term resident",
      "ja-JP": "定住者",
    },
  },
  {
    value: "designated_activities",
    labels: {
      "zh-CN": "特定活动",
      "en-US": "Designated activities",
      "ja-JP": "特定活動",
    },
  },
  {
    value: "other",
    labels: { "zh-CN": "其他", "en-US": "Other", "ja-JP": "その他" },
  },
] as const;

function normalizeVisaTypeLocale(locale?: string): VisaTypeLocale {
  const normalized = locale?.trim().toLowerCase();
  if (normalized?.startsWith("zh")) return "zh-CN";
  if (normalized?.startsWith("en")) return "en-US";
  if (normalized?.startsWith("ja")) return "ja-JP";
  return "ja-JP";
}

/**
 * 返回签证类型选项列表（按目录顺序），供下拉/筛选使用。
 *
 * @param locale 可选语言标识；未传时按 ja-JP 兜底
 * @returns value/label 选项数组
 */
export function getVisaTypeOptions(locale?: string): VisaTypeSelectOption[] {
  const target = normalizeVisaTypeLocale(locale);
  return VISA_TYPE_CATALOG.map(({ value, labels }) => ({
    value,
    label: labels[target],
  }));
}

/**
 * 解析签证类型 code 为本地化展示文案。
 *
 * @param code 签证类型 code 或自由文本
 * @param locale 目标显示语言
 * @returns 命中目录返回本地化标签；未命中返回原始值（fallback "—"）
 */
export function resolveVisaTypeLabel(code: string, locale?: string): string {
  const target = normalizeVisaTypeLocale(locale);
  const found = VISA_TYPE_CATALOG.find((entry) => entry.value === code);
  return found ? found.labels[target] : String(code || "—");
}
