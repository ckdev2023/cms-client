import type { Case } from "../model/coreEntities";
import type { TenantDb } from "../tenancy/tenantDb";
import { CASE_FEE_BILLING_MILESTONE } from "./cases.service.timeline";
import type { CaseBillingSummary } from "./cases.types-billing";

/**
 * 是否存在可用于 COE / 尾款门禁匹配的收费计划行：含 `case_fee`（P0 一次性应收码）
 * 或名称命中尾款关键词（与 `billingGuards` / migration 067 一致）。
 *
 * @param tenantDb - 租户数据库访问对象
 * @param caseId - 案件 ID
 * @returns 至少存在一条匹配记录时为 `true`
 */
export async function queryFinalPaymentMilestoneMatched(
  tenantDb: TenantDb,
  caseId: string,
): Promise<boolean> {
  const result = await tenantDb.query<{ count: string }>(
    `select count(*)::text as count
     from billing_records
     where case_id = $1
       and (
         milestone_name = $2
         or lower(coalesce(milestone_name, '')) like '%尾款%'
         or lower(coalesce(milestone_name, '')) like '%final%'
         or lower(coalesce(milestone_name, '')) like '%結果%'
       )`,
    [caseId, CASE_FEE_BILLING_MILESTONE],
  );
  const raw = result.rows.at(0)?.count;
  return Number(raw ?? "0") > 0;
}

/**
 * 由案件实体与里程碑匹配标志构造详情聚合用 billing 简版。
 *
 * @param caseEntity - 案件实体（含计费缓存列）
 * @param finalPaymentMilestoneMatched - 是否已配置尾款类 billing 节点
 * @returns `CaseBillingSummary` DTO
 */
export function deriveBillingSummary(
  caseEntity: Case,
  finalPaymentMilestoneMatched: boolean,
): CaseBillingSummary {
  return {
    quotePrice: caseEntity.quotePrice,
    depositPaid: caseEntity.depositPaidCached,
    finalPaymentPaid: caseEntity.finalPaymentPaidCached,
    finalPaymentMilestoneMatched,
    unpaidAmount: caseEntity.billingUnpaidAmountCached,
    billingRiskAcknowledged: caseEntity.billingRiskAcknowledgedBy !== null,
    billingRiskAcknowledgedAt: caseEntity.billingRiskAcknowledgedAt ?? null,
    billingRiskAckReasonCode: caseEntity.billingRiskAckReasonCode ?? null,
  };
}
