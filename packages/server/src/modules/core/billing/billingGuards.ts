import type { BillingGateEffectMode } from "../model/billingEntities";
import type { TenantDbTx } from "../tenancy/tenantDb";

type BillingPlanGuardRow = {
  id: string;
  amount_due: string | number;
  status: string;
  milestone_name: string | null;
  gate_effect_mode: string;
};

type ValidPaymentSumRow = {
  total_received: string | number;
};

/**
 *
 */
export type FinalPaymentGuardResult =
  | { settled: true }
  | {
      settled: false;
      unpaid: number;
      gateEffectMode: BillingGateEffectMode;
    };

/**
 * 判定 COE 等后置一步骤收费守卫应覆盖哪些 BillingPlan 行。
 * - 仍存在名称命中尾款/final/結果 行时：仅这些行（兼容历史多行拆分表述）。
 * - 否则若案件只有一行应收：一次性收费，整行参与守卫。
 * - 否则：遗留多行且无关键词，要求全部 BillingPlan 结清后才视为最终结清。
 *
 * @param rows 案件下 billing_records 行（与 guard 查询列一致）。
 * @returns 参与尾款/一次性应收结清判断的行子集。
 */
function resolveFinalSettlementScope<
  T extends {
    amount_due: string | number;
    status: string;
    milestone_name: string | null;
    gate_effect_mode: string;
  },
>(rows: T[]): T[] {
  const keywordRows = rows.filter((r) =>
    isFinalPaymentMilestone(r.milestone_name),
  );
  if (keywordRows.length > 0) return keywordRows;
  if (rows.length === 1) return rows;
  return rows;
}

/**
 * COE 尾款/一次性应收结清判定（与 {@link checkFinalPaymentGuard} 一致），可复用预取的 billing 行。
 *
 * @param tx - DB 事务连接
 * @param caseId - 案件 ID
 * @param rows - 该案件 billing_records 列（含 id）
 * @returns 需要参与守卫且非全 off 时为结清/未结清结果；否则 null（走 status 回退）
 */
async function resolveScopedFinalPaymentSettlement(
  tx: TenantDbTx,
  caseId: string,
  rows: BillingPlanGuardRow[],
): Promise<FinalPaymentGuardResult | null> {
  if (rows.length === 0) return null;

  const scopeRows = resolveFinalSettlementScope(rows);
  if (scopeRows.length === 0) return null;

  const allOff = scopeRows.every((r) => r.gate_effect_mode === "off");
  if (allOff) return null;

  const allPaid = scopeRows.every((r) => r.status === "paid");
  if (allPaid) return { settled: true };

  const totalDue = scopeRows.reduce((sum, r) => sum + Number(r.amount_due), 0);

  const scopeIds = scopeRows.map((r) => r.id);
  const payResult = await tx.query<ValidPaymentSumRow>(
    `select coalesce(sum(pr.amount_received), 0) as total_received
     from payment_records pr
     where pr.case_id = $1 and pr.record_status = 'valid'
       and pr.billing_record_id = any($2::uuid[])`,
    [caseId, scopeIds],
  );

  const received = Number(payResult.rows[0]?.total_received ?? 0);
  const unpaid = Math.max(totalDue - received, 0);
  if (unpaid <= 0 && (totalDue > 0 || received > 0)) {
    return { settled: true };
  }

  const gateMode = scopeRows.find((r) => r.gate_effect_mode === "block")
    ?.gate_effect_mode
    ? "block"
    : "warn";

  return {
    settled: false,
    unpaid,
    gateEffectMode: gateMode as BillingGateEffectMode,
  };
}

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
  const billingResult = await tx.query<BillingPlanGuardRow>(
    `select amount_due, status, milestone_name, gate_effect_mode, id
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

  const depositRows = billingResult.rows.filter((r) =>
    isDepositMilestone(r.milestone_name),
  );
  const depositSettled =
    depositRows.length === 0 || depositRows.every((r) => r.status === "paid");

  const scopedSettlement = await resolveScopedFinalPaymentSettlement(
    tx,
    caseId,
    billingResult.rows,
  );
  let finalPaymentSettled: boolean;
  if (scopedSettlement !== null) {
    finalPaymentSettled = scopedSettlement.settled;
  } else {
    const finalSettlementRows = resolveFinalSettlementScope(billingResult.rows);
    finalPaymentSettled =
      finalSettlementRows.length > 0 &&
      finalSettlementRows.every((r) => r.status === "paid");
  }

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
 * COE 后置步骤收费守卫：检查应收（一次性或尾款keyword子集）是否已结清。
 *
 * @param tx 事务连接
 * @param caseId 案件 ID
 * @returns null=无需守卫, settled=true 已结清, settled=false 未结清需风险确认
 */
export async function checkFinalPaymentGuard(
  tx: TenantDbTx,
  caseId: string,
): Promise<FinalPaymentGuardResult | null> {
  const result = await tx.query<BillingPlanGuardRow>(
    `select id, amount_due, status, milestone_name, gate_effect_mode
     from billing_records
     where case_id = $1`,
    [caseId],
  );

  return resolveScopedFinalPaymentSettlement(tx, caseId, result.rows);
}

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
