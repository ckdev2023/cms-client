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

export const ALL_OPTIONS: readonly GroupOptionWithStatus[] = [
  { value: "tokyo-1", label: "東京一組", status: "active" },
  { value: "tokyo-2", label: "東京二組", status: "active" },
  { value: "osaka", label: "大阪組", status: "disabled" },
];

/**
 * 仅返回 active Group 的选项列表，供选择器/下拉/表单使用。
 *
 * @returns 仅包含 value/label 的活跃 Group 数组
 */
export function getActiveGroupOptions(): GroupSelectOption[] {
  return ALL_OPTIONS.filter((g) => g.status === "active").map(
    ({ value, label }) => ({ value, label }),
  );
}

/**
 * 返回全量 Group 选项（含 disabled），供需要完整列表的场景使用。
 *
 * @returns 包含状态信息的全量 Group 数组
 */
export function getAllGroupOptions(): readonly GroupOptionWithStatus[] {
  return ALL_OPTIONS;
}

/**
 * 判断给定 Group（按 ID 或 label 匹配）是否为 disabled 状态。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @returns 该 Group 是否为 disabled 状态
 */
export function isGroupDisabled(idOrLabel: string): boolean {
  return ALL_OPTIONS.some(
    (g) =>
      (g.value === idOrLabel || g.label === idOrLabel) &&
      g.status === "disabled",
  );
}

/**
 * 仅按 label 判断是否为 disabled 状态。
 *
 * @param label - Group 显示名称
 * @returns 该 Group 是否为 disabled 状态
 */
export function isGroupDisabledByLabel(label: string): boolean {
  return ALL_OPTIONS.some((g) => g.label === label && g.status === "disabled");
}

/**
 * 解析 Group 显示名称：若 Group 为 disabled 则追加已停用后缀。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @param disabledSuffix - 已停用后缀文案（支持 i18n），默认"（已停用）"
 * @returns 带状态标记的显示名称
 */
export function resolveGroupLabel(
  idOrLabel: string,
  disabledSuffix = "（已停用）",
): string {
  const found = ALL_OPTIONS.find(
    (g) => g.value === idOrLabel || g.label === idOrLabel,
  );
  if (!found) return idOrLabel;
  return found.status === "disabled"
    ? `${found.label}${disabledSuffix}`
    : found.label;
}
