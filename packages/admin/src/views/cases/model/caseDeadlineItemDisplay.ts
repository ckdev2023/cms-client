import type { DeadlineItem } from "../types-detail";

const BAR_COLORS: Record<string, string> = {
  danger: "var(--color-danger)",
  warning: "#f59e0b",
  primary: "var(--color-primary-6)",
  muted: "var(--color-border-2)",
};

function normalizeSeverity(severity: string): keyof typeof BAR_COLORS {
  if (severity in BAR_COLORS) return severity as keyof typeof BAR_COLORS;
  return "muted";
}

/**
 * 返回期限列表项左侧色条用于 `backgroundColor` 的取值（CSS 颜色或 `var()`）。
 *
 * @param item - 已适配的期限项（含 `severity`）
 * @returns 供内联样式使用的颜色字符串
 */
export function deadlineItemBarColor(item: DeadlineItem): string {
  return BAR_COLORS[normalizeSeverity(item.severity)];
}

/**
 * 返回期限项「剩余天数 / 状态」徽标对应的 BEM 修饰类完整类名。
 *
 * @param item - 已适配的期限项
 * @returns `deadlines-tab__remaining--*` 类名
 */
export function deadlineItemChipClass(item: DeadlineItem): string {
  return `deadlines-tab__remaining--${normalizeSeverity(item.severity)}`;
}

/**
 * 返回期限项日期展示用的强调等级类名。
 *
 * @param item - 已适配的期限项
 * @returns `deadlines-tab__date--*` 类名
 */
export function deadlineItemDateClass(item: DeadlineItem): string {
  return `deadlines-tab__date--${normalizeSeverity(item.severity)}`;
}

/**
 * 适配期限项描述：`buildReminderDesc` 可能将用户原文与 `cases.*` key 用 ` · ` 拼接。
 *
 * @param desc - 原始描述字符串
 * @param t - vue-i18n 的 `t`，用于翻译以 `cases.` 开头的片段
 * @returns 展示用文案
 */
export function formatDeadlineItemDesc(
  desc: string,
  t: (key: string) => string,
): string {
  const trimmed = desc.trim();
  if (!trimmed) return desc;
  return trimmed
    .split(" · ")
    .map((segment) => {
      const s = segment.trim();
      if (s.startsWith("cases.")) return t(s);
      return segment;
    })
    .join(" · ");
}
