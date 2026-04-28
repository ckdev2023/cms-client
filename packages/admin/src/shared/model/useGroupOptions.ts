/**
 * 跨模块 Group 选项管理。
 *
 * 当前阶段以 fixture 驱动；未来接 API 后替换数据源即可，
 * 消费侧不需要改动。
 */

/**
 * Group 状态：active（正常）/ disabled（已停用）。
 */
export type OrgGroupStatus = "active" | "disabled";

type GroupLocale = "zh-CN" | "en-US" | "ja-JP";

interface GroupCatalogEntry {
  value: string;
  status: OrgGroupStatus;
  labels: Record<GroupLocale, string>;
}

/**
 * 供跨模块 Group 选择器使用的选项格式。
 */
export interface GroupSelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 * 带状态的 Group 选项，用于需要区分 active/disabled 的场景。
 */
export interface GroupOptionWithStatus extends GroupSelectOption {
  /**
   *
   */
  status: OrgGroupStatus;
}

const GROUP_CATALOG: readonly GroupCatalogEntry[] = [
  {
    value: "tokyo-1",
    status: "active",
    labels: {
      "zh-CN": "东京一组",
      "en-US": "Tokyo Team 1",
      "ja-JP": "東京一組",
    },
  },
  {
    value: "tokyo-2",
    status: "active",
    labels: {
      "zh-CN": "东京二组",
      "en-US": "Tokyo Team 2",
      "ja-JP": "東京二組",
    },
  },
  {
    value: "osaka",
    status: "disabled",
    labels: {
      "zh-CN": "大阪组",
      "en-US": "Osaka Team",
      "ja-JP": "大阪組",
    },
  },
] as const;

export const ALL_OPTIONS: readonly GroupOptionWithStatus[] = GROUP_CATALOG.map(
  ({ value, status, labels }) => ({
    value,
    label: labels["ja-JP"],
    status,
  }),
);

function normalizeGroupLocale(locale?: string): GroupLocale {
  const normalized = locale?.trim().toLowerCase();
  if (normalized?.startsWith("zh")) return "zh-CN";
  if (normalized?.startsWith("en")) return "en-US";
  if (normalized?.startsWith("ja")) return "ja-JP";
  return "ja-JP";
}

function localizeGroupOption(
  option: GroupCatalogEntry,
  locale?: string,
): GroupOptionWithStatus {
  const normalizedLocale = normalizeGroupLocale(locale);
  return {
    value: option.value,
    label: option.labels[normalizedLocale],
    status: option.status,
  };
}

function matchesGroup(option: GroupCatalogEntry, idOrLabel: string): boolean {
  const normalized = idOrLabel.trim();
  return (
    option.value === normalized ||
    Object.values(option.labels).some(
      (label) =>
        label === normalized ||
        (option.status === "disabled" && normalized.startsWith(label)),
    )
  );
}

/**
 * 仅返回 active Group 的选项列表，供选择器/下拉/表单使用。
 *
 * @param locale - 可选语言标识；用于返回对应语言的 Group 标签
 * @returns 仅包含 value/label 的活跃 Group 数组
 */
export function getActiveGroupOptions(locale?: string): GroupSelectOption[] {
  return GROUP_CATALOG.filter((g) => g.status === "active").map(
    ({ value, labels }) => ({
      value,
      label: labels[normalizeGroupLocale(locale)],
    }),
  );
}

/**
 * 返回全量 Group 选项（含 disabled），供需要完整列表的场景使用。
 *
 * @param locale - 可选语言标识；传入时返回对应语言的完整 Group 列表
 * @returns 包含状态信息的全量 Group 数组
 */
export function getAllGroupOptions(
  locale?: string,
): readonly GroupOptionWithStatus[] {
  if (!locale) return ALL_OPTIONS;
  return GROUP_CATALOG.map((option) => localizeGroupOption(option, locale));
}

/**
 * 判断给定 Group（按 ID 或 label 匹配）是否为 disabled 状态。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @returns 该 Group 是否为 disabled 状态
 */
export function isGroupDisabled(idOrLabel: string): boolean {
  return GROUP_CATALOG.some(
    (g) => matchesGroup(g, idOrLabel) && g.status === "disabled",
  );
}

/**
 * 仅按 label 判断是否为 disabled 状态。
 *
 * @param label - Group 显示名称
 * @returns 该 Group 是否为 disabled 状态
 */
export function isGroupDisabledByLabel(label: string): boolean {
  return GROUP_CATALOG.some(
    (g) => matchesGroup(g, label) && g.status === "disabled",
  );
}

/**
 * 解析 Group 显示名称：若 Group 为 disabled 则追加已停用后缀。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @param disabledSuffix - 已停用后缀文案（支持 i18n），默认"（已停用）"
 * @param locale - 目标显示语言；缺省时保持当前默认日文兼容行为
 * @returns 带状态标记的显示名称
 */
export function resolveGroupLabel(
  idOrLabel: string,
  disabledSuffix = "（已停用）",
  locale?: string,
): string {
  const found = GROUP_CATALOG.find((g) => matchesGroup(g, idOrLabel));
  if (!found) return idOrLabel;
  const label = found.labels[normalizeGroupLocale(locale)];
  return found.status === "disabled" ? `${label}${disabledSuffix}` : label;
}

/**
 * 将 Group ID 或显示名称解析为稳定的 Group ID。
 *
 * 未命中已知选项时返回 `null`，避免把显示标签误当成下游表单的 groupId。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @returns 规范化后的 Group ID；未知值返回 `null`
 */
export function resolveGroupValue(idOrLabel: string): string | null {
  const found = GROUP_CATALOG.find((g) => matchesGroup(g, idOrLabel));
  return found?.value ?? null;
}
