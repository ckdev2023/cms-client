/**
 * BUG-186：Case Detail Billing tab 的 milestone i18n 适配辅助。
 *
 * server 现阶段可能下发两类 `billing_records.milestone_name`：
 * - 新写入链路（`insertInitialBillingPlanFromQuote` / migration 041 后）写入稳定的 i18n code（`case_fee` 等）；
 * - 旧数据或 fixture 仍带 CJK 本地化文案（`案件報酬` / `着手金` 等）。
 *
 * 两类输入都反向映射到 `billing.milestone.<code>` 字典键，
 * UI 层统一通过 `t()` 渲染；未命中时 fallback 到 raw 值。
 */

const MILESTONE_NAME_TO_CODE: Record<string, string> = {
  case_fee: "case_fee",
  down_payment: "down_payment",
  final_payment: "final_payment",
  balance: "balance",
  interim_payment: "interim_payment",
  installment: "installment",
  案件報酬: "case_fee",
  案件报酬: "case_fee",
  着手金: "down_payment",
  尾款: "final_payment",
  残金: "balance",
  中間金: "interim_payment",
  中间金: "interim_payment",
  分割払い: "installment",
  分期付款: "installment",
};

/**
 * 将 milestone 原始名解析为 `billing.milestone.<code>` i18n key。
 *
 * @param rawName - milestone_name 原始值
 * @returns 命中返回 i18n key，否则返回 `undefined`
 */
export function resolveMilestoneI18nKey(rawName: string): string | undefined {
  if (!rawName) return undefined;
  const code = MILESTONE_NAME_TO_CODE[rawName];
  return code ? `billing.milestone.${code}` : undefined;
}
