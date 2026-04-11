import type {
  BillingPlanStatus,
  BillingGateEffectMode,
  PaymentRecordStatus,
  CaseBillingSummary,
} from "./BillingPlan";

const VALID_BILLING_TRANSITIONS: Record<
  BillingPlanStatus,
  BillingPlanStatus[]
> = {
  due: ["partial", "paid", "overdue"],
  partial: ["paid", "overdue"],
  overdue: ["partial", "paid"],
  paid: [],
};

/**
 * 収費ステータス遷移が合法かどうかを判定する。
 *
 * @param from - 現在のステータス
 * @param to - 遷移先のステータス
 * @returns 合法なら true
 */
export function isValidBillingTransition(
  from: BillingPlanStatus,
  to: BillingPlanStatus,
): boolean {
  return VALID_BILLING_TRANSITIONS[from]?.includes(to) === true;
}

/**
 * 収費ステータスが終端（paid）かどうかを判定する。
 *
 * @param status - 判定対象のステータス
 * @returns paid なら true
 */
export function isBillingTerminal(status: BillingPlanStatus): boolean {
  return status === "paid";
}

/**
 * P0 収費ガード：gate_effect_mode に基づき提出をブロックするか判定。
 *
 * @param summary - 案件の収費サマリ
 * @param mode - ガードモード（off / warn / block）
 * @returns ガード結果
 */
export function evaluateBillingGate(
  summary: CaseBillingSummary,
  mode: BillingGateEffectMode,
): "pass" | "warn" | "block" {
  if (mode === "off") return "pass";
  if (summary.unpaidAmount <= 0) return "pass";
  return mode === "warn" ? "warn" : "block";
}

/**
 * BillingPlan と PaymentRecord からサマリを計算する。
 *
 * @param plans - 収費計画（amountDue, status, milestoneName）
 * @param payments - 入金記録（amountReceived, recordStatus）
 * @returns 収費サマリ
 */
export function computeBillingSummary(
  plans: readonly {
    amountDue: number;
    status: BillingPlanStatus;
    milestoneName: string | null;
  }[],
  payments: readonly {
    amountReceived: number;
    recordStatus: PaymentRecordStatus;
  }[],
): CaseBillingSummary {
  const totalDue = plans.reduce((sum, p) => sum + p.amountDue, 0);
  const totalReceived = payments
    .filter((r) => r.recordStatus === "valid")
    .reduce((sum, r) => sum + r.amountReceived, 0);

  const depositPlans = plans.filter(
    (p) => p.milestoneName === "签約" || p.milestoneName === "deposit",
  );
  const depositDue = depositPlans.reduce((s, p) => s + p.amountDue, 0);
  const depositPaid =
    depositDue > 0 && depositPlans.every((p) => p.status === "paid");

  const finalPlans = plans.filter(
    (p) => p.milestoneName === "結果後" || p.milestoneName === "final",
  );
  const finalDue = finalPlans.reduce((s, p) => s + p.amountDue, 0);
  const finalPaymentPaid =
    finalDue > 0 && finalPlans.every((p) => p.status === "paid");

  return {
    totalDue,
    totalReceived,
    unpaidAmount: Math.max(0, totalDue - totalReceived),
    depositPaid,
    finalPaymentPaid,
  };
}
