import type { TransitionGuardReason } from "../types-detail";
import { buildFinalPaymentGate } from "./CaseAdapterFinalPaymentGate";

/**
 * 业务阶段流转菜单的门禁映射（BMV 尾款／COE、成功结案欠款等）。
 *
 * @param businessPhase - 当前业务阶段
 * @param unpaidAmount - 未收金额
 * @param billingRiskAck - 欠款风险确认
 * @param isBmv - 是否为 BMV 案件
 * @param workflowStepCode - 当前业务子步骤（与尾款门禁一致）
 * @param finalPaymentPaid - 尾款是否已清
 * @param finalPaymentMilestoneMatched - 是否已配置尾款类收费节点
 * @returns 受限的目标阶段 → 阻断原因映射
 */
export function buildTransitionGuards(
  businessPhase: string,
  unpaidAmount: number,
  billingRiskAck: boolean,
  isBmv: boolean,
  workflowStepCode: string | null,
  finalPaymentPaid: boolean,
  finalPaymentMilestoneMatched: boolean,
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

  const coeGate = buildFinalPaymentGate(workflowStepCode, isBmv, {
    finalPaymentPaid,
    finalPaymentMilestoneMatched,
    unpaidAmount,
    billingRiskAck,
  });
  if (
    businessPhase === "WAITING_PAYMENT" &&
    coeGate &&
    !coeGate.canAdvanceToCoe
  ) {
    const params: Record<string, string> = {};
    if (unpaidAmount > 0) {
      params.amount = `¥${unpaidAmount.toLocaleString()}`;
    }
    guards["COE_SENT"] = {
      key: "cases.detail.phaseMenu.guards.coeAdvanceBlocked",
      params,
    };
  }

  return guards;
}
