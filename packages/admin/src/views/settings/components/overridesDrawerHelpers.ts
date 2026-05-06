import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { EffectivePermissionRow } from "../model/useMemberOverrides";
import { PERMISSION_GROUPS } from "../model/permissionGroups";

/**
 * 将有效权限行映射为 Chip 色调。
 *
 * @param row - 有效权限行数据
 * @returns Chip 色调
 */
export function effectiveTone(row: EffectivePermissionRow): ChipTone {
  if (row.overrideEffect === "deny") return "danger";
  if (row.overrideEffect === "grant") return "success";
  return row.effective ? "success" : "neutral";
}

/**
 * 从资源标识获取显示标签。
 *
 * @param resource - 资源标识符
 * @param t - i18n 翻译函数
 * @returns 显示标签字符串
 */
export function groupLabel(
  resource: string,
  t: (key: string) => string,
): string {
  const group = PERMISSION_GROUPS.find((g) => g.resource === resource);
  return group ? t(group.labelKey) : resource;
}

/**
 * 按资源分组权限行。
 *
 * @param rows - 有效权限行数组
 * @param t - i18n 翻译函数
 * @returns 资源分组数组
 */
export function groupedRows(
  rows: EffectivePermissionRow[],
  t: (key: string) => string,
) {
  const groups: {
    /**
     *
     */
    resource: string;
    /**
     *
     */
    label: string;
    /**
     *
     */
    items: EffectivePermissionRow[];
  }[] = [];
  for (const pg of PERMISSION_GROUPS) {
    const items = rows.filter((r) => pg.items.some((i) => i.code === r.code));
    if (items.length > 0) {
      groups.push({
        resource: pg.resource,
        label: groupLabel(pg.resource, t),
        items,
      });
    }
  }
  return groups;
}

/**
 * 将 ISO 日期字符串格式化为本地格式。
 *
 * @param dateStr - ISO 日期字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
