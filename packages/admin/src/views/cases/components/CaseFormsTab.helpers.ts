import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, FormGenerated } from "../types-detail";

const TONE_ICON_CLASS: Record<string, string> = {
  success: "forms-tab__icon--success",
  warning: "forms-tab__icon--warning",
  primary: "forms-tab__icon--primary",
  danger: "forms-tab__icon--danger",
  muted: "forms-tab__icon--muted",
};

/**
 * 根据状态色调返回图标 CSS 类名。
 *
 * @param item - 生成文書条目
 * @returns CSS 类名
 */
export function iconClass(item: FormGenerated): string {
  return TONE_ICON_CLASS[item.tone] ?? "forms-tab__icon--muted";
}

const TONE_TO_CHIP: Record<string, ChipTone> = {
  success: "success",
  warning: "warning",
  primary: "primary",
  danger: "danger",
  muted: "neutral",
};

/**
 * 将 tone 映射为 Chip 组件色调。
 *
 * @param item - 生成文書条目
 * @returns Chip 色调
 */
export function chipTone(item: FormGenerated): ChipTone {
  return TONE_TO_CHIP[item.tone] ?? "neutral";
}

/**
 * 判断当前案件是否有模板或已生成文書。
 *
 * @param detail - 案件详情数据
 * @param isReadonly - 是否只读模式
 * @returns 是否包含文書数据
 */
export function hasForms(detail: CaseDetail, isReadonly: boolean): boolean {
  return (
    (!isReadonly && detail.forms.templates.length > 0) ||
    detail.forms.generated.length > 0
  );
}
