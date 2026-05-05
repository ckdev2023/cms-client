import type { TransitionGuardReason } from "../types-detail";

/**
 * BMV SUCCESS 阶段的收尾欠款门禁。
 *
 * @param businessPhase - 当前业务阶段
 * @param unpaidAmount - 未收金额
 * @param billingRiskAck - 欠款风险确认
 * @param isBmv - 是否为 BMV 案件
 * @returns 受限的目标阶段 → 阻断原因映射
 */
export function buildTransitionGuards(
  businessPhase: string,
  unpaidAmount: number,
  billingRiskAck: boolean,
  isBmv: boolean,
): Record<string, TransitionGuardReason> {
  const guards: Record<string, TransitionGuardReason> = {};
  if (
    businessPhase === "SUCCESS" &&
    unpaidAmount > 0 &&
    !billingRiskAck &&
    isBmv
  ) {
    guards["RESIDENCE_PERIOD_RECORDED"] = {
      key: "cases.detail.phaseMenu.guards.successCloseoutBlocked",
      params: { amount: `¥${unpaidAmount.toLocaleString()}` },
    };
  }
  return guards;
}
