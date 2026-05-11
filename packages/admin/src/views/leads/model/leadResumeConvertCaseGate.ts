import type { LocationQuery } from "vue-router";
import type { LeadDetail } from "../types";

/** `resumeConvert=1` 深度链接在「转化」Tab 下的处理结果。 */
export type ResumeConvertDeepLinkOutcome =
  | "ignore"
  /** 已有关联案件：只移除 query，不弹窗 */
  | "strip_only"
  /** 打开「转案件」对话框并移除 query */
  | "open_case_dialog";

/**
 * 解析 `?tab=conversion&resumeConvert=1` 深度链接应执行的动作。
 *
 * @param lead - 当前线索详情；未加载时为 `null` / `undefined`
 * @param query - 路由 query（含 `tab`、`resumeConvert`）
 * @returns 应执行的恢复策略
 */
export function resumeConvertDeepLinkOutcome(
  lead: LeadDetail | null | undefined,
  query: LocationQuery,
): ResumeConvertDeepLinkOutcome {
  if (!lead) return "ignore";
  if (query.resumeConvert !== "1") return "ignore";
  if (query.tab !== "conversion") return "ignore";
  if (lead.conversion.convertedCase != null) return "strip_only";
  return "open_case_dialog";
}
