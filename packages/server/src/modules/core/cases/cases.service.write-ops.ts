/* eslint-disable max-lines, jsdoc/require-param-description, jsdoc/require-returns */
/**
 * 案件写入路径上的 DB 执行函数。
 *
 * 拆分自 `cases.service.ts`：所有仅依赖事务连接 + ctx 的纯 SQL 写入操作。
 * - `insertCase` / `insertCaseWithAutoNumber` / `generateCaseNo`
 * - `executeUpdateCase`
 * - `insertDocumentItems`
 * - `insertInitialTasks`
 *
 * 复杂业务编排仍由 `CasesService` 持有，这里只承担「写一行 → 返回」职责。
 */
import { BadRequestException } from "@nestjs/common";

import type { Case } from "../model/coreEntities";
import type { CaseBillingRiskAckInput, CaseCreateInput } from "./cases.types";
import type { RequestContext } from "../tenancy/requestContext";
import type { TenantDbTx } from "../tenancy/tenantDb";
import type { OverseasStepEffects } from "./cases.service.phase-effects";

import { CASE_COLS, PHASE_TO_STAGE_SQL } from "./cases.service.sql";
import { type CaseQueryRow, mapCaseRow } from "./cases.service.row-mappers";
import {
  buildInsertCaseParams,
  formatCaseNo,
  formatCaseYearMonth,
  isCaseNoConflict,
  resolveCasePrefix,
  resolveCaseUpdateFields,
} from "./cases.service.write-helpers";
import { writeTimelineInTx } from "./cases.service.timeline";
import type { PhaseTransitionSideEffects } from "./cases.service.phase-effects";
import { recalcSupplementCount } from "./casesSupplementCount";

/** checklist 项目（来自模板解析）。 */
export type ChecklistItem = {
  code: string;
  name: string;
  ownerSide?: string;
  category?: string | null;
  requiredFlag?: boolean;
  providedByRole?: string | null;
};

/**
 * 插入 Case 主表行。
 * @param tx
 * @param ctx
 * @param input
 */
export async function insertCase(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: CaseCreateInput,
): Promise<Case> {
  const params = buildInsertCaseParams(ctx.orgId, input);
  const result = await tx.query<CaseQueryRow>(
    `insert into cases (org_id, customer_id, case_type_code, status, stage, group_id, owner_user_id, due_at, metadata,
      case_no, case_name, case_subtype, application_type, company_id, priority, risk_level,
      assistant_user_id, source_channel, signed_at, accepted_at, submission_date, result_date, residence_expiry_date,
      result_outcome, quote_price, visa_plan, business_phase)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27) returning ${CASE_COLS}`,
    params,
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to create case");
  return mapCaseRow(row);
}

/**
 * 自动编号建案：碰到 case_no 唯一冲突时重试一次再放弃。
 * @param tx
 * @param ctx
 * @param input
 */
export async function insertCaseWithAutoNumber(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: CaseCreateInput,
): Promise<Case> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const caseNo = await generateCaseNo(tx, ctx.orgId);
    try {
      return await insertCase(tx, ctx, { ...input, caseNo });
    } catch (error) {
      if (attempt === 0 && isCaseNoConflict(error)) continue;
      throw error;
    }
  }
  throw new BadRequestException("Failed to create case");
}

async function generateCaseNo(tx: TenantDbTx, orgId: string): Promise<string> {
  const settingsResult = await tx.query<{ settings: unknown }>(
    `select settings from organizations where id = $1 limit 1`,
    [orgId],
  );
  const now = new Date();
  const prefix = resolveCasePrefix(settingsResult.rows[0]?.settings);
  const period = `${prefix}-${formatCaseYearMonth(now)}-%`;
  const countResult = await tx.query<{ count: string }>(
    `select count(*) as count from cases where org_id = $1 and case_no like $2`,
    [orgId, period],
  );
  const seq = parseInt(countResult.rows[0]?.count ?? "0", 10) + 1;
  return formatCaseNo(prefix, now, seq);
}

/**
 * 执行 Case 更新 SQL 并返回更新后的 Case。
 * @param tx
 * @param id
 * @param f
 */
export async function executeUpdateCase(
  tx: TenantDbTx,
  id: string,
  f: ReturnType<typeof resolveCaseUpdateFields>,
): Promise<Case> {
  const result = await tx.query<CaseQueryRow>(
    `update cases
     set case_type_code = $2, owner_user_id = $3, group_id = $4, due_at = $5,
         metadata = $6::jsonb, case_no = $7, case_name = $8, case_subtype = $9,
         application_type = $10, company_id = $11, priority = $12,
         risk_level = $13, assistant_user_id = $14, source_channel = $15,
         signed_at = $16, accepted_at = $17, submission_date = $18,
         result_date = $19, residence_expiry_date = $20, archived_at = $21,
         result_outcome = $22, quote_price = $23, visa_plan = $24,
         overseas_visa_start_at = $25, entry_confirmed_at = $26,
         updated_at = now()
     where id = $1 and coalesce(metadata->>'_status', '') is distinct from 'deleted'
     returning ${CASE_COLS}`,
    [
      id,
      f.caseTypeCode,
      f.ownerUserId,
      f.groupId,
      f.dueAt,
      JSON.stringify(f.metadata),
      f.caseNo,
      f.caseName,
      f.caseSubtype,
      f.applicationType,
      f.companyId,
      f.priority,
      f.riskLevel,
      f.assistantUserId,
      f.sourceChannel,
      f.signedAt,
      f.acceptedAt,
      f.submissionDate,
      f.resultDate,
      f.residenceExpiryDate,
      f.archivedAt,
      f.resultOutcome,
      f.quotePrice,
      f.visaPlan,
      f.overseasVisaStartAt,
      f.entryConfirmedAt,
    ],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update case");
  return mapCaseRow(row);
}

/**
 * 批量插入 document_items。
 * @param tx
 * @param orgId
 * @param caseId
 * @param items
 */
export async function insertDocumentItems(
  tx: TenantDbTx,
  orgId: string,
  caseId: string,
  items: ChecklistItem[],
): Promise<void> {
  for (const item of items) {
    await tx.query(
      `insert into document_items (org_id, case_id, checklist_item_code, name, status, owner_side, category, required_flag, provided_by_role)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        orgId,
        caseId,
        item.code,
        item.name,
        "pending",
        item.ownerSide ?? "applicant",
        item.category ?? null,
        item.requiredFlag ?? false,
        item.providedByRole ?? null,
      ],
    );
  }
}

const INITIAL_TASK_SEEDS: {
  title: string;
  taskType: string;
  priority: string;
}[] = [
  {
    title: "顧客に基礎資料のアップロードを依頼",
    taskType: "document_follow_up",
    priority: "normal",
  },
  {
    title: "顧客との初回面談を確認",
    taskType: "client_contact",
    priority: "normal",
  },
];

/**
 * businessPhase 维度推进的核心 UPDATE 语句执行 + supplement 计次重算。
 * @param tx
 * @param id
 * @param fromPhase
 * @param toPhase
 * @param effects
 */
export async function executePhaseTransitionUpdate(
  tx: TenantDbTx,
  id: string,
  fromPhase: string,
  toPhase: string,
  effects: PhaseTransitionSideEffects,
): Promise<Case> {
  const result = await tx.query<CaseQueryRow>(
    `update cases
       set business_phase = $2,
           stage = ${PHASE_TO_STAGE_SQL},
           status = ${PHASE_TO_STAGE_SQL},
           close_reason = case when $2 = 'CLOSED_FAILED' then $7 else close_reason end,
           result_outcome = case
             when $2 = 'CLOSED_SUCCESS' then 'success'
             when $2 = 'CLOSED_FAILED' then coalesce($8, 'failure')
             else result_outcome
           end,
           archived_at = case when $2 in ('CLOSED_SUCCESS','CLOSED_FAILED') then coalesce(archived_at, now()) else archived_at end,
           coe_sent_at = case when $4::boolean then now() else coe_sent_at end,
           overseas_visa_start_at = case when $5::boolean then now() else overseas_visa_start_at end,
           entry_confirmed_at = case when $6::boolean then now() else entry_confirmed_at end,
           updated_at = now()
       where id = $1 and business_phase = $3
         and coalesce(metadata->>'_status','') is distinct from 'deleted'
       returning ${CASE_COLS}`,
    [
      id,
      toPhase,
      fromPhase,
      effects.stamps.stampCoeSent,
      effects.stamps.stampOverseasVisa,
      effects.stamps.stampEntryConfirmed,
      effects.closeReason,
      effects.resultOutcome,
    ],
  );
  const row = result.rows.at(0);
  if (!row) {
    throw new BadRequestException(
      `Phase transition conflict: case phase has already changed from '${fromPhase}'`,
    );
  }
  let caseEntity = mapCaseRow(row);

  if (effects.incrementSupplement) {
    const newCount = await recalcSupplementCount(tx, id);
    caseEntity = { ...caseEntity, supplementCount: newCount };
  }

  return caseEntity;
}

/**
 * BUG-195: 建案时自动插入初始任务，确保负责人在首页待办能看到跟进提示。
 * @param tx
 * @param ctx
 * @param created
 */
export async function insertInitialTasks(
  tx: TenantDbTx,
  ctx: RequestContext,
  created: Case,
): Promise<void> {
  for (const seed of INITIAL_TASK_SEEDS) {
    const result = await tx.query<{ id: string }>(
      `insert into tasks
         (org_id, case_id, title, task_type, assignee_user_id, priority, status, source_type, source_id)
       values ($1, $2, $3, $4, $5, $6, 'pending', 'auto_create', $7)
       returning id`,
      [
        ctx.orgId,
        created.id,
        seed.title,
        seed.taskType,
        created.ownerUserId,
        seed.priority,
        created.id,
      ],
    );
    const taskId = result.rows.at(0)?.id;
    if (taskId) {
      await writeTimelineInTx(tx, ctx, {
        entityType: "task",
        entityId: taskId,
        action: "task.created",
        payload: {
          caseId: created.id,
          title: seed.title,
          status: "pending",
          source: "case_create_initial",
        },
      });
    }
  }
}

/**
 * 软删除：在 metadata 中标记 `_status=deleted`。
 * @param tx
 * @param id
 * @param nextMetadata
 */
export async function executeSoftDeleteCase(
  tx: TenantDbTx,
  id: string,
  nextMetadata: Record<string, unknown>,
): Promise<void> {
  const result = await tx.query<CaseQueryRow>(
    `
      update cases
      set metadata = $2::jsonb, updated_at = now()
      where id = $1
      returning ${CASE_COLS}
    `,
    [id, JSON.stringify(nextMetadata)],
  );

  if (!result.rowCount || result.rowCount === 0)
    throw new BadRequestException("Failed to soft delete case");
}

/**
 * 写入欠款风险确认字段。
 * @param tx
 * @param id
 * @param userId
 * @param input
 */
export async function executeBillingRiskAck(
  tx: TenantDbTx,
  id: string,
  userId: string,
  input: CaseBillingRiskAckInput,
): Promise<Case> {
  const result = await tx.query<CaseQueryRow>(
    `update cases
     set billing_risk_acknowledged_by = $2,
         billing_risk_acknowledged_at = now(),
         billing_risk_ack_reason_code = $3,
         billing_risk_ack_reason_note = $4,
         billing_risk_ack_evidence_url = $5,
         updated_at = now()
     where id = $1
       and coalesce(metadata->>'_status', '') is distinct from 'deleted'
     returning ${CASE_COLS}`,
    [
      id,
      userId,
      input.reasonCode,
      input.reasonNote ?? null,
      input.evidenceUrl ?? null,
    ],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to acknowledge billing risk");
  return mapCaseRow(row);
}

/**
 * 更新下签后子阶段并按需打 stamping。
 * @param tx
 * @param id
 * @param stage
 * @param nextMetadata
 * @param stampVisa
 * @param stampEntry
 */
export async function executePostApprovalStageUpdate(
  tx: TenantDbTx,
  id: string,
  stage: string,
  nextMetadata: Record<string, unknown>,
  stampVisa: boolean,
  stampEntry: boolean,
): Promise<Case> {
  const result = await tx.query<CaseQueryRow>(
    `update cases
     set metadata = $2::jsonb,
         post_approval_stage = $3,
         overseas_visa_start_at = case when $4::boolean then now()
           else overseas_visa_start_at end,
         entry_confirmed_at = case when $5::boolean then now()
           else entry_confirmed_at end,
         updated_at = now()
     where id = $1
       and coalesce(metadata->>'_status', '') is distinct from 'deleted'
     returning ${CASE_COLS}`,
    [id, JSON.stringify(nextMetadata), stage, stampVisa, stampEntry],
  );
  const row = result.rows.at(0);
  if (!row)
    throw new BadRequestException("Failed to update post-approval stage");
  return mapCaseRow(row);
}

/**
 * 工作流步骤推进 + 海外返签自动 stamping / 结果态收敛。
 * @param tx
 * @param id
 * @param toStepCode
 * @param overseas
 */
export async function executeWorkflowStepTransition(
  tx: TenantDbTx,
  id: string,
  toStepCode: string,
  overseas: OverseasStepEffects,
): Promise<Case> {
  const result = await tx.query<CaseQueryRow>(
    `update cases
     set current_workflow_step_code = $2,
         coe_sent_at = case when $3::boolean then now() else coe_sent_at end,
         overseas_visa_start_at = case when $4::boolean then now() else overseas_visa_start_at end,
         entry_confirmed_at = case when $5::boolean then now() else entry_confirmed_at end,
         result_outcome = coalesce($6, result_outcome),
         updated_at = now()
     where id = $1
       and coalesce(metadata->>'_status', '') is distinct from 'deleted'
     returning ${CASE_COLS}`,
    [
      id,
      toStepCode,
      overseas.stampCoeSent,
      overseas.stampOverseasVisa,
      overseas.stampEntryConfirmed,
      overseas.resultOutcome,
    ],
  );
  const row = result.rows.at(0);
  if (!row) throw new BadRequestException("Failed to update workflow step");
  return mapCaseRow(row);
}

/**
 * Stage 维度推进 UPDATE（乐观锁基于 stage/status）。
 * @param tx
 * @param id
 * @param fromStage
 * @param toStage
 * @param closeReason
 * @param newPhase
 */
export async function executeStageTransition(
  tx: TenantDbTx,
  id: string,
  fromStage: string,
  toStage: string,
  closeReason: string | null,
  newPhase: string,
): Promise<Case> {
  const result = await tx.query<CaseQueryRow>(
    `update cases set stage = $2, status = $2,
       close_reason = coalesce($4, close_reason),
       business_phase = $5,
       archived_at = case when $2 = 'S9' then coalesce(archived_at, now()) else archived_at end,
       updated_at = now()
     where id = $1 and coalesce(stage, status) = $3
       and coalesce(metadata->>'_status','') is distinct from 'deleted'
     returning ${CASE_COLS}`,
    [id, toStage, fromStage, closeReason, newPhase],
  );
  const row = result.rows.at(0);
  if (!row) {
    throw new BadRequestException(
      `Transition conflict: case stage has already changed from '${fromStage}'`,
    );
  }
  return mapCaseRow(row);
}

/**
 * 写入案件 stage history。
 * @param tx
 * @param orgId
 * @param caseId
 * @param fromStage
 * @param toStage
 * @param changedBy
 */
export async function insertStageHistory(
  tx: TenantDbTx,
  orgId: string,
  caseId: string,
  fromStage: string,
  toStage: string,
  changedBy: string,
): Promise<void> {
  await tx.query(
    `insert into case_stage_history(org_id, case_id, from_stage, to_stage, changed_by)
     values ($1, $2, $3, $4, $5)`,
    [orgId, caseId, fromStage, toStage, changedBy],
  );
}
