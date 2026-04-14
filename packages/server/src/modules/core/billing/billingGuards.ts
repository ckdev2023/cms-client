import type { BillingGateEffectMode } from "../model/billingEntities";
import type { TenantDbTx } from "../tenancy/tenantDb";

type BillingSummaryRow = {
  amount_due: string | number;
  status: string;
  milestone_name: string | null;
  gate_effect_mode: string;
};

type ValidPaymentSumRow = {
  total_received: string | number;
};

/**
 * 从 billing_records + payment_records(record_status='valid') 聚合，
 * 同步案件缓存字段：deposit_paid_cached / final_payment_paid_cached / billing_unpaid_amount_cached。
 *
 * @param tx 事务连接
 * @param caseId 案件 ID
 */
export async function syncBillingCacheForCase(
  tx: TenantDbTx,
  caseId: string,
): Promise<void> {
  const billingResult = await tx.query<BillingSummaryRow>(
    `select amount_due, status, milestone_name, gate_effect_mode
     from billing_records where case_id = $1`,
    [caseId],
  );

  const validPaymentResult = await tx.query<ValidPaymentSumRow>(
    `select coalesce(sum(amount_received), 0) as total_received
     from payment_records
     where case_id = $1 and record_status = 'valid'`,
    [caseId],
  );

  const totalDue = billingResult.rows.reduce(
    (sum, r) => sum + Number(r.amount_due),
    0,
  );
  const totalReceived = Number(validPaymentResult.rows[0]?.total_received ?? 0);
  const unpaid = Math.max(totalDue - totalReceived, 0);

  const depositSettled = billingResult.rows
    .filter((r) => isDepositMilestone(r.milestone_name))
    .every((r) => r.status === "paid");

  const finalPaymentSettled = billingResult.rows
    .filter((r) => isFinalPaymentMilestone(r.milestone_name))
    .every((r) => r.status === "paid");

  await tx.query(
    `update cases set
       deposit_paid_cached = $2,
       final_payment_paid_cached = $3,
       billing_unpaid_amount_cached = $4,
       updated_at = now()
     where id = $1`,
    [caseId, depositSettled, finalPaymentSettled, unpaid],
  );
}

/**
 * COE 尾款守卫：检查结果后收费节点（尾款）是否已结清。
 *
 * @param tx 事务连接
 * @param caseId 案件 ID
 * @returns null=无需守卫, settled=true 已结清, settled=false 未结清需风险确认
 */
export async function checkFinalPaymentGuard(
  tx: TenantDbTx,
  caseId: string,
): Promise<FinalPaymentGuardResult | null> {
  const result = await tx.query<BillingSummaryRow>(
    `select amount_due, status, milestone_name, gate_effect_mode
     from billing_records
     where case_id = $1 and (
       lower(milestone_name) like '%尾款%'
       or lower(milestone_name) like '%final%'
       or lower(milestone_name) like '%結果%'
     )`,
    [caseId],
  );

  if (result.rows.length === 0) return null;

  const allOff = result.rows.every((r) => r.gate_effect_mode === "off");
  if (allOff) return null;

  const allPaid = result.rows.every((r) => r.status === "paid");
  if (allPaid) return { settled: true };

  const totalDue = result.rows.reduce(
    (sum, r) => sum + Number(r.amount_due),
    0,
  );

  const payResult = await tx.query<ValidPaymentSumRow>(
    `select coalesce(sum(pr.amount_received), 0) as total_received
     from payment_records pr
     join billing_records br on br.id = pr.billing_record_id
     where br.case_id = $1 and pr.record_status = 'valid' and (
       lower(br.milestone_name) like '%尾款%'
       or lower(br.milestone_name) like '%final%'
       or lower(br.milestone_name) like '%結果%'
     )`,
    [caseId],
  );

  const received = Number(payResult.rows[0]?.total_received ?? 0);
  const gateMode = result.rows.find((r) => r.gate_effect_mode === "block")
    ?.gate_effect_mode
    ? "block"
    : "warn";

  return {
    settled: false,
    unpaid: Math.max(totalDue - received, 0),
    gateEffectMode: gateMode as BillingGateEffectMode,
  };
}

/**
 * COE 尾款守卫检查结果。
 */
export type FinalPaymentGuardResult =
  | { settled: true }
  | {
      settled: false;
      unpaid: number;
      gateEffectMode: BillingGateEffectMode;
    };

function isDepositMilestone(name: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("签约") ||
    lower.includes("deposit") ||
    lower.includes("着手")
  );
}

function isFinalPaymentMilestone(name: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase();
  return (
    lower.includes("尾款") || lower.includes("final") || lower.includes("結果")
  );
}
