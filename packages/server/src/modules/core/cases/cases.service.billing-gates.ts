/* eslint-disable jsdoc/require-param-description, jsdoc/require-description */
/**
 * 案件写入路径上的尾款 / billing 守卫。
 *
 * 拆分自 `cases.service.ts`：
 * - `runCoeSendBillingGate` — 下签后 COE 发送 / phase=COE_SENT 共用
 * - `assertPostApprovalBillingGate` — 子阶段切换前夹层
 * - `assertCoeSendBillingGate` — businessPhase 推进 → COE_SENT
 * - `assertWaitingPaymentBillingGate` — businessPhase 推进 → WAITING_PAYMENT
 * - `assertWorkflowStepBillingGate` — BMV 子步骤 billingGate 双路径（block/warn）
 * - `hasCaseBillingReceivable` — 案件是否存在 billing_records（P0 每案一次性应收）
 */
import { BadRequestException } from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import type { TenantDbTx } from "../tenancy/tenantDb";
import { checkFinalPaymentGuard } from "../billing/billingGuards";
import { decideFinalPaymentGuard } from "./cases.types-final-payment";
import { type BmvWorkflowStep } from "./cases.workflow-step";
import { BMV_STEP_LOOKUP } from "./cases.workflow-step-readmodel";

async function hasCaseBillingReceivable(
  tx: TenantDbTx,
  caseId: string,
): Promise<boolean> {
  const result = await tx.query<{ ok: boolean }>(
    `select exists (
       select 1
       from billing_records
       where case_id = $1
     ) as ok`,
    [caseId],
  );
  return result.rows[0]?.ok;
}

/**
 * 下签前 COE 发送的尾款守卫（POST_APPROVAL_BILLING_BLOCKED 系列）。
 * @param tx
 * @param current
 */
export async function runCoeSendBillingGate(
  tx: TenantDbTx,
  current: Case,
): Promise<void> {
  const hasReceivable = await hasCaseBillingReceivable(tx, current.id);
  if (!hasReceivable) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED +
        `: No billing receivable exists for this case. ` +
        `Please create the lump-sum billing record before sending COE.`,
    );
  }

  const guard = await checkFinalPaymentGuard(tx, current.id);
  const decision = decideFinalPaymentGuard(
    guard,
    current.billingRiskAcknowledgedAt !== null,
  );

  if (decision.decision === "block") {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED +
        `: Final payment is still unpaid (${String(decision.unpaid)}). ` +
        `Billing gate blocks COE sending.`,
    );
  }

  if (decision.decision === "warn_requires_ack") {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED +
        `: Final payment is still unpaid (${String(decision.unpaid)}). ` +
        `Please acknowledge billing risk before sending COE.`,
    );
  }
}

/**
 *
 * @param tx
 * @param current
 * @param nextStage
 */
export async function assertPostApprovalBillingGate(
  tx: TenantDbTx,
  current: Case,
  nextStage: string,
): Promise<void> {
  if (nextStage !== "coe_sent") return;
  await runCoeSendBillingGate(tx, current);
}

/**
 * businessPhase 维度推进到 COE_SENT 时的尾款守卫。
 * 触发条件：仅当 toPhase === COE_SENT 时执行；其他 phase 立即放行。
 * @param tx
 * @param current
 * @param toPhase
 */
export async function assertCoeSendBillingGate(
  tx: TenantDbTx,
  current: Case,
  toPhase: string,
): Promise<void> {
  if (toPhase !== "COE_SENT") return;
  await runCoeSendBillingGate(tx, current);
}

/**
 * businessPhase 维度推进到 WAITING_PAYMENT 时的收费记录守卫。
 *
 * 触发条件：仅当 toPhase === WAITING_PAYMENT 时执行；其他 phase 立即放行。
 * 检查 billing_records 是否存在该 case 的至少 1 条仍有未结清应收的记录
 * （status ∈ due / partial / overdue；与收费汇总「待收」口径一致）。
 * @param tx
 * @param current
 * @param toPhase
 */
export async function assertWaitingPaymentBillingGate(
  tx: TenantDbTx,
  current: Case,
  toPhase: string,
): Promise<void> {
  if (toPhase !== "WAITING_PAYMENT") return;
  const result = await tx.query<Record<string, unknown>>(
    `select 1 from billing_records
     where case_id = $1 and status in ('due', 'partial', 'overdue')
     limit 1`,
    [current.id],
  );
  if (result.rows.length === 0) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WAITING_PAYMENT_BILLING_REQUIRED +
        `: At least one outstanding billing record (due/partial/overdue) is required before transitioning to WAITING_PAYMENT.`,
    );
  }
}

/**
 * 子步骤收费门禁检查 — block 与 warn 双路径对齐 decideFinalPaymentGuard。
 * @param tx
 * @param current
 * @param toStepCode
 */
export async function assertWorkflowStepBillingGate(
  tx: TenantDbTx,
  current: Case,
  toStepCode: BmvWorkflowStep,
): Promise<void> {
  const blueprintItem = BMV_STEP_LOOKUP.get(toStepCode);
  if (!blueprintItem?.billingGate || blueprintItem.billingGate.mode === "off") {
    return;
  }

  const guard = await checkFinalPaymentGuard(tx, current.id);
  const blueprintMode = blueprintItem.billingGate.mode;

  const effectiveGuard =
    guard &&
    !guard.settled &&
    blueprintMode === "block" &&
    guard.gateEffectMode !== "block"
      ? {
          settled: false as const,
          unpaid: guard.unpaid,
          gateEffectMode: "block" as const,
        }
      : guard;

  const decision = decideFinalPaymentGuard(
    effectiveGuard,
    current.billingRiskAcknowledgedAt !== null,
  );

  if (decision.decision === "block") {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED +
        `: Final payment is still unpaid (${String(decision.unpaid)}). ` +
        `Billing gate blocks advancing to ${toStepCode}.`,
    );
  }

  if (decision.decision === "warn_requires_ack") {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_BILLING_BLOCKED +
        `: Final payment is still unpaid (${String(decision.unpaid)}). ` +
        `Please acknowledge billing risk before advancing to ${toStepCode}.`,
    );
  }
}
