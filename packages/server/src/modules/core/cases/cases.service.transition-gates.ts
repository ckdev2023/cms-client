/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns */
/**
 * S1–S9 阶段流转的 gate 校验集合。
 *
 * 拆分自 `cases.service.ts`：
 * - `validateStageTransition` — 模板/默认矩阵双路径合法性 + gate 触发
 * - 各个 gate 子函数（S3→S4 / S4→S5 / S5→S6 / Gate-C / S8→S9 closeout）
 * - ValidationRun 最新值校验 / 过期判定
 * - 复核启用判定（`isReviewRequired`）
 *
 * 通过显式传入 `pool` 与 `templatesResolver`，避免与 `CasesService` 强耦合。
 */
import { BadRequestException } from "@nestjs/common";
import { Pool } from "pg";

import type { Case } from "../model/coreEntities";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import type { RequestContext } from "../tenancy/requestContext";
import { type TenantDb, createTenantDb } from "../tenancy/tenantDb";
import {
  requiresSuccessCloseoutCheck,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
import { canBypassSuccessCloseoutForFailure } from "./cases.types-failure-closeout";
import { queryCurrentResidencePeriod } from "./cases.service.detail-queries";
import { DEFAULT_CASE_TRANSITIONS } from "./cases.service.write-helpers";
import type { TemplatesResolver } from "./cases.service.types-internal";

/**
 * 校验最新 ValidationRun=passed 且 non-stale，以及复核（如启用）。
 * S5→S6 和 Gate-C 共用此逻辑。
 * @param pool
 * @param templatesResolver
 * @param ctx
 * @param c
 * @param fromLabel
 * @param toLabel
 */
async function assertLatestValidationRunPassed(
  pool: Pool,
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
  fromLabel: string,
  toLabel: string,
): Promise<void> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const label = `${fromLabel}→${toLabel}`;
  const latestVR = await getLatestValidationRun(tenantDb, ctx.orgId, c.id);
  if (!latestVR) {
    throw new BadRequestException(`${label} requires a passed validation run`);
  }
  if (latestVR.result_status !== "passed") {
    throw new BadRequestException(
      `${label} requires the latest validation run to be passed`,
    );
  }

  const stale = await isValidationRunStale(
    tenantDb,
    ctx.orgId,
    c.id,
    latestVR.executed_at,
  );
  if (stale) {
    throw new BadRequestException(
      `${label} blocked: validation run is stale because relevant data changed after validation`,
    );
  }

  if (!(await isReviewRequired(templatesResolver, ctx, c))) return;

  const latestReview = await getLatestReviewRecord(
    tenantDb,
    ctx.orgId,
    c.id,
    latestVR.id,
  );
  if (latestReview?.decision !== "approved") {
    throw new BadRequestException(
      `${label} requires an approved review record when review_required_flag is enabled`,
    );
  }
}

async function getLatestValidationRun(
  tenantDb: TenantDb,
  orgId: string,
  caseId: string,
): Promise<
  { id: string; result_status: string; executed_at: unknown } | undefined
> {
  const result = await tenantDb.query<{
    id: string;
    result_status: string;
    executed_at: unknown;
  }>(
    `
      select id, result_status, executed_at
      from validation_runs
      where org_id = $1 and case_id = $2
      order by executed_at desc nulls last, created_at desc, id desc
      limit 1
    `,
    [orgId, caseId],
  );

  return result.rows.at(0);
}

async function getLatestReviewRecord(
  tenantDb: TenantDb,
  orgId: string,
  caseId: string,
  validationRunId: string,
): Promise<{ id: string; decision: string } | undefined> {
  const result = await tenantDb.query<{ id: string; decision: string }>(
    `
      select id, decision
      from review_records
      where org_id = $1
        and case_id = $2
        and validation_run_id = $3
      order by reviewed_at desc nulls last, created_at desc, id desc
      limit 1
    `,
    [orgId, caseId, validationRunId],
  );

  return result.rows.at(0);
}

/**
 * 判断最新 ValidationRun 是否已过期（stale）。
 *
 * 失效条件（对齐 P0 权威基线 §2.5）：
 * 1. 任一必交资料项在 VR 执行后 updated
 * 2. 任一 CaseParty 在 VR 执行后 updated
 * @param tenantDb
 * @param orgId
 * @param caseId
 * @param validationExecutedAt
 */
async function isValidationRunStale(
  tenantDb: TenantDb,
  orgId: string,
  caseId: string,
  validationExecutedAt: unknown,
): Promise<boolean> {
  const result = await tenantDb.query<{ stale: boolean }>(
    `select (
       exists (
         select 1 from document_items
         where org_id = $1 and case_id = $2
           and status != 'deleted' and required_flag = true
           and updated_at > $3::timestamptz
       ) or exists (
         select 1 from case_parties
         where org_id = $1 and case_id = $2
           and updated_at > $3::timestamptz
       )
     ) as stale`,
    [orgId, caseId, validationExecutedAt],
  );
  return result.rows.at(0)?.stale ?? false;
}

async function isReviewRequired(
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
): Promise<boolean> {
  const resolved = await templatesResolver.resolve(ctx, {
    kind: "case_type",
    key: c.caseTypeCode,
    entityId: c.id,
  });
  return (
    resolved.mode === "template" &&
    resolved.used &&
    resolved.config.review_required_flag === true
  );
}

async function assertBillingRecordExists(
  pool: Pool,
  ctx: RequestContext,
  c: Case,
): Promise<void> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const result = await tenantDb.query<{ id: string }>(
    `select id from billing_records
     where case_id = $1 limit 1`,
    [c.id],
  );
  if (!result.rows.at(0)) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.STAGE_BILLING_RECORD_REQUIRED +
        ": At least one billing record is required before advancing to S5/S6/S7",
    );
  }
}

async function validateReadyForDocumentPreparation(
  pool: Pool,
  ctx: RequestContext,
  c: Case,
): Promise<void> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const primaryPartyResult = await tenantDb.query<{ id: string }>(
    `
      select id
      from case_parties
      where org_id = $1
        and case_id = $2
        and is_primary = true
      limit 1
    `,
    [ctx.orgId, c.id],
  );

  if (!primaryPartyResult.rows.at(0)) {
    throw new BadRequestException(
      "S3→S4 requires a primary case party before moving to S4",
    );
  }
}

/**
 * Gate-B（S4→S5）：校验必交资料项齐备。
 * ValidationRun / ReviewRecord 的校验职责已移至 S5→S6。
 * @param pool
 * @param ctx
 * @param c
 */
async function validateReadyForInternalReview(
  pool: Pool,
  ctx: RequestContext,
  c: Case,
): Promise<void> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const incompleteRequiredItemResult = await tenantDb.query<{ id: string }>(
    `
      select id
      from document_items
      where org_id = $1
        and case_id = $2
        and status != 'deleted'
        and required_flag = true
        and status not in ('approved', 'waived')
      limit 1
    `,
    [ctx.orgId, c.id],
  );

  if (incompleteRequiredItemResult.rows.at(0)) {
    throw new BadRequestException(
      "S4→S5 requires all required document items to be approved or waived",
    );
  }
}

/**
 * S5→S6：最新 ValidationRun 必须 passed 且未过期（non-stale），
 * 若模板启用复核则还需 ReviewRecord=approved。
 * @param pool
 * @param templatesResolver
 * @param ctx
 * @param c
 */
async function validateReadyForSubmission(
  pool: Pool,
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
): Promise<void> {
  await assertLatestValidationRunPassed(
    pool,
    templatesResolver,
    ctx,
    c,
    "S5",
    "S6",
  );
}

/**
 * Gate-C（S6→S7）：生成 SubmissionPackage 前校验。
 * - 最新 ValidationRun 必须 passed 且 non-stale
 * - 模板启用复核时 ReviewRecord=approved
 * - 存在欠款余额时必须已完成风险确认
 * @param pool
 * @param templatesResolver
 * @param ctx
 * @param c
 */
async function validateGateC(
  pool: Pool,
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
): Promise<void> {
  await assertLatestValidationRunPassed(
    pool,
    templatesResolver,
    ctx,
    c,
    "S6",
    "S7",
  );

  if (c.billingUnpaidAmountCached > 0 && !c.billingRiskAcknowledgedAt) {
    throw new BadRequestException(
      "S6→S7 requires billing risk acknowledgment before formal submission when there is unpaid balance",
    );
  }
}

/**
 * S8→S9 結案前置条件 — BMV 案件で failure path bypass 後、成功結案を検証。
 *
 * 失敗結案パス（VISA_REJECTED ステップ / resultOutcome ∈ failure set / closeReason 明示）
 * は canBypassSuccessCloseoutForFailure() により成功結案前置条件をバイパス。
 *
 * 成功結案必须满足三項：入境確認、在留期間録入、续签提醒生成。
 * @param pool
 * @param ctx
 * @param c
 * @param closeReason
 */
async function validateSuccessCloseout(
  pool: Pool,
  ctx: RequestContext,
  c: Case,
  closeReason?: string | null,
): Promise<void> {
  if (!requiresSuccessCloseoutCheck(c)) return;

  if (canBypassSuccessCloseoutForFailure(c, closeReason)) return;

  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);
  const currentResidencePeriod = await queryCurrentResidencePeriod(
    tenantDb,
    c.id,
  );

  const check = checkSuccessCloseoutPreconditions({
    caseEntity: c,
    currentResidencePeriod,
  });

  if (!check.allSatisfied) {
    const unsatisfied = check.preconditions
      .filter((p) => !p.satisfied)
      .map((p) => `${p.code}(${p.label})`);
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED +
        `: S8→S9 success closeout blocked: ${unsatisfied.join(", ")}`,
    );
  }
}

async function dispatchGateCheck(
  pool: Pool,
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
  from: string,
  to: string,
  closeReason?: string | null,
): Promise<void> {
  if (from === "S3" && to === "S4") {
    await validateReadyForDocumentPreparation(pool, ctx, c);
    return;
  }

  if (from === "S4" && to === "S5") {
    await validateReadyForInternalReview(pool, ctx, c);
    return;
  }

  if (from === "S5" && to === "S6") {
    await validateReadyForSubmission(pool, templatesResolver, ctx, c);
    return;
  }

  if (from === "S6" && to === "S7") {
    await validateGateC(pool, templatesResolver, ctx, c);
    return;
  }

  if (from === "S8" && to === "S9") {
    await validateSuccessCloseout(pool, ctx, c, closeReason);
    return;
  }
}

async function validateTransitionGate(
  pool: Pool,
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
  from: string,
  to: string,
  closeReason?: string | null,
): Promise<void> {
  if (to === "S5" || to === "S6" || to === "S7") {
    await assertBillingRecordExists(pool, ctx, c);
  }

  await dispatchGateCheck(
    pool,
    templatesResolver,
    ctx,
    c,
    from,
    to,
    closeReason,
  );
}

/**
 * 校验 state_flow 模板允许的状态变更，并触发对应 gate 检查。
 * @param pool
 * @param templatesResolver
 * @param ctx
 * @param c
 * @param from
 * @param to
 * @param closeReason
 */
export async function validateStageTransition(
  pool: Pool,
  templatesResolver: TemplatesResolver,
  ctx: RequestContext,
  c: Case,
  from: string,
  to: string,
  closeReason?: string | null,
): Promise<void> {
  const resolved = await templatesResolver.resolve(ctx, {
    kind: "state_flow",
    key: c.caseTypeCode,
    entityId: c.id,
  });

  if (resolved.mode === "template" && resolved.used) {
    const ts = Array.isArray(resolved.config.allowedTransitions)
      ? (resolved.config.allowedTransitions as { from: string; to: string }[])
      : [];
    if (!ts.some((t) => t.from === from && t.to === to)) {
      throw new BadRequestException(
        `Transition from '${from}' to '${to}' is not allowed`,
      );
    }
    await validateTransitionGate(
      pool,
      templatesResolver,
      ctx,
      c,
      from,
      to,
      closeReason,
    );
    return;
  }

  const allowed = DEFAULT_CASE_TRANSITIONS[from] as string[] | undefined;
  if (!allowed?.includes(to)) {
    throw new BadRequestException(
      `Transition from '${from}' to '${to}' is not allowed`,
    );
  }

  await validateTransitionGate(
    pool,
    templatesResolver,
    ctx,
    c,
    from,
    to,
    closeReason,
  );
}
