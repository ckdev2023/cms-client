import { BadRequestException } from "@nestjs/common";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import type { TimelineWriteInput } from "../timeline/timeline.service";

type TimelineWriter = {
  write: (ctx: RequestContext, input: TimelineWriteInput) => Promise<void>;
};

export const BMV_SIGNING_DEPOSIT_MILESTONE = "signing_deposit";

/** BMV 首期 Billing 创建结果。 */
export type BmvInitialBillingResult = {
  billingPlanId: string;
  paymentRecordId: string;
};

/**
 * BMV 签约后创建首期 BillingPlan 行 + 签约定金 PaymentRecord 占位。
 *
 * 幂等：同一 case 下已存在 signing_deposit milestone 时直接跳过。
 * 金额取 bmvProfile.quoteAmount；depositAmount ≤ 0 时跳过。
 *
 * @param pool - PostgreSQL 连接池。
 * @param ctx - 请求上下文。
 * @param caseId - 关联的案件 ID。
 * @param depositAmount - 签约定金金额。
 * @param timelineService - Timeline 写入服务。
 * @returns 创建结果（billingPlanId + paymentRecordId），跳过时返回 null。
 */
export async function createBmvInitialBilling(
  pool: Pool,
  ctx: RequestContext,
  caseId: string,
  depositAmount: number,
  timelineService: TimelineWriter,
): Promise<BmvInitialBillingResult | null> {
  if (!Number.isFinite(depositAmount) || depositAmount <= 0) return null;

  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);

  const existing = await tenantDb.query<{ id: string }>(
    `select id from billing_records
     where case_id = $1 and milestone_name = $2 limit 1`,
    [caseId, BMV_SIGNING_DEPOSIT_MILESTONE],
  );
  if (existing.rows.length > 0) return null;

  const ids = await insertBillingAndPayment(
    tenantDb,
    ctx,
    caseId,
    depositAmount,
  );
  await writeBillingTimeline(timelineService, ctx, caseId, depositAmount, ids);
  return ids;
}

/**
 * 查找客户最新的 BMV 案件 ID（签约时用于判断是否可立即创建 Billing）。
 *
 * @param pool - PostgreSQL 连接池。
 * @param ctx - 请求上下文。
 * @param customerId - 客户 ID。
 * @param bmvCaseType - BMV 案件类型代码。
 * @returns 案件 ID，不存在时返回 null。
 */
export async function findBmvCaseId(
  pool: Pool,
  ctx: RequestContext,
  customerId: string,
  bmvCaseType: string,
): Promise<string | null> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<{ id: string }>(
    `select id from cases
     where customer_id = $1 and case_type_code = $2
     order by created_at desc limit 1`,
    [customerId, bmvCaseType],
  );
  return result.rows.at(0)?.id ?? null;
}

// ── private helpers ──

type TenantDb = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

async function insertBillingAndPayment(
  tenantDb: TenantDb,
  ctx: RequestContext,
  caseId: string,
  depositAmount: number,
): Promise<BmvInitialBillingResult> {
  const bpResult = await tenantDb.query(
    `insert into billing_records
       (org_id, case_id, milestone_name, amount_due, status, gate_effect_mode)
     values ($1, $2, $3, $4, 'due', 'warn')
     returning id`,
    [ctx.orgId, caseId, BMV_SIGNING_DEPOSIT_MILESTONE, depositAmount],
  );
  const billingPlanId = bpResult.rows.at(0)?.id as string | undefined;
  if (!billingPlanId) {
    throw new BadRequestException("Failed to create BMV initial billing plan");
  }

  const now = new Date().toISOString();
  const prResult = await tenantDb.query(
    `insert into payment_records
       (org_id, billing_record_id, case_id, amount_received,
        received_at, record_status, recorded_by, note)
     values ($1, $2, $3, $4, $5, 'valid', $6, $7)
     returning id`,
    [
      ctx.orgId,
      billingPlanId,
      caseId,
      depositAmount,
      now,
      ctx.userId,
      "BMV signing deposit",
    ],
  );
  const paymentRecordId = prResult.rows.at(0)?.id as string | undefined;
  if (!paymentRecordId) {
    throw new BadRequestException(
      "Failed to create BMV signing deposit record",
    );
  }

  await tenantDb.query(
    `update billing_records set status = 'paid', updated_at = now()
     where id = $1`,
    [billingPlanId],
  );

  return { billingPlanId, paymentRecordId };
}

async function writeBillingTimeline(
  timelineService: TimelineWriter,
  ctx: RequestContext,
  caseId: string,
  depositAmount: number,
  ids: BmvInitialBillingResult,
): Promise<void> {
  await timelineService.write(ctx, {
    entityType: "billing_plan",
    entityId: ids.billingPlanId,
    action: "billing_plan.created",
    payload: {
      caseId,
      milestoneName: BMV_SIGNING_DEPOSIT_MILESTONE,
      amountDue: depositAmount,
      source: "bmv_signing",
    },
  });
  await timelineService.write(ctx, {
    entityType: "payment_record",
    entityId: ids.paymentRecordId,
    action: "payment_record.created",
    payload: {
      billingPlanId: ids.billingPlanId,
      caseId,
      amountReceived: depositAmount,
      source: "bmv_signing_deposit",
    },
  });
}
