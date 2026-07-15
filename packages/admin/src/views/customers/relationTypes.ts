/**
 * 关联人关系类型。
 *
 * 定义点沿革：原在 `types.ts`，但本文件（关系类型目录）反向 import 它，
 * 而 `types.ts` 又 re-export 本文件的目录函数，构成 type 环。开启 depcruise
 * 的 tsPreCompilationDeps 后该环显形。类型与其目录理应同处，故定义下沉至此，
 * `types.ts` 单向 re-export，消费方无感。
 */
export type RelationType = "spouse" | "parent" | "child" | "agent" | "other";

type RelationTypeLocale = "zh-CN" | "en-US" | "ja-JP";

interface RelationTypeCatalogEntry {
  value: RelationType;
  labels: Record<RelationTypeLocale, string>;
}

interface RelationTypeOption {
  value: RelationType;
  label: string;
}

const RELATION_TYPE_CATALOG: readonly RelationTypeCatalogEntry[] = [
  {
    value: "spouse",
    labels: { "zh-CN": "配偶", "en-US": "Spouse", "ja-JP": "配偶者" },
  },
  {
    value: "parent",
    labels: { "zh-CN": "父母", "en-US": "Parent", "ja-JP": "親" },
  },
  {
    value: "child",
    labels: { "zh-CN": "子女", "en-US": "Child", "ja-JP": "子" },
  },
  {
    value: "agent",
    labels: {
      "zh-CN": "代理 / 顾问",
      "en-US": "Agent / advisor",
      "ja-JP": "代理 / 顧問",
    },
  },
  {
    value: "other",
    labels: { "zh-CN": "其他", "en-US": "Other", "ja-JP": "その他" },
  },
] as const;

function normalizeRelationTypeLocale(locale?: string): RelationTypeLocale {
  const normalized = locale?.trim().toLowerCase();
  if (normalized?.startsWith("en")) return "en-US";
  if (normalized?.startsWith("ja")) return "ja-JP";
  return "zh-CN";
}

/**
 * 根据当前语言生成关联人关系类型下拉选项。
 *
 * @param locale 当前界面语言；未传时默认按中文处理
 * @returns 本地化后的关系类型选项列表
 */
export function getRelationTypeOptions(locale?: string): RelationTypeOption[] {
  const targetLocale = normalizeRelationTypeLocale(locale);
  return RELATION_TYPE_CATALOG.map((option) => ({
    value: option.value,
    label: option.labels[targetLocale],
  }));
}

export const RELATION_TYPE_OPTIONS = getRelationTypeOptions();

/**
 * 根据关系类型值返回当前语言对应的展示文案。
 *
 * @param type 关系类型值或兜底自由文本
 * @param locale 当前界面语言；未传时默认按中文处理
 * @returns 匹配到时返回本地化标签，否则返回原始值或破折号
 */
export function getRelationTypeLabel(
  type: RelationType | string,
  locale?: string,
): string {
  const targetLocale = normalizeRelationTypeLocale(locale);
  const found = RELATION_TYPE_CATALOG.find((option) => option.value === type);
  return found ? found.labels[targetLocale] : String(type || "—");
}
