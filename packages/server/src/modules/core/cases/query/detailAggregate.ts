/**
 * 案件详情聚合读模型的分片取数与富化步骤（拆分批次 S4）。
 *
 * `CasesService.getDetailAggregate` 原本是全 server 唯一挂着
 * `complexity` / `max-statements` 豁免的方法：六路并行子查询、四段条件富化、
 * 一次 billing 缓存回写与重载，全部堆在一个方法里。本模块把每一步抽成
 * 具名函数，让编排点回归「读得懂的顺序」，豁免随之卸除。
 *
 * **降级语义是契约，不是实现细节**（BUG-064）：任一分片子查询失败，聚合仍需
 * 返回其余部分数据而非整体 500。同理，四段富化各自 try/catch 吞错并退回安全
 * 默认值——失败只应让对应字段退化，不应让整个详情页打不开。
 * 相关测试：cases.service.test.ts 的 4 条 "returns partial data when ..."。
 */
import type { Pool } from "pg";

import type { Case } from "../../model/coreEntities";
import type { CaseDetailAggregateDto } from "../cases.types";
import { resolveWorkflowStepSummary } from "../flow/workflow-step/workflowStepReadModel";
import {
  checkSuccessCloseoutPreconditions,
  requiresSuccessCloseoutCheck,
} from "../cases.types-residence-closeout";
import { checkFailureCloseout } from "../cases.types-failure-closeout";
import type { RequestContext } from "../../tenancy/requestContext";
import { createTenantDb, type TenantDb } from "../../tenancy/tenantDb";
import { syncBillingCacheForCase } from "../../billing/billingGuards";
import {
  mapCaseRow,
  mapDetailCountsRow,
  mapDocProgressByProviderRows,
  mapLatestReviewRow,
  mapLatestSubmissionRow,
  mapLatestValidationRow,
  type CaseListSummaryRow,
} from "../cases.service.row-mappers";
import {
  deriveDeepLink,
  enrichCaseAggregateReadModelCase,
  logSettledErrors,
  queryCurrentResidencePeriod,
  queryDetailCaseRow,
  queryDetailCounts,
  queryDocProgressByProvider,
  queryInitialSubmissionSubmittedAt,
  queryLatestReview,
  queryLatestSubmission,
  queryLatestValidation,
  settledValueOrDefault,
  settledValueOrUndefined,
} from "../cases.service.detail-queries";
import {
  deriveBillingSummary,
  queryFinalPaymentMilestoneMatched,
} from "../cases.service.billing-summary";
import {
  findActiveCaseTemplateByCaseType,
  resolveTemplateApplicationType,
} from "../cases.template.repository";

/** 允许补生成资料清单的阶段（清单为空时才有意义）。 */
export const BOOTSTRAP_ALLOWED_STAGES = new Set(["S1", "S2"]);

/** 六路并行子查询的结果集合；任一路失败即退化为 undefined / 默认值。 */
export type CaseDetailSlices = {
  counts: Awaited<ReturnType<typeof queryDetailCounts>>;
  latestValidation: Awaited<ReturnType<typeof queryLatestValidation>>;
  latestSubmission: Awaited<ReturnType<typeof queryLatestSubmission>>;
  latestReview: Awaited<ReturnType<typeof queryLatestReview>>;
  docProgress: Awaited<ReturnType<typeof queryDocProgressByProvider>>;
  currentResidencePeriod: Awaited<
    ReturnType<typeof queryCurrentResidencePeriod>
  >;
};

/**
 * 并行取六路详情分片，单路失败不影响其余（BUG-064 降级契约）。
 * @param tenantDb 租户数据库
 * @param id 案件 ID
 * @returns 六路分片结果
 */
export async function fetchCaseDetailSlices(
  tenantDb: TenantDb,
  id: string,
): Promise<CaseDetailSlices> {
  const settled = await Promise.allSettled([
    queryDetailCounts(tenantDb, id),
    queryLatestValidation(tenantDb, id),
    queryLatestSubmission(tenantDb, id),
    queryLatestReview(tenantDb, id),
    queryDocProgressByProvider(tenantDb, id),
    queryCurrentResidencePeriod(tenantDb, id),
  ]);
  logSettledErrors(settled, id);

  return {
    counts: settledValueOrUndefined(settled[0]),
    latestValidation: settledValueOrUndefined(settled[1]),
    latestSubmission: settledValueOrUndefined(settled[2]),
    latestReview: settledValueOrUndefined(settled[3]),
    docProgress: settledValueOrDefault(settled[4], []),
    currentResidencePeriod: settledValueOrDefault(settled[5], null),
  };
}

/** 资料清单可用性：模板是否缺失、能否补生成。 */
export type ChecklistAvailability = {
  documentTemplateMissing: boolean;
  checklistBootstrapAvailable: boolean;
};

/**
 * 仅在资料清单为空时才查模板：判断模板是否缺失、能否补生成。
 *
 * 清单非空时直接返回两个 false（与既有行为一致：不做无谓的模板查询）。
 * 模板查询失败同样退回 false/false —— 详情页不应因模板查不到而报错。
 * @param pool 连接池
 * @param ctx 请求上下文
 * @param caseEntity 案件实体
 * @param documentItemsTotal 资料项总数
 * @returns 清单可用性
 */
export async function resolveChecklistAvailability(
  pool: Pool,
  ctx: RequestContext,
  caseEntity: Case,
  documentItemsTotal: number,
): Promise<ChecklistAvailability> {
  if (documentItemsTotal !== 0) {
    return {
      documentTemplateMissing: false,
      checklistBootstrapAvailable: false,
    };
  }
  try {
    const tplResult = await findActiveCaseTemplateByCaseType(
      pool,
      ctx,
      caseEntity.caseTypeCode,
    );
    const stage = caseEntity.stage ?? caseEntity.status;
    return {
      documentTemplateMissing: !tplResult.found,
      checklistBootstrapAvailable:
        tplResult.found &&
        tplResult.items.length > 0 &&
        BOOTSTRAP_ALLOWED_STAGES.has(stage),
    };
  } catch {
    return {
      documentTemplateMissing: false,
      checklistBootstrapAvailable: false,
    };
  }
}

/**
 * 案件自身未填 applicationType 时，从案件模板快照回填。
 *
 * 已填则返回 null（表示无需回填）；查询失败亦返回 null。
 * @param pool 连接池
 * @param ctx 请求上下文
 * @param caseEntity 案件实体
 * @returns 模板侧 applicationType，或 null
 */
export async function resolveTemplateApplicationTypeIfMissing(
  pool: Pool,
  ctx: RequestContext,
  caseEntity: Case,
): Promise<string | null> {
  if (caseEntity.applicationType?.trim()) return null;
  try {
    return await resolveTemplateApplicationType(
      pool,
      ctx,
      caseEntity.caseTypeCode,
    );
  } catch {
    return null;
  }
}

/**
 * 案件自身未填 acceptedAt 时，取首次提交的提交时间兜底。
 *
 * 最新提交若本身就是 initial，直接用它，省一次查询；否则回表查首次提交。
 * 已填 acceptedAt 或查询失败均返回 undefined。
 * @param tenantDb 租户数据库
 * @param id 案件 ID
 * @param caseEntity 案件实体
 * @param latestSubmission 最新提交摘要（可能为 undefined）
 * @returns 首次提交时间 ISO 串，或 undefined
 */
export async function resolveInitialSubmissionSubmittedAt(
  tenantDb: TenantDb,
  id: string,
  caseEntity: Case,
  latestSubmission: { submissionKind: string; submittedAt: string } | null,
): Promise<string | undefined> {
  if (caseEntity.acceptedAt?.trim()) return undefined;

  if (latestSubmission?.submissionKind === "initial") {
    const iso = latestSubmission.submittedAt.trim();
    return iso !== "" ? iso : undefined;
  }
  try {
    return await queryInitialSubmissionSubmittedAt(tenantDb, id);
  } catch {
    return undefined;
  }
}

/**
 * 查询尾款里程碑是否匹配；失败时退回 true（不因查询失败误报"不匹配"）。
 * @param tenantDb 租户数据库
 * @param id 案件 ID
 * @returns 是否匹配
 */
export async function resolveFinalPaymentMilestoneMatched(
  tenantDb: TenantDb,
  id: string,
): Promise<boolean> {
  try {
    return await queryFinalPaymentMilestoneMatched(tenantDb, id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(
      `[CasesService.getDetailAggregate] sub-query "finalPaymentMilestone" failed for case ${id}: ${msg}`,
    );
    return true;
  }
}

/** billing 缓存同步后的案件行与实体（同步失败时为传入的原值）。 */
export type BillingSyncedCase = {
  row: CaseListSummaryRow;
  entity: Case;
};

/**
 * 回写 billing 缓存列并重载案件行，供聚合读取最新的欠款/回款缓存。
 *
 * 这是读路径上的一次写操作：`syncBillingCacheForCase` 把 billing 聚合结果
 * 落回 cases 的缓存列。同步或重载失败时退回传入的原始行/实体 —— 缓存新鲜度
 * 不值得让详情页打不开。
 * @param tenantDb 租户数据库
 * @param id 案件 ID
 * @param fallbackRow 同步失败时沿用的案件行
 * @param fallbackEntity 同步失败时沿用的案件实体
 * @returns 同步后（或回退的）案件行与实体
 */
export async function syncBillingCacheAndReload(
  tenantDb: TenantDb,
  id: string,
  fallbackRow: CaseListSummaryRow,
  fallbackEntity: Case,
): Promise<BillingSyncedCase> {
  try {
    await tenantDb.transaction(async (tx) => {
      await syncBillingCacheForCase(tx, id);
    });
    const syncedRow = await queryDetailCaseRow(tenantDb, id);
    if (syncedRow) {
      return { row: syncedRow, entity: mapCaseRow(syncedRow) };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error(
      `[CasesService.getDetailAggregate] billing cache sync failed for case ${id}: ${msg}`,
    );
  }
  return { row: fallbackRow, entity: fallbackEntity };
}

// ────────────────────────────────────────────────────────────────
// 组装与编排
// ────────────────────────────────────────────────────────────────

/** 四段条件富化的解析结果。 */
type Enrichments = {
  checklist: ChecklistAvailability;
  templateApplicationType: string | null;
  initialSubmissionSubmittedAt: string | undefined;
  finalPaymentMilestoneMatched: boolean;
};

/**
 * 顺序执行四段条件富化，与拆分前逐句 await 的行为一致。
 *
 * 刻意不用 `Promise.all`：那会改变 DB 并发度与子查询发起顺序，而多个单测以
 * mock pool 按 SQL 到达顺序作答——属行为变更而非重构。
 * @param pool 连接池
 * @param ctx 请求上下文
 * @param tenantDb 租户数据库
 * @param id 案件 ID
 * @param caseEntity 案件实体
 * @param documentItemsTotal 资料项总数
 * @param latestSubmission 最新提交摘要
 * @returns 富化结果
 */
async function resolveEnrichments(
  pool: Pool,
  ctx: RequestContext,
  tenantDb: TenantDb,
  id: string,
  caseEntity: Case,
  documentItemsTotal: number,
  latestSubmission: ReturnType<typeof mapLatestSubmissionRow>,
): Promise<Enrichments> {
  const checklist = await resolveChecklistAvailability(
    pool,
    ctx,
    caseEntity,
    documentItemsTotal,
  );
  const templateApplicationType = await resolveTemplateApplicationTypeIfMissing(
    pool,
    ctx,
    caseEntity,
  );
  const initialSubmissionSubmittedAt =
    await resolveInitialSubmissionSubmittedAt(
      tenantDb,
      id,
      caseEntity,
      latestSubmission,
    );
  const finalPaymentMilestoneMatched =
    await resolveFinalPaymentMilestoneMatched(tenantDb, id);
  return {
    checklist,
    templateApplicationType,
    initialSubmissionSubmittedAt,
    finalPaymentMilestoneMatched,
  };
}

/** 组装 DTO 所需的全部已解析素材。 */
type AggregateParts = {
  billingCase: BillingSyncedCase;
  slices: CaseDetailSlices;
  counts: ReturnType<typeof mapDetailCountsRow>;
  latestSubmissionSummary: ReturnType<typeof mapLatestSubmissionRow>;
  templateApplicationType: string | null;
  initialSubmissionSubmittedAt: string | undefined;
  finalPaymentMilestoneMatched: boolean;
  checklist: ChecklistAvailability;
  successCloseoutCheck: CaseDetailAggregateDto["successCloseoutCheck"];
  failureCheck: ReturnType<typeof checkFailureCloseout>;
};

/**
 * 纯组装：把已解析的素材拼成对外 DTO，不再触发任何 IO。
 *
 * 响应结构是 admin 消费的冻结契约（见 cases.controller.read-model.test.ts）。
 * @param p 已解析素材
 * @returns 详情聚合 DTO
 */
function assembleAggregate(p: AggregateParts): CaseDetailAggregateDto {
  return {
    case: enrichCaseAggregateReadModelCase(
      p.billingCase.entity,
      p.latestSubmissionSummary,
      p.templateApplicationType,
      p.initialSubmissionSubmittedAt,
    ),
    counts: p.counts,
    latestValidation: mapLatestValidationRow(p.slices.latestValidation),
    latestSubmission: p.latestSubmissionSummary,
    latestReview: mapLatestReviewRow(p.slices.latestReview),
    documentProgressByProvider: mapDocProgressByProviderRows(
      p.slices.docProgress,
    ),
    billing: deriveBillingSummary(
      p.billingCase.entity,
      p.finalPaymentMilestoneMatched,
    ),
    deepLink: deriveDeepLink(p.billingCase.entity, p.billingCase.row),
    workflowStep: resolveWorkflowStepSummary(p.billingCase.entity),
    currentResidencePeriod: p.slices.currentResidencePeriod,
    successCloseoutCheck: p.successCloseoutCheck,
    failureCloseoutCheck: p.failureCheck.isFailurePath ? p.failureCheck : null,
    documentTemplateMissing: p.checklist.documentTemplateMissing,
    checklistBootstrapAvailable: p.checklist.checklistBootstrapAvailable,
  };
}

/**
 * 构建案件详情聚合读模型：分片取数 → 条件富化 → billing 缓存收尾 → 组装。
 *
 * admin 详情页消费此聚合，避免多轮 HTTP 拼装。案件不存在返回 null。
 * @param pool 连接池
 * @param ctx 请求上下文
 * @param id 案件 ID
 * @returns 详情聚合 DTO，或 null
 */
export async function buildCaseDetailAggregate(
  pool: Pool,
  ctx: RequestContext,
  id: string,
): Promise<CaseDetailAggregateDto | null> {
  const tenantDb = createTenantDb(pool, ctx.orgId, ctx.userId);

  const caseRow = await queryDetailCaseRow(tenantDb, id);
  if (!caseRow) return null;
  const caseEntity = mapCaseRow(caseRow);

  const slices = await fetchCaseDetailSlices(tenantDb, id);
  const counts = mapDetailCountsRow(slices.counts);
  const latestSubmissionSummary = mapLatestSubmissionRow(
    slices.latestSubmission,
  );

  const successCloseoutCheck = requiresSuccessCloseoutCheck(caseEntity)
    ? checkSuccessCloseoutPreconditions({
        caseEntity,
        currentResidencePeriod: slices.currentResidencePeriod,
      })
    : null;

  const enrichments = await resolveEnrichments(
    pool,
    ctx,
    tenantDb,
    id,
    caseEntity,
    counts.documentItemsTotal,
    latestSubmissionSummary,
  );

  // 收尾：回写 billing 缓存并重载案件行（读路径上唯一的写操作）
  const billingCase = await syncBillingCacheAndReload(
    tenantDb,
    id,
    caseRow,
    caseEntity,
  );

  return assembleAggregate({
    billingCase,
    slices,
    counts,
    latestSubmissionSummary,
    templateApplicationType: enrichments.templateApplicationType,
    initialSubmissionSubmittedAt: enrichments.initialSubmissionSubmittedAt,
    finalPaymentMilestoneMatched: enrichments.finalPaymentMilestoneMatched,
    checklist: enrichments.checklist,
    successCloseoutCheck,
    failureCheck: checkFailureCloseout(caseEntity),
  });
}
