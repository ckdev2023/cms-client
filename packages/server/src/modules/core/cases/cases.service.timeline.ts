/* eslint-disable jsdoc/require-param-description, jsdoc/require-description */
/**
 * 案件相关的 timeline 与 cross-group / 初始 billing plan 写入辅助。
 *
 * 拆分自 `cases.service.ts`：
 * - 通用 timeline 写入（事务内）
 * - BUG-181 / BUG-186：建案时根据 quotePrice 自动插入 case_fee billing record
 * - 跨组建案的留痕
 */
import type { Case } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import type { TenantDbTx } from "../tenancy/tenantDb";
import { syncBillingCacheForCase } from "../billing/billingGuards";
import {
  OVERSEAS_STEP_CODES,
  OVERSEAS_TIMELINE_ACTIONS,
  VISA_REJECTED_CLOSURE,
} from "./cases.types-overseas-step";
import { isOverseasStepCode } from "./cases.service.phase-effects";

/**
 *
 */
export type TimelineInput = {
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
};

/** 事务内写入 Timeline 记录。
 * @param ctx
 * @param input
 * @param tx 事务连接 @param ctx 请求上下文 @param input timeline 内容 */
export async function writeTimelineInTx(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: TimelineInput,
): Promise<void> {
  await tx.query(
    `insert into timeline_logs(org_id,entity_type,entity_id,action,actor_user_id,payload) values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      ctx.orgId,
      input.entityType,
      input.entityId,
      input.action,
      ctx.userId,
      JSON.stringify(input.payload),
    ],
  );
}

/**
 * BUG-181 修复：建案时若提供了 quotePrice，但当前 case 还没有任何
 * billing_records 行，则同步插入一行案件费用 plan，避免 admin Billing tab
 * 出现 `Total fees —` / `Outstanding ¥0` 与 `cases.quote_price` 强不一致。
 *
 * 幂等：若 case 已经存在任意 billing_records 行（例如 BMV signing_deposit
 * 已先行写入），跳过插入；调用方仍可在后续手动追加 deposit/final 拆分。
 *
 * BUG-186 修复：`milestone_name` 不再写入本地化文案（`案件報酬`），改为写入
 * 稳定的 i18n code `case_fee`。admin 渲染侧基于 code 走 `billing.milestone.case_fee`
 * 字典完成 en/zh/ja 三语本地化；存量数据由 migration 041 回填 case_fee。
 * 该 code 也刻意避开 deposit / final 关键词，不会触发
 * `billingGuards.isDepositMilestone` / `isFinalPaymentMilestone`。
 *
 * @param tx 事务连接
 * @param ctx 请求上下文
 * @param caseId 新建案件 ID
 * @param quotePrice 报价金额（null/undefined/<=0 时跳过）
 */
const INITIAL_QUOTE_BILLING_MILESTONE = "case_fee";

/**
 *
 * @param tx
 * @param ctx
 * @param caseId
 * @param quotePrice
 */
export async function insertInitialBillingPlanFromQuote(
  tx: TenantDbTx,
  ctx: RequestContext,
  caseId: string,
  quotePrice: number | null | undefined,
): Promise<void> {
  if (
    quotePrice === null ||
    quotePrice === undefined ||
    !Number.isFinite(quotePrice) ||
    quotePrice <= 0
  ) {
    return;
  }

  const existing = await tx.query<{ id: string }>(
    `select id from billing_records where case_id = $1 limit 1`,
    [caseId],
  );
  if (existing.rows.length > 0) return;

  const result = await tx.query<{ id: string }>(
    `insert into billing_records
       (org_id, case_id, milestone_name, amount_due, status, gate_effect_mode)
     values ($1, $2, $3, $4, 'due', 'warn')
     returning id`,
    [ctx.orgId, caseId, INITIAL_QUOTE_BILLING_MILESTONE, quotePrice],
  );
  const billingPlanId = result.rows.at(0)?.id;
  if (!billingPlanId) return;

  await writeTimelineInTx(tx, ctx, {
    entityType: "billing_plan",
    entityId: billingPlanId,
    action: "billing_plan.created",
    payload: {
      caseId,
      milestoneName: INITIAL_QUOTE_BILLING_MILESTONE,
      amountDue: quotePrice,
      source: "case_create_quote_price",
    },
  });

  await syncBillingCacheForCase(tx, caseId);
}

/**
 *
 * @param tx
 * @param ctx
 * @param caseId
 * @param customerGroupId
 * @param assignedGroupId
 * @param reason
 */
export async function writeCrossGroupTimeline(
  tx: TenantDbTx,
  ctx: RequestContext,
  caseId: string,
  customerGroupId: string | null,
  assignedGroupId: string | null,
  reason: string | null | undefined,
): Promise<void> {
  await writeTimelineInTx(tx, ctx, {
    entityType: "case",
    entityId: caseId,
    action: "case.cross_group_created",
    payload: {
      customerGroupId,
      assignedGroupId,
      reason: reason?.trim() ?? "",
    },
  });
}

/**
 * 海外返签步骤流转后的额外时间线写入。
 *
 * - ENTRY_SUCCESS → case.overseas_entry_confirmed
 * - VISA_REJECTED → case.overseas_visa_rejected
 * @param tx
 * @param ctx
 * @param updated
 * @param toStepCode
 */
export async function writeOverseasStepTimeline(
  tx: TenantDbTx,
  ctx: RequestContext,
  updated: Case,
  toStepCode: string,
): Promise<void> {
  if (!isOverseasStepCode(toStepCode)) return;

  if (toStepCode === OVERSEAS_STEP_CODES.ENTRY_SUCCESS) {
    await writeTimelineInTx(tx, ctx, {
      entityType: "case",
      entityId: updated.id,
      action: OVERSEAS_TIMELINE_ACTIONS.ENTRY_CONFIRMED,
      payload: { entryConfirmedAt: updated.entryConfirmedAt },
    });
  }

  if (toStepCode === OVERSEAS_STEP_CODES.VISA_REJECTED) {
    await writeTimelineInTx(tx, ctx, {
      entityType: "case",
      entityId: updated.id,
      action: OVERSEAS_TIMELINE_ACTIONS.VISA_REJECTED_CLOSURE,
      payload: {
        stepCode: VISA_REJECTED_CLOSURE.terminalStepCode,
        resultOutcome: updated.resultOutcome,
        closeReason: updated.closeReason,
        targetParentStage: VISA_REJECTED_CLOSURE.targetParentStage,
        autoTransitionToS9: VISA_REJECTED_CLOSURE.autoTransitionToS9,
      },
    });
  }
}
