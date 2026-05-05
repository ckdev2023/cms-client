import type { TransitionGuardReason } from "../types-detail";

export const CANCEL_REASON_PRESETS = [
  "MID_CASE_WITHDRAWAL",
  "CLIENT_LOST_CONTACT",
  "SWITCHED_TO_OTHER_FIRM",
  "OTHER",
] as const;

/**
 * 目标阶段是否被门禁阻断。
 *
 * @param guards - 门禁映射
 * @param target - 目标阶段代码
 * @returns 是否被阻断
 */
export function isTargetDisabled(
  guards: Record<string, TransitionGuardReason>,
  target: string,
): boolean {
  return guards[target] != null;
}

/**
 * 返回门禁阻断的翻译文案，无门禁时返回 undefined。
 *
 * @param guards - 门禁映射
 * @param target - 目标阶段代码
 * @param t - i18n 翻译函数
 * @returns 翻译后的门禁提示文案
 */
export function guardTooltip(
  guards: Record<string, TransitionGuardReason>,
  target: string,
  t: (key: string, params?: Record<string, unknown>) => string,
): string | undefined {
  const guard = guards[target];
  if (!guard) return undefined;
  return t(guard.key, guard.params ?? {});
}
