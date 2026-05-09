/* eslint-disable max-lines, jsdoc/require-param-description, jsdoc/require-param, jsdoc/require-returns, jsdoc/require-description */
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Case } from "../model/coreEntities";
import type {
  CaseCreateInput,
  CaseUpdateInput,
  CaseTransitionInput,
  CaseBillingRiskAckInput,
  PostApprovalStageInput,
  CaseListInput,
  CaseListResultDto,
  CaseDetailAggregateDto,
  WorkflowStepTransitionInput,
  PhaseTransitionInput,
} from "./cases.types";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import { resolveWorkflowStepSummary } from "./cases.workflow-step-readmodel";
import {
  requiresSuccessCloseoutCheck,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
import { checkFailureCloseout } from "./cases.types-failure-closeout";
import { PermissionsService } from "../auth/permissions.service";
import { BillingPlansService } from "../billing/billingPlans.service";
import { PaymentRecordsService } from "../billing/paymentRecords.service";
import type { CaseBillingTabAggregate } from "./cases.types-billing";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { recalcSupplementCount } from "./casesSupplementCount";
import { FeatureFlagsService } from "../../feature-flags/featureFlags.service";
import { requiresBmvCaseCreationGate } from "../../portal/intake/intake.types";

import {
  CASE_COLS,
  CASE_COLS_PREFIXED,
  SUMMARY_EXTRA_COLS,
  SUMMARY_JOINS,
} from "./cases.service.sql";
import {
  CASE_RESULT_OUTCOMES,
  DEFAULT_CASE_TRANSITIONS,
  P0_CASE_STAGES,
  POST_APPROVAL_STAGES,
  assertCloseReasonForNonCompletionArchive,
  assertNotArchived,
  buildTransitionPayload,
  resolveCaseUpdateFields,
  resolveRequestedTransitionStage,
  resolveTransitionBusinessPhase,
  validateCaseEnums,
  validateDueAt,
  wrapCreateError,
} from "./cases.service.write-helpers";
import {
  buildCaseListFilter,
  buildCaseListFilterPrefixed,
} from "./cases.service.list-filter";
import {
  type CaseListSummaryRow,
  type CaseQueryRow,
  mapCaseListSummaryRow,
  mapCaseRow,
  mapDetailCountsRow,
  mapDocProgressByProviderRows,
  mapLatestReviewRow,
  mapLatestSubmissionRow,
  mapLatestValidationRow,
} from "./cases.service.row-mappers";
import {
  aggregateCaseBillingSummaryFull,
  assertClosedSuccessGate,
  deriveBillingSummary,
  deriveDeepLink,
  logSettledErrors,
  queryCurrentResidencePeriod,
  queryDetailCaseRow,
  queryDetailCounts,
  queryDocProgressByProvider,
  queryLatestReview,
  queryLatestSubmission,
  queryLatestValidation,
  settledValueOrDefault,
  settledValueOrUndefined,
} from "./cases.service.detail-queries";
import {
  assertCloseReasonForFailedPhase,
  assertValidPhaseTransitionInput,
  buildPhaseTransitionEffects,
  buildPhaseTransitionTimelinePayload,
  isOverseasStepCode,
  mapPhaseToTerminalStage,
  resolveOverseasStepEffects,
  resolvePhaseStampEffects,
  shouldIncrementSupplementCount,
  validateWorkflowStepTransitionTarget,
} from "./cases.service.phase-effects";
import {
  writeOverseasStepTimeline,
  writeTimelineInTx,
} from "./cases.service.timeline";
import {
  type TemplatesResolver,
  TEMPLATES_RESOLVER,
} from "./cases.service.types-internal";
import { assertBelongsToOrg } from "./cases.service.refs-resolver";
import {
  executeBillingRiskAck,
  executePhaseTransitionUpdate,
  executePostApprovalStageUpdate,
  executeSoftDeleteCase,
  executeStageTransition,
  executeUpdateCase,
  executeWorkflowStepTransition,
  insertStageHistory,
} from "./cases.service.write-ops";
import {
  resolveChecklistItems,
  runCreateCaseTransaction,
} from "./cases.service.create-flow";
import { findActiveCaseTemplateByCaseType } from "./cases.template.repository";
import {
  assertCoeSendBillingGate,
  assertPostApprovalBillingGate,
  assertWaitingPaymentBillingGate,
  assertWorkflowStepBillingGate,
} from "./cases.service.billing-gates";
import { validateStageTransition } from "./cases.service.transition-gates";

// ────────────────────────────────────────────────────────────────
// 公共 API 重新导出（保留对外契约稳定）
// ────────────────────────────────────────────────────────────────

export { CASE_COLS, CASE_COLS_PREFIXED, SUMMARY_JOINS, SUMMARY_EXTRA_COLS };
export {
  CASE_RESULT_OUTCOMES,
  DEFAULT_CASE_TRANSITIONS,
  P0_CASE_STAGES,
  POST_APPROVAL_STAGES,
};
export {
  isOverseasStepCode,
  mapPhaseToTerminalStage,
  resolveOverseasStepEffects,
  resolvePhaseStampEffects,
  shouldIncrementSupplementCount,
};
export {
  mapCaseRow,
  mapCaseListSummaryRow,
  mapDetailCountsRow,
  mapDocProgressByProviderRows,
  mapLatestReviewRow,
  mapLatestSubmissionRow,
  mapLatestValidationRow,
};
export type { CaseQueryRow };
export type {
  CaseCreateInput,
  CaseUpdateInput,
  CaseTransitionInput,
  CaseBillingRiskAckInput,
  PostApprovalStageInput,
  CaseListInput,
  CaseListScope,
  CaseVisibilityFilter,
  PhaseTransitionInput,
} from "./cases.types";

// `TemplatesResolver` 类型与 `TEMPLATES_RESOLVER` 令牌定义在 types-internal，
// 这里仅作 re-export 以保留对外契约。
export { TEMPLATES_RESOLVER };
export type { TemplatesResolver };

/** 案件服务，提供案件 CRUD、状态变更与软删除能力。 */
@Injectable()
export class CasesService {
  /**
   * @param pool 连接池
   * @param templatesResolver 模板解析服务
   * @param permissionsService 权限判定服务
   * @param billingPlansService 收费计划服务
   * @param paymentRecordsService 回款记录服务
   * @param featureFlagsService 功能开关服务（BMV 建案前置校验）
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TEMPLATES_RESOLVER)
    private readonly templatesResolver: TemplatesResolver,
    @Optional()
    @Inject(PermissionsService)
    private readonly permissionsService?: PermissionsService,
    @Optional()
    @Inject(BillingPlansService)
    private readonly billingPlansService?: BillingPlansService,
    @Optional()
    @Inject(PaymentRecordsService)
    private readonly paymentRecordsService?: PaymentRecordsService,
    @Optional()
    @Inject(FeatureFlagsService)
    private readonly featureFlagsService?: FeatureFlagsService,
  ) {}

  /** 创建案件（事务内：写入 + document_items + Timeline + 跨组留痕）。
   * @param input
   * @param ctx 请求上下文 @param input 创建参数 @returns Case 实体 */
  async create(ctx: RequestContext, input: CaseCreateInput): Promise<Case> {
    try {
      validateDueAt(input.dueAt);
      validateCaseEnums(input);
      await this.assertBmvFeatureEnabledIfNeeded(ctx, input.caseTypeCode);
      const caseTemplateResolver = (rCtx: RequestContext, code: string) =>
        findActiveCaseTemplateByCaseType(this.pool, rCtx, code);
      const checklistItems = await resolveChecklistItems(
        this.templatesResolver,
        ctx,
        input.caseTypeCode,
        caseTemplateResolver,
      );
      const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
      return await tenantDb.transaction((tx) =>
        runCreateCaseTransaction(tx, ctx, input, checklistItems),
      );
    } catch (error) {
      wrapCreateError(error, input);
    }
  }

  /** 根据 ID 获取案件详情（过滤已软删除）。
   * @param id
   * @param ctx 请求上下文 @param id 案件 ID @returns Case 或 null */
  async get(ctx: RequestContext, id: string): Promise<Case | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<CaseQueryRow>(
      `
        select ${CASE_COLS}
        from cases
        where id = $1 and coalesce(metadata->>'_status', '') is distinct from 'deleted'
        limit 1
      `,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapCaseRow(row) : null;
  }

  /**
   * 断言当前用户可编辑指定案件，否则抛出异常。
   *
   * 供跨模块（如 BillingCollectionsService）复用；
   * case 不存在时抛 NotFoundException，无权限时抛 ForbiddenException。
   */
  async assertCanEditCase(ctx: RequestContext, caseId: string): Promise<void> {
    if (!this.permissionsService) {
      throw new Error("PermissionsService is required for assertCanEditCase");
    }
    const caseEntity = await this.get(ctx, caseId);
    if (!caseEntity) throw new NotFoundException("Case not found");
    if (
      !this.permissionsService.canEditCase(
        ctx.userId,
        ctx.role,
        ctx.groupId,
        caseEntity,
      )
    ) {
      throw new ForbiddenException("Insufficient permissions to edit case");
    }
  }

  /**
   * 案件 billing tab 一次性聚合：summary + plans + recentPayments。
   *
   * summary 走单 SQL 实时聚合（不依赖缓存列）；
   * plans 与 recentPayments 分别调 BillingPlansService.list / PaymentRecordsService.list。
   * recentPayments 上限 50 条（D8），超出时前端切到分页端点。
   *
   * @param ctx 请求上下文
   * @param caseId 案件 ID
   * @returns CaseBillingTabAggregate
   */
  async getBillingTabAggregate(
    ctx: RequestContext,
    caseId: string,
  ): Promise<CaseBillingTabAggregate> {
    if (!this.billingPlansService || !this.paymentRecordsService) {
      throw new Error(
        "BillingPlansService and PaymentRecordsService are required for getBillingTabAggregate",
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const summary = await aggregateCaseBillingSummaryFull(tenantDb, caseId);

    const [plansResult, paymentsResult] = await Promise.all([
      this.billingPlansService.list(ctx, { caseId, page: 1, limit: 200 }),
      this.paymentRecordsService.list(ctx, {
        caseId,
        recordStatus: "all",
        page: 1,
        limit: 50,
      }),
    ]);

    return {
      summary,
      plans: plansResult.items,
      recentPayments: paymentsResult.items,
      recentPaymentsTotal: paymentsResult.total,
    };
  }

  /** 获取案件列表（支持筛选 + 分页）。
   * @param input
   * @param ctx 请求上下文 @param input 查询参数 @returns 列表和总数 */
  async list(
    ctx: RequestContext,
    input: CaseListInput = {},
  ): Promise<{ items: Case[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildCaseListFilter(input);

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from cases ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit);
    const limitParam = "$" + String(params.length);
    params.push(offset);
    const offsetParam = "$" + String(params.length);

    const result = await tenantDb.query<CaseQueryRow>(
      `
        select ${CASE_COLS}
        from cases
        ${whereClause}
        order by created_at desc, id desc
        limit ${limitParam} offset ${offsetParam}
      `,
      params,
    );

    return { items: result.rows.map(mapCaseRow), total };
  }

  /**
   * 案件列表读模型 — JOIN 客户/分组/用户展示名。
   *
   * 与 `list()` 共享过滤逻辑，但返回 `CaseListResultDto`，
   * admin 列表页应优先消费此方法以避免逐行查询。
   */
  async listSummary(
    ctx: RequestContext,
    input: CaseListInput = {},
  ): Promise<CaseListResultDto> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildCaseListFilterPrefixed(input, "cs.", {
      customerAlias: "cu",
    });

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from cases cs ${SUMMARY_JOINS} ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit);
    const limitParam = "$" + String(params.length);
    params.push(offset);
    const offsetParam = "$" + String(params.length);

    const result = await tenantDb.query<CaseListSummaryRow>(
      `
        select ${CASE_COLS_PREFIXED},
               ${SUMMARY_EXTRA_COLS}
        from cases cs
        ${SUMMARY_JOINS}
        ${whereClause}
        order by cs.created_at desc, cs.id desc
        limit ${limitParam} offset ${offsetParam}
      `,
      params,
    );

    return {
      items: result.rows.map(mapCaseListSummaryRow),
      total,
      page,
      limit,
    };
  }

  /**
   * 案件详情聚合読模型 — 一次性返回 header / overview / counts /
   * billing / validation / submission / review / deep-link 依赖字段。
   *
   * admin detail 页面消费此方法，避免多轮 HTTP 请求拼装。
   * 子查询使用 Promise.allSettled 降级：任一子查询失败仍返回部分数据（BUG-064）。
   */
  // eslint-disable-next-line max-lines-per-function
  async getDetailAggregate(
    ctx: RequestContext,
    id: string,
  ): Promise<CaseDetailAggregateDto | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const caseRow = await queryDetailCaseRow(tenantDb, id);
    if (!caseRow) return null;

    const caseEntity = mapCaseRow(caseRow);
    const needsCloseoutCheck = requiresSuccessCloseoutCheck(caseEntity);

    const settled = await Promise.allSettled([
      queryDetailCounts(tenantDb, id),
      queryLatestValidation(tenantDb, id),
      queryLatestSubmission(tenantDb, id),
      queryLatestReview(tenantDb, id),
      queryDocProgressByProvider(tenantDb, id),
      queryCurrentResidencePeriod(tenantDb, id),
    ]);
    logSettledErrors(settled, id);

    const counts = settledValueOrUndefined(settled[0]);
    const latestValidation = settledValueOrUndefined(settled[1]);
    const latestSubmission = settledValueOrUndefined(settled[2]);
    const latestReview = settledValueOrUndefined(settled[3]);
    const docProgress = settledValueOrDefault(settled[4], []);
    const currentResidencePeriod = settledValueOrDefault(settled[5], null);

    const successCloseoutCheck = needsCloseoutCheck
      ? checkSuccessCloseoutPreconditions({
          caseEntity,
          currentResidencePeriod,
        })
      : null;
    const failureCheck = checkFailureCloseout(caseEntity);

    const mappedCounts = mapDetailCountsRow(counts);
    let documentTemplateMissing = false;
    if (mappedCounts.documentItemsTotal === 0) {
      try {
        const tplResult = await findActiveCaseTemplateByCaseType(
          this.pool,
          ctx,
          caseEntity.caseTypeCode,
        );
        documentTemplateMissing = !tplResult.found;
      } catch {
        documentTemplateMissing = false;
      }
    }

    return {
      case: caseEntity,
      counts: mappedCounts,
      latestValidation: mapLatestValidationRow(latestValidation),
      latestSubmission: mapLatestSubmissionRow(latestSubmission),
      latestReview: mapLatestReviewRow(latestReview),
      documentProgressByProvider: mapDocProgressByProviderRows(docProgress),
      billing: deriveBillingSummary(caseEntity),
      deepLink: deriveDeepLink(caseEntity, caseRow),
      workflowStep: resolveWorkflowStepSummary(caseEntity),
      currentResidencePeriod,
      successCloseoutCheck,
      failureCloseoutCheck: failureCheck.isFailurePath ? failureCheck : null,
      documentTemplateMissing,
    };
  }

  /** 更新案件基本信息（事务内：更新 + Timeline + 转组留痕）。
   * @param id
   * @param input
   * @param ctx 请求上下文 @param id 案件 ID @param input 更新参数 @returns Case 实体 */
  async update(
    ctx: RequestContext,
    id: string,
    input: CaseUpdateInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    assertNotArchived(current);
    validateDueAt(input.dueAt);
    validateCaseEnums(input);

    const groupChanging =
      input.groupId !== undefined && input.groupId !== current.groupId;
    if (groupChanging && !input.groupTransferReason?.trim()) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.GROUP_TRANSFER_REASON_REQUIRED +
          ": groupTransferReason is required when changing case group",
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const f = resolveCaseUpdateFields(input, current);

    return tenantDb.transaction(async (tx) => {
      if (f.companyId) await assertBelongsToOrg(tx, "companies", f.companyId);
      if (f.assistantUserId)
        await assertBelongsToOrg(tx, "users", f.assistantUserId);
      const updated = await executeUpdateCase(tx, id, f);
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.updated",
        payload: { before: current, after: updated },
      });

      if (groupChanging) {
        await writeTimelineInTx(tx, ctx, {
          entityType: "case",
          entityId: updated.id,
          action: "case.group_transferred",
          payload: {
            fromGroupId: current.groupId,
            toGroupId: f.groupId,
            reason: input.groupTransferReason?.trim() ?? "",
          },
        });
      }

      return updated;
    });
  }

  /** 状态变更（校验 state_flow template + 乐观锁防并发 + closeReason 写入）。
   * @param id
   * @param input
   * @param ctx 请求上下文 @param id 案件 ID @param input 变更参数 @returns Case 实体 */
  async transition(
    ctx: RequestContext,
    id: string,
    input: CaseTransitionInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    assertNotArchived(current);

    const fromStage = current.stage ?? current.status;
    const toStage = resolveRequestedTransitionStage(input);
    const closeReason = toStage === "S9" ? (input.closeReason ?? null) : null;
    await validateStageTransition(
      this.pool,
      this.templatesResolver,
      ctx,
      current,
      fromStage,
      toStage,
      closeReason,
    );
    assertCloseReasonForNonCompletionArchive(fromStage, toStage, closeReason);
    const newPhase = resolveTransitionBusinessPhase(toStage, closeReason);
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const updated = await executeStageTransition(
        tx,
        id,
        fromStage,
        toStage,
        closeReason,
        newPhase,
      );
      await insertStageHistory(
        tx,
        ctx.orgId,
        id,
        fromStage,
        toStage,
        ctx.userId,
      );
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.transitioned",
        payload: buildTransitionPayload(
          fromStage,
          toStage,
          newPhase,
          current.businessPhase,
        ),
      });
      return updated;
    });
  }

  /** 软删除案件（事务内：标记删除 + Timeline）。
   * @param id
   * @param ctx 请求上下文 @param id 案件 ID */
  async softDelete(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current)
      throw new NotFoundException("Case not found or already deleted");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const nextMetadata = { ...current.metadata, _status: "deleted" };

    await tenantDb.transaction(async (tx) => {
      await executeSoftDeleteCase(tx, id, nextMetadata);

      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: id,
        action: "case.deleted",
        payload: { status: "deleted" },
      });
    });
  }

  /**
   * 记录欠款风险确认（写入 billing_risk_acknowledged_* 字段 + Timeline）。
   * @param ctx 请求上下文
   * @param id 案件 ID
   * @param input 确认参数
   * @returns 更新后的 Case
   */
  async acknowledgeBillingRisk(
    ctx: RequestContext,
    id: string,
    input: CaseBillingRiskAckInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    assertNotArchived(current);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const updated = await executeBillingRiskAck(tx, id, ctx.userId, input);
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.billing_risk_acknowledged",
        payload: {
          reasonCode: input.reasonCode,
          reasonNote: input.reasonNote ?? null,
          evidenceUrl: input.evidenceUrl ?? null,
        },
      });
      return updated;
    });
  }

  /**
   * 更新下签后子阶段（P0 存正式列 + metadata 兼容回写 + 自动打时间戳）。
   *
   * 存储策略：
   * - stage 值 → `post_approval_stage`，并同步 `metadata.post_approval_stage`
   * - overseas_visa_applying → 首次写入时自动填 `overseas_visa_start_at`
   * - entry_success → 首次写入时自动填 `entry_confirmed_at`
   *
   * @param ctx 请求上下文
   * @param id 案件 ID
   * @param input 子阶段参数
   * @returns 更新后的 Case
   */
  async updatePostApprovalStage(
    ctx: RequestContext,
    id: string,
    input: PostApprovalStageInput,
  ): Promise<Case> {
    if (!POST_APPROVAL_STAGES.has(input.stage)) {
      throw new BadRequestException("Invalid post-approval stage");
    }

    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    assertNotArchived(current);

    const previousStage = current.postApprovalStage;
    const nextMetadata = {
      ...current.metadata,
      post_approval_stage: input.stage,
    };
    const stampVisa =
      input.stage === "overseas_visa_applying" && !current.overseasVisaStartAt;
    const stampEntry =
      input.stage === "entry_success" && !current.entryConfirmedAt;

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      await assertPostApprovalBillingGate(tx, current, input.stage);
      const updated = await executePostApprovalStageUpdate(
        tx,
        id,
        input.stage,
        nextMetadata,
        stampVisa,
        stampEntry,
      );
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.post_approval_stage_changed",
        payload: { from: previousStage, to: input.stage },
      });
      return updated;
    });
  }

  /** P1 业务子步骤流转，不修改 Case.stage。海外返签步骤附带自动打戳与结果态收敛。 */
  async transitionWorkflowStep(
    ctx: RequestContext,
    id: string,
    input: WorkflowStepTransitionInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    assertNotArchived(current);

    const toStepCode = validateWorkflowStepTransitionTarget(
      current,
      input.toStepCode,
    );
    const fromStepCode = current.currentWorkflowStepCode;
    const overseas = resolveOverseasStepEffects(current, toStepCode);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      await assertWorkflowStepBillingGate(tx, current, toStepCode);
      const updated = await executeWorkflowStepTransition(
        tx,
        id,
        toStepCode,
        overseas,
      );

      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.workflow_step_transitioned",
        payload: { from: fromStepCode, to: toStepCode },
      });

      await writeOverseasStepTimeline(tx, ctx, updated, toStepCode);

      return updated;
    });
  }

  /**
   * businessPhase 维度流转 — 独立于 S1-S9 stage 轴。
   *
   * 终态联动（BUG-116/117）：
   *   - CLOSED_SUCCESS → stage=S9, result_outcome='success'
   *   - CLOSED_FAILED → stage=S9, close_reason=$X, result_outcome=coalesce($Y,'failure')
   *
   * CLOSED_SUCCESS gate：
   *   - 当前 phase 必须为 RENEWAL_REMINDER_SCHEDULED
   *   - 对应 case 必须已有 current residence_period（is_current=true）
   *   - reminder_created 必须为 true
   *
   * CLOSED_FAILED gate：
   *   - 必须提供 closeReason
   */
  async transitionPhase(
    ctx: RequestContext,
    id: string,
    input: PhaseTransitionInput,
  ): Promise<Case> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Case not found or deleted");
    assertNotArchived(current);

    const fromPhase = current.businessPhase;
    const toPhase = input.toPhase;
    assertValidPhaseTransitionInput(fromPhase, toPhase);

    assertCloseReasonForFailedPhase(toPhase, input.closeReason);

    if (toPhase === "CLOSED_SUCCESS") {
      const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
      await assertClosedSuccessGate(tenantDb, id);
    }

    const effects = buildPhaseTransitionEffects(
      current,
      fromPhase,
      toPhase,
      input,
    );

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      await assertCoeSendBillingGate(tx, current, toPhase);
      await assertWaitingPaymentBillingGate(tx, current, toPhase);
      const updated = await executePhaseTransitionUpdate(
        tx,
        id,
        fromPhase,
        toPhase,
        effects,
      );
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.phase_transitioned",
        payload: buildPhaseTransitionTimelinePayload(
          fromPhase,
          toPhase,
          updated,
          effects,
        ),
      });
      return updated;
    });
  }

  /**
   *
   */
  async incrementSupplementCount(
    ctx: RequestContext,
    caseId: string,
  ): Promise<number> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) =>
      recalcSupplementCount(tx, caseId),
    );
  }

  /**
   * 当 caseTypeCode 触发 BMV 建案闸口时，先校验本租户是否启用 BMV feature flag。
   *
   * 背景：customers controller 上的 BMV 写入端点（送问卷/生成报价/登记签约）
   * 都被 `assertBmvEnabled` 守卫，flag 关闭时返回 403；但 cases.service 的
   * BMV 闸口仅根据 caseTypeCode 触发，会要求客户必须完成 BMV 流程。两者结合
   * 会出现「服务端要求过 BMV 闸口、客户档案因 flag 关闭无法完成 BMV 流程」的
   * 死锁状态。此处在 flag 关闭时直接返回 `CASE_BMV_FEATURE_DISABLED`，让前端
   * 把 4 条空泛 blocker 替换为「请联系管理员开启 BMV 功能」的明确提示。
   *
   * 兼容旧测试：`featureFlagsService` 通过 `@Optional()` 注入，未提供时跳过
   * flag 校验，避免破坏只构造 pool + templatesResolver 两个依赖的旧用例。
   *
   * @param ctx 请求上下文
   * @param caseTypeCode 案件类型代码
   */
  private async assertBmvFeatureEnabledIfNeeded(
    ctx: RequestContext,
    caseTypeCode: string,
  ): Promise<void> {
    if (!requiresBmvCaseCreationGate(caseTypeCode)) return;
    if (!this.featureFlagsService) return;
    const resolution = await this.featureFlagsService.resolve(ctx, {
      key: "bmv",
    });
    if (!resolution.enabled) {
      throw new BadRequestException({
        code: CASE_WRITE_ERROR_CODES.BMV_FEATURE_DISABLED,
        message: "BMV feature is not enabled for this organization",
        blockers: [
          {
            code: "BMV_FEATURE_DISABLED",
            message: "BMV feature is not enabled for this organization",
          },
        ],
      });
    }
  }
}
