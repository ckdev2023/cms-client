// ─── Final Payment & COE Gate Adapter (p1-fe-004-01) ──────────────
// gate_trigger_step=COE_SENT + gate_effect_mode=block。
// 当前步骤在 APPROVED/WAITING_PAYMENT 附近时激活；
// 尾款已清且无欠款风险时方可推进到 COE_SENT。

import type {
  FinalPaymentGateInfo,
  FinalPaymentBlocker,
} from "../types-detail";

/** 需要展示尾款门禁的步骤集合。 */
const COE_GATE_RELEVANT_STEPS: ReadonlySet<string> = new Set([
  "APPROVED",
  "WAITING_PAYMENT",
]);

/**
 * 从 billing metrics 与 workflow step 构建尾款门禁状态。
 *
 * @param stepCode - 当前业务子步骤代码
 * @param isBmv - 是否为 BMV 案件
 * @param metrics - billing 派生指标
 * @param metrics.finalPaymentPaid - 尾款是否已清
 * @param metrics.unpaidAmount - 未付金额
 * @param metrics.billingRiskAck - 欠款风险是否已确认
 * @returns 门禁状态；不适用时返回 null
 */
export function buildFinalPaymentGate(
  stepCode: string | null,
  isBmv: boolean,
  metrics: {
    finalPaymentPaid: boolean;
    unpaidAmount: number;
    billingRiskAck: boolean;
  },
): FinalPaymentGateInfo | null {
  if (!isBmv) return null;
  if (!stepCode || !COE_GATE_RELEVANT_STEPS.has(stepCode)) return null;

  const blockers: FinalPaymentBlocker[] = [];
  if (!metrics.finalPaymentPaid) {
    blockers.push({
      code: "final_payment_outstanding",
      label: "final_payment_outstanding",
    });
  }
  if (metrics.unpaidAmount > 0 && !metrics.billingRiskAck) {
    blockers.push({
      code: "billing_risk_unacknowledged",
      label: "billing_risk_unacknowledged",
    });
  }

  return {
    paymentCleared: metrics.finalPaymentPaid,
    outstandingLabel:
      metrics.unpaidAmount > 0
        ? `¥${metrics.unpaidAmount.toLocaleString()}`
        : "",
    canAdvanceToCoe: blockers.length === 0,
    blockers,
  };
}
