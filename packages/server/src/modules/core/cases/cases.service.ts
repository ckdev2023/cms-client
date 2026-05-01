/* eslint-disable max-lines, jsdoc/require-param-description, jsdoc/require-param, jsdoc/require-returns, jsdoc/require-description */
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Pool } from "pg";

import { customerNameExpr } from "../../../infra/db/customerNameExpr";
import type { Case } from "../model/coreEntities";
import type {
  CaseCreateInput,
  CaseUpdateInput,
  CaseTransitionInput,
  CaseBillingRiskAckInput,
  PostApprovalStageInput,
  CaseListInput,
  CaseListScope,
  CaseVisibilityFilter,
  CaseListItemDto,
  CaseListResultDto,
  CaseDetailAggregateDto,
  CaseDeepLinkContext,
  CaseDetailCounts,
  CaseLatestValidationSummary,
  CaseLatestSubmissionSummary,
  CaseLatestReviewSummary,
  CaseDocumentProgressByProvider,
  CaseBillingSummary,
  WorkflowStepTransitionInput,
  PhaseTransitionInput,
} from "./cases.types";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import {
  isBmvWorkflowStep,
  isValidStepTransition,
  checkParallelBoundary,
} from "./cases.workflow-step";
import type { BmvWorkflowStep } from "./cases.workflow-step";
import { BMV_CASE_TYPE } from "./cases.template-bmv";
import {
  resolveWorkflowStepSummary,
  BMV_STEP_LOOKUP,
} from "./cases.workflow-step-readmodel";
import {
  STAGE_TO_PHASE_DEFAULT,
  assertPhaseTransition,
  isBusinessPhase,
  PhaseTransitionError,
} from "./businessPhase";
import { checkFinalPaymentGuard } from "../billing/billingGuards";
import { decideFinalPaymentGuard } from "./cases.types-final-payment";
import { checkBmvCaseCreationGate } from "./cases.types-bmv-gate";
import {
  OVERSEAS_STEP_CODES,
  VISA_REJECTED_CLOSURE,
  OVERSEAS_TIMELINE_ACTIONS,
} from "./cases.types-overseas-step";
import type { OverseasStepCode } from "./cases.types-overseas-step";
import {
  toResidencePeriodSummary,
  requiresSuccessCloseoutCheck,
  checkSuccessCloseoutPreconditions,
} from "./cases.types-residence-closeout";
import type { CaseResidencePeriodSummary } from "./cases.types-residence-closeout";
import {
  checkFailureCloseout,
  canBypassSuccessCloseoutForFailure,
} from "./cases.types-failure-closeout";
import { mapResidencePeriodRow } from "../residence-periods/residencePeriods.service";
import { requiresBmvCaseCreationGate } from "../../portal/intake/intake.types";
import { resolveCustomerBmvProfile } from "../customers/customers.dto-mappers";
import { PermissionsService } from "../auth/permissions.service";
import { BillingPlansService } from "../billing/billingPlans.service";
import { PaymentRecordsService } from "../billing/paymentRecords.service";
import type {
  CaseBillingTabAggregate,
  CaseBillingSummaryFull,
  CaseBillingRiskAckRecord,
} from "./cases.types-billing";
import type { RequestContext } from "../tenancy/requestContext";
import { isUuid } from "../tenancy/uuid";
import { createTenantDb } from "../tenancy/tenantDb";
import type { TenantDb, TenantDbTx } from "../tenancy/tenantDb";
import { normalizeObject } from "../../../infra/utils/normalize";
import { recalcSupplementCount } from "./casesSupplementCount";

/**
 * P0 案件阶段枚举（S1–S9）。
 * 与 04-核心流程与状态流转.md §1.2 对齐。
 */
export const P0_CASE_STAGES = new Set([
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6",
  "S7",
  "S8",
  "S9",
]);

/**
 * P0 案件阶段流转矩阵（无 Template 时使用）。
 *
 * S9 为终态，不允许继续流转。
 * S1–S6 不得直接跳到 S9（业务约束：未提交入管不得归档）。
 * S7→S9 需要显式 closeReason（失败结案路径）；S8→S9 为正常归档。
 * 补正在 S7 内闭环，不回退主阶段。
 *
 * @see 04-核心流程与状态流转.md §1.2
 * @see BUG-063
 */
export const DEFAULT_CASE_TRANSITIONS: Record<string, string[]> = {
  S1: ["S2"],
  S2: ["S3"],
  S3: ["S2", "S4"],
  S4: ["S3", "S5"],
  S5: ["S3", "S4", "S6"],
  S6: ["S5", "S7"],
  S7: ["S8", "S9"],
  S8: ["S9"],
  S9: [],
};

/** TemplatesService 的最小接口，避免 core → templates 直接依赖。 */
export type TemplatesResolver = {
  resolve(
    ctx: RequestContext,
    input: { kind: string; key: string; entityId?: string },
  ): Promise<
    | { mode: "legacy"; used: false }
    | { mode: "template"; used: false; reason: string }
    | {
        mode: "template";
        used: true;
        version: number;
        config: Record<string, unknown>;
      }
  >;
};

/** TemplatesResolver 注入令牌。 */
export const TEMPLATES_RESOLVER = Symbol("TEMPLATES_RESOLVER");

/** 数据库查询返回的案件行类型。 */
export type CaseQueryRow = {
  id: string;
  org_id: string;
  customer_id: string;
  case_type_code: string;
  status: string;
  stage: string | null;
  group_id?: string | null;
  owner_user_id: string;
  opened_at: unknown;
  due_at: unknown;
  metadata: unknown;
  case_no: string | null;
  case_name: string | null;
  case_subtype: string | null;
  application_type: string | null;
  application_flow_type: string | null;
  visa_plan: string | null;
  post_approval_stage: string | null;
  coe_issued_at: unknown;
  coe_expiry_date: unknown;
  coe_sent_at: unknown;
  close_reason: string | null;
  supplement_count: number | string | null;
  company_id: string | null;
  priority: string;
  risk_level: string;
  assistant_user_id: string | null;
  source_channel: string | null;
  signed_at: unknown;
  accepted_at: unknown;
  submission_date: unknown;
  result_date: unknown;
  residence_expiry_date: unknown;
  archived_at: unknown;
  result_outcome: string | null;
  quote_price: string | number | null;
  deposit_paid_cached: boolean;
  final_payment_paid_cached: boolean;
  billing_unpaid_amount_cached: string | number;
  billing_risk_acknowledged_by: string | null;
  billing_risk_acknowledged_at: unknown;
  billing_risk_ack_reason_code: string | null;
  billing_risk_ack_reason_note: string | null;
  billing_risk_ack_evidence_url: string | null;
  overseas_visa_start_at: unknown;
  entry_confirmed_at: unknown;
  business_phase: string;
  current_workflow_step_code: string | null;
  created_at: unknown;
  updated_at: unknown;
};

function resolvePostApprovalStage(
  columnValue: string | null,
  metadata: Record<string, unknown>,
): string | null {
  if (columnValue && columnValue !== "none") return columnValue;
  const legacyValue = metadata.post_approval_stage;
  return typeof legacyValue === "string" ? legacyValue : null;
}

function mapCaseExtendedFields(row: CaseQueryRow) {
  const metadata = normalizeObject(row.metadata);
  const postApprovalStage = resolvePostApprovalStage(
    row.post_approval_stage,
    metadata,
  );

  if (postApprovalStage && metadata.post_approval_stage === undefined) {
    metadata.post_approval_stage = postApprovalStage;
  }

  return {
    metadata,
    stage: row.stage ?? row.status,
    applicationFlowType: row.application_flow_type ?? null,
    visaPlan: row.visa_plan ?? null,
    postApprovalStage,
    coeIssuedAt: toTimestampStringOrNull(row.coe_issued_at),
    coeExpiryDate: toTimestampStringOrNull(row.coe_expiry_date),
    coeSentAt: toTimestampStringOrNull(row.coe_sent_at),
    closeReason: row.close_reason ?? null,
    supplementCount:
      row.supplement_count !== null ? Number(row.supplement_count) : 0,
  };
}

/** P0 新增字段の DB 行 → エンティティ変換。 */
function mapCaseP0Fields(row: CaseQueryRow) {
  return {
    resultOutcome: row.result_outcome ?? null,
    quotePrice: row.quote_price !== null ? Number(row.quote_price) : null,
    depositPaidCached: row.deposit_paid_cached,
    finalPaymentPaidCached: row.final_payment_paid_cached,
    billingUnpaidAmountCached: Number(row.billing_unpaid_amount_cached),
    billingRiskAcknowledgedBy: row.billing_risk_acknowledged_by ?? null,
    billingRiskAcknowledgedAt: toTimestampStringOrNull(
      row.billing_risk_acknowledged_at,
    ),
    billingRiskAckReasonCode: row.billing_risk_ack_reason_code ?? null,
    billingRiskAckReasonNote: row.billing_risk_ack_reason_note ?? null,
    billingRiskAckEvidenceUrl: row.billing_risk_ack_evidence_url ?? null,
    overseasVisaStartAt: toTimestampStringOrNull(row.overseas_visa_start_at),
    entryConfirmedAt: toTimestampStringOrNull(row.entry_confirmed_at),
  };
}

/**
 * 将数据库查询结果行映射为 Case 实体。
 * @param row 数据库行
 * @returns Case 实体
 */
export function mapCaseRow(row: CaseQueryRow): Case {
  const extendedFields = mapCaseExtendedFields(row);
  return {
    id: row.id,
    orgId: row.org_id,
    customerId: row.customer_id,
    caseTypeCode: row.case_type_code,
    status: extendedFields.stage,
    stage: extendedFields.stage,
    groupId: row.group_id ?? null,
    ownerUserId: row.owner_user_id,
    openedAt: toTimestampString(row.opened_at),
    dueAt: toTimestampStringOrNull(row.due_at),
    metadata: extendedFields.metadata,
    caseNo: row.case_no ?? null,
    caseName: row.case_name ?? null,
    caseSubtype: row.case_subtype ?? null,
    applicationType: row.application_type ?? null,
    applicationFlowType: extendedFields.applicationFlowType,
    visaPlan: extendedFields.visaPlan,
    postApprovalStage: extendedFields.postApprovalStage,
    coeIssuedAt: extendedFields.coeIssuedAt,
    coeExpiryDate: extendedFields.coeExpiryDate,
    coeSentAt: extendedFields.coeSentAt,
    closeReason: extendedFields.closeReason,
    supplementCount: extendedFields.supplementCount,
    companyId: row.company_id ?? null,
    priority: row.priority,
    riskLevel: row.risk_level,
    assistantUserId: row.assistant_user_id ?? null,
    sourceChannel: row.source_channel ?? null,
    signedAt: toTimestampStringOrNull(row.signed_at),
    acceptedAt: toTimestampStringOrNull(row.accepted_at),
    submissionDate: toTimestampStringOrNull(row.submission_date),
    resultDate: toTimestampStringOrNull(row.result_date),
    residenceExpiryDate: toTimestampStringOrNull(row.residence_expiry_date),
    archivedAt: toTimestampStringOrNull(row.archived_at),
    ...mapCaseP0Fields(row),
    businessPhase: row.business_phase,
    currentWorkflowStepCode: row.current_workflow_step_code ?? null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

type CaseListSummaryRow = CaseQueryRow & {
  customer_name: string | null;
  group_name: string | null;
  owner_display_name: string | null;
  assistant_display_name: string | null;
};

/**
 *
 */
export function mapCaseListSummaryRow(
  row: CaseListSummaryRow,
): CaseListItemDto {
  return {
    ...mapCaseRow(row),
    customerName: row.customer_name ?? "",
    groupName: row.group_name ?? null,
    ownerDisplayName: row.owner_display_name ?? "",
    assistantDisplayName: row.assistant_display_name ?? null,
  };
}

type BillingSummaryAggRow = {
  quote_price: string | number | null;
  total_due: string | number;
  total_received: string | number;
  plan_count: number | string;
  payment_count: number | string;
  overdue_plan_count: number | string;
  deposit_paid_cached: boolean;
  final_payment_paid_cached: boolean;
  billing_risk_acknowledged_by: string | null;
  billing_risk_acknowledged_at: unknown;
  billing_risk_ack_reason_code: string | null;
  billing_risk_ack_reason_note: string | null;
  billing_risk_ack_evidence_url: string | null;
};

type CaseDetailCountsRow = {
  document_items_total: string;
  document_items_done: string;
  questionnaire_items_total: string;
  questionnaire_items_done: string;
  case_parties: string;
  tasks: string;
  tasks_pending: string;
  communication_logs: string;
  submission_packages: string;
  generated_documents: string;
  validation_runs: string;
  review_records: string;
  billing_records: string;
  payment_records: string;
};

const ZERO_COUNTS: CaseDetailCounts = {
  documentItemsTotal: 0,
  documentItemsDone: 0,
  questionnaireItemsTotal: 0,
  questionnaireItemsDone: 0,
  caseParties: 0,
  tasks: 0,
  tasksPending: 0,
  communicationLogs: 0,
  submissionPackages: 0,
  generatedDocuments: 0,
  validationRuns: 0,
  reviewRecords: 0,
  billingRecords: 0,
  paymentRecords: 0,
};

function parseIntSafe(value: string | undefined): number {
  return parseInt(value ?? "0", 10) || 0;
}

/**
 *
 */
export function mapDetailCountsRow(
  row: CaseDetailCountsRow | undefined,
): CaseDetailCounts {
  if (!row) return { ...ZERO_COUNTS };
  return {
    documentItemsTotal: parseIntSafe(row.document_items_total),
    documentItemsDone: parseIntSafe(row.document_items_done),
    questionnaireItemsTotal: parseIntSafe(row.questionnaire_items_total),
    questionnaireItemsDone: parseIntSafe(row.questionnaire_items_done),
    caseParties: parseIntSafe(row.case_parties),
    tasks: parseIntSafe(row.tasks),
    tasksPending: parseIntSafe(row.tasks_pending),
    communicationLogs: parseIntSafe(row.communication_logs),
    submissionPackages: parseIntSafe(row.submission_packages),
    generatedDocuments: parseIntSafe(row.generated_documents),
    validationRuns: parseIntSafe(row.validation_runs),
    reviewRecords: parseIntSafe(row.review_records),
    billingRecords: parseIntSafe(row.billing_records),
    paymentRecords: parseIntSafe(row.payment_records),
  };
}

type LatestSubmissionRow = {
  id: string;
  submission_no: number | string;
  submission_kind: string;
  submitted_at: unknown;
  related_submission_id: string | null;
};

/**
 *
 */
export function mapLatestSubmissionRow(
  row: LatestSubmissionRow | undefined,
): CaseLatestSubmissionSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    submissionNo:
      typeof row.submission_no === "number"
        ? row.submission_no
        : parseInt(row.submission_no, 10) || 0,
    submissionKind: row.submission_kind,
    submittedAt: toTimestampString(row.submitted_at),
    relatedSubmissionId: row.related_submission_id ?? null,
  };
}

type LatestReviewRow = {
  id: string;
  decision: string;
  reviewed_at: unknown;
  reviewer_user_id: string | null;
  reviewer_display_name: string | null;
};

/**
 *
 */
export function mapLatestReviewRow(
  row: LatestReviewRow | undefined,
): CaseLatestReviewSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    decision: row.decision,
    reviewedAt: toTimestampString(row.reviewed_at),
    reviewerUserId: row.reviewer_user_id ?? null,
    reviewerDisplayName: row.reviewer_display_name ?? null,
  };
}

type DocProgressByProviderRow = {
  provider_role: string;
  total: string;
  done: string;
};

/**
 *
 */
export function mapDocProgressByProviderRows(
  rows: DocProgressByProviderRow[],
): CaseDocumentProgressByProvider[] {
  return rows.map((row) => ({
    providerRole: row.provider_role,
    total: parseIntSafe(row.total),
    done: parseIntSafe(row.done),
  }));
}

type LatestValidationRow = {
  id: string;
  result_status: string;
  executed_at: unknown;
  blocking_count: number | string;
  warning_count: number | string;
};

/**
 *
 */
export function mapLatestValidationRow(
  row: LatestValidationRow | undefined,
): CaseLatestValidationSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    status: row.result_status,
    executedAt: toTimestampString(row.executed_at),
    blockingCount:
      typeof row.blocking_count === "number"
        ? row.blocking_count
        : parseInt(row.blocking_count, 10) || 0,
    warningCount:
      typeof row.warning_count === "number"
        ? row.warning_count
        : parseInt(row.warning_count, 10) || 0,
  };
}

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toTimestampString(value: unknown): string {
  const s = toTimestampStringOrNull(value);
  if (!s) return "";
  return s;
}

// Write contract types re-exported from cases.types.ts
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

/**
 * P0 下签后子阶段枚举。
 *
 * P0 存储策略：stage 值写入正式列 `post_approval_stage`，
 * 并兼容回写 `metadata.post_approval_stage`，
 * 对应时间戳写入专用列（`overseas_visa_start_at` / `entry_confirmed_at`）。
 * P1 启用 CaseWorkflowStep 后迁移为正式实体记录。
 */
export const POST_APPROVAL_STAGES = new Set([
  "waiting_final_payment",
  "coe_sent",
  "overseas_visa_applying",
  "entry_success",
]);

export const CASE_COLS = `id, org_id, customer_id, case_type_code, status, stage, group_id, owner_user_id, opened_at, due_at, metadata, case_no, case_name, case_subtype, application_type, application_flow_type, visa_plan, post_approval_stage, coe_issued_at, coe_expiry_date, coe_sent_at, close_reason, supplement_count, company_id, priority, risk_level, assistant_user_id, source_channel, signed_at, accepted_at, submission_date, result_date, residence_expiry_date, archived_at, result_outcome, quote_price, deposit_paid_cached, final_payment_paid_cached, billing_unpaid_amount_cached, billing_risk_acknowledged_by, billing_risk_acknowledged_at, billing_risk_ack_reason_code, billing_risk_ack_reason_note, billing_risk_ack_evidence_url, overseas_visa_start_at, entry_confirmed_at, business_phase, current_workflow_step_code, created_at, updated_at`;

export const CASE_COLS_PREFIXED = CASE_COLS.split(", ")
  .map((col) => `cs.${col}`)
  .join(", ");

const CUSTOMER_NAME_EXPR = customerNameExpr("cu");

export const SUMMARY_JOINS = `
  left join customers cu on cu.id = cs.customer_id
  left join groups g on g.id = cs.group_id
  left join users owner_u on owner_u.id = cs.owner_user_id
  left join users asst_u on asst_u.id = cs.assistant_user_id
`;

export const SUMMARY_EXTRA_COLS = `
  ${CUSTOMER_NAME_EXPR} as customer_name,
  g.name as group_name,
  owner_u.name as owner_display_name,
  asst_u.name as assistant_display_name
`;
const CASE_PRIORITIES = new Set(["low", "normal", "medium", "high", "urgent"]);
const CASE_RISK_LEVELS = new Set(["none", "low", "medium", "high"]);
export const CASE_RESULT_OUTCOMES = new Set([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
  "visa_rejected",
]);

/** 列表过滤条件构建器（提取以降低 list 方法复杂度）。 */
function buildCaseListFilter(input: CaseListInput): {
  whereClause: string;
  params: unknown[];
} {
  return buildCaseListFilterPrefixed(input, "");
}

function hasInvalidCaseListUuidFilter(input: CaseListInput): boolean {
  return [input.ownerUserId, input.customerId, input.groupId].some(
    (value) => typeof value === "string" && value.length > 0 && !isUuid(value),
  );
}

function buildCaseListFilterPrefixed(
  input: CaseListInput,
  prefix: string,
): {
  whereClause: string;
  params: unknown[];
} {
  if (hasInvalidCaseListUuidFilter(input)) {
    return { whereClause: "where 1 = 0", params: [] };
  }

  const p = prefix;
  const where: string[] = [
    `coalesce(${p}metadata->>'_status', '') is distinct from 'deleted'`,
  ];
  const params: unknown[] = [];
  const requestedStage = resolveRequestedCaseStage(input);
  const filters: [string, string | undefined][] = [
    [`coalesce(${p}stage, ${p}status)`, requestedStage],
    [`${p}result_outcome`, input.resultOutcome],
    [`${p}owner_user_id`, input.ownerUserId],
    [`${p}customer_id`, input.customerId],
    [`${p}group_id`, input.groupId],
    [`${p}priority`, input.priority],
    [`${p}risk_level`, input.riskLevel],
    [`${p}company_id`, input.companyId],
    [`${p}business_phase`, input.phase],
  ];
  for (const [col, val] of filters) {
    if (val) {
      params.push(val);
      where.push(`${col} = $${String(params.length)}`);
    }
  }

  if (input.visibility) {
    appendVisibilityConditionPrefixed(where, params, input.visibility, prefix);
    if (input.scope) {
      appendScopeConditionPrefixed(
        where,
        params,
        input.scope,
        input.visibility,
        prefix,
      );
    }
  }

  const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
  return { whereClause, params };
}

function appendVisibilityConditionPrefixed(
  where: string[],
  params: unknown[],
  v: CaseVisibilityFilter,
  prefix: string,
): void {
  if (v.roleTier === "admin") return;

  const p = prefix;
  params.push(v.userId);
  const userParam = `$${String(params.length)}`;

  if (v.roleTier === "staff") {
    const conditions = [
      `${p}owner_user_id = ${userParam}`,
      `${p}assistant_user_id = ${userParam}`,
    ];
    if (v.groupId) {
      params.push(v.groupId);
      conditions.unshift(`${p}group_id = $${String(params.length)}`);
    }
    where.push(`(${conditions.join(" or ")})`);
    return;
  }

  where.push(
    `(${p}owner_user_id = ${userParam} or ${p}assistant_user_id = ${userParam})`,
  );
}

function appendScopeConditionPrefixed(
  where: string[],
  params: unknown[],
  scope: CaseListScope,
  visibility: CaseVisibilityFilter,
  prefix: string,
): void {
  if (scope === "all") return;

  const p = prefix;
  if (scope === "group") {
    if (!visibility.groupId) {
      where.push("1 = 0");
      return;
    }
    params.push(visibility.groupId);
    where.push(`${p}group_id = $${String(params.length)}`);
    return;
  }

  params.push(visibility.userId);
  const userParam = `$${String(params.length)}`;
  where.push(
    `(${p}owner_user_id = ${userParam} or ${p}assistant_user_id = ${userParam})`,
  );
}

/** 若 v 不为 undefined 则取 v，否则取 fallback（区别于 ?? 以保留 null）。 */
function pickDefined<T>(v: T | undefined, fallback: T): T {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return v !== undefined ? v : fallback;
}

const DEFAULT_CASE_PREFIX = "CASE";

function formatCaseYearMonth(date: Date): string {
  return `${String(date.getFullYear())}${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatCaseNo(prefix: string, date: Date, seq: number): string {
  return `${prefix}-${formatCaseYearMonth(date)}-${String(seq).padStart(4, "0")}`;
}

function resolveCasePrefix(settings: unknown): string {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return DEFAULT_CASE_PREFIX;
  }
  const value = (settings as Record<string, unknown>).case_prefix;
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : DEFAULT_CASE_PREFIX;
}

function isCaseNoConflict(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const pgError = error as { code?: unknown; constraint?: unknown };
  return (
    pgError.code === "23505" && pgError.constraint === "uq_cases_org_case_no"
  );
}

/** 将 CaseUpdateInput 与 current Case 合并，返回各字段的最终值。 */
function resolveCaseUpdateFields(input: CaseUpdateInput, current: Case) {
  return {
    caseTypeCode: input.caseTypeCode ?? current.caseTypeCode,
    ownerUserId: input.ownerUserId ?? current.ownerUserId,
    groupId: pickDefined(input.groupId, current.groupId),
    dueAt: pickDefined(input.dueAt, current.dueAt),
    metadata: input.metadata ?? current.metadata,
    caseNo: current.caseNo,
    caseName: pickDefined(input.caseName, current.caseName),
    caseSubtype: pickDefined(input.caseSubtype, current.caseSubtype),
    applicationType: pickDefined(
      input.applicationType,
      current.applicationType,
    ),
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    companyId: pickDefined(input.companyId, current.companyId),
    priority: input.priority ?? current.priority,
    riskLevel: input.riskLevel ?? current.riskLevel,
    assistantUserId: pickDefined(
      input.assistantUserId,
      current.assistantUserId,
    ),
    sourceChannel: pickDefined(input.sourceChannel, current.sourceChannel),
    signedAt: pickDefined(input.signedAt, current.signedAt),
    acceptedAt: pickDefined(input.acceptedAt, current.acceptedAt),
    submissionDate: pickDefined(input.submissionDate, current.submissionDate),
    resultDate: pickDefined(input.resultDate, current.resultDate),
    residenceExpiryDate: pickDefined(
      input.residenceExpiryDate,
      current.residenceExpiryDate,
    ),
    archivedAt: pickDefined(input.archivedAt, current.archivedAt),
    resultOutcome: pickDefined(input.resultOutcome, current.resultOutcome),
    quotePrice: pickDefined(input.quotePrice, current.quotePrice),
    visaPlan: pickDefined(input.visaPlan, current.visaPlan),
    overseasVisaStartAt: pickDefined(
      input.overseasVisaStartAt,
      current.overseasVisaStartAt,
    ),
    entryConfirmedAt: pickDefined(
      input.entryConfirmedAt,
      current.entryConfirmedAt,
    ),
  };
}

function validateCaseEnums(input: {
  stage?: string;
  status?: string;
  priority?: string;
  riskLevel?: string;
  resultOutcome?: string | null;
}): void {
  resolveRequestedCaseStage(input);
  if (input.priority !== undefined && !CASE_PRIORITIES.has(input.priority)) {
    throw new BadRequestException("Invalid priority");
  }
  if (input.riskLevel !== undefined && !CASE_RISK_LEVELS.has(input.riskLevel)) {
    throw new BadRequestException("Invalid riskLevel");
  }
  if (
    input.resultOutcome !== null &&
    input.resultOutcome !== undefined &&
    !CASE_RESULT_OUTCOMES.has(input.resultOutcome)
  ) {
    throw new BadRequestException("Invalid resultOutcome");
  }
}

function resolveRequestedCaseStage(input: {
  stage?: string;
  status?: string;
}): string | undefined {
  if (
    input.stage !== undefined &&
    input.status !== undefined &&
    input.stage !== input.status
  ) {
    throw new BadRequestException("stage and status must match");
  }

  const requestedStage = input.stage ?? input.status;
  if (requestedStage === undefined) return undefined;
  if (!P0_CASE_STAGES.has(requestedStage)) {
    throw new BadRequestException(
      `Invalid ${input.stage !== undefined ? "stage" : "status"}`,
    );
  }
  return requestedStage;
}

/**
 * S9 归档后写保护 — 对齐 P0 权威基线 §8。
 * 案件进入 S9 后除日志外全字段只读。
 */
function assertNotArchived(current: Case): void {
  const stage = current.stage ?? current.status;
  if (stage === "S9") {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.S9_READONLY +
        ": Case is archived (S9) and read-only",
    );
  }
}

function resolveRequestedTransitionStage(input: CaseTransitionInput): string {
  if (
    input.toStage !== undefined &&
    input.toStatus !== undefined &&
    input.toStage !== input.toStatus
  ) {
    throw new BadRequestException("toStage and toStatus must match");
  }

  const requestedStage = input.toStage ?? input.toStatus;
  if (!requestedStage) {
    throw new BadRequestException("Invalid toStage");
  }
  if (!P0_CASE_STAGES.has(requestedStage)) {
    throw new BadRequestException(
      `Invalid ${input.toStage !== undefined ? "toStage" : "toStatus"}`,
    );
  }
  return requestedStage;
}

function resolveInitialBusinessPhase(stage: string): string {
  if (stage in STAGE_TO_PHASE_DEFAULT) {
    return STAGE_TO_PHASE_DEFAULT[stage as keyof typeof STAGE_TO_PHASE_DEFAULT];
  }
  return "CONSULTING";
}

/**
 * stage 流转时推导新的 businessPhase。
 * S9 + closeReason → CLOSED_FAILED（失败结案）；S9 无 closeReason → CLOSED_SUCCESS。
 * 其余阶段走默认映射。
 */
function resolveTransitionBusinessPhase(
  toStage: string,
  closeReason: string | null,
): string {
  if (toStage === "S9" && closeReason) {
    return "CLOSED_FAILED";
  }
  return resolveInitialBusinessPhase(toStage);
}

function assertCloseReasonForNonCompletionArchive(
  fromStage: string,
  toStage: string,
  closeReason: string | null,
): void {
  if (toStage === "S9" && fromStage !== "S8" && !closeReason) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.CLOSE_REASON_REQUIRED +
        ": closeReason is required when archiving from a non-completion stage",
    );
  }
}

/** 将 CaseCreateInput 展平为 insert 参数数组。 */
function buildInsertCaseParams(
  orgId: string,
  input: CaseCreateInput,
): unknown[] {
  const workflowStage = resolveRequestedCaseStage(input) ?? "S1";
  const nullableFields = [
    input.caseNo,
    input.caseName,
    input.caseSubtype,
    input.applicationType,
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    input.companyId,
  ].map((v) => v ?? null);
  const nullableTail = [
    input.assistantUserId,
    input.sourceChannel,
    input.signedAt,
    input.acceptedAt,
    input.submissionDate,
    input.resultDate,
    input.residenceExpiryDate,
  ].map((v) => v ?? null);

  return [
    orgId,
    input.customerId,
    input.caseTypeCode,
    workflowStage,
    workflowStage,
    input.groupId ?? null,
    input.ownerUserId,
    input.dueAt ?? null,
    JSON.stringify(input.metadata ?? {}),
    ...nullableFields,
    input.priority ?? "normal",
    input.riskLevel ?? "low",
    ...nullableTail,
    input.resultOutcome ?? null,
    input.quotePrice ?? null,
    input.visaPlan ?? null,
    resolveInitialBusinessPhase(workflowStage),
  ];
}

async function queryDetailCaseRow(
  tenantDb: TenantDb,
  id: string,
): Promise<CaseListSummaryRow | undefined> {
  const result = await tenantDb.query<CaseListSummaryRow>(
    `
      select ${CASE_COLS_PREFIXED},
             ${SUMMARY_EXTRA_COLS}
      from cases cs
      ${SUMMARY_JOINS}
      where cs.id = $1
        and coalesce(cs.metadata->>'_status', '') is distinct from 'deleted'
      limit 1
    `,
    [id],
  );
  return result.rows.at(0);
}

async function queryDetailCounts(
  tenantDb: TenantDb,
  id: string,
): Promise<CaseDetailCountsRow | undefined> {
  const result = await tenantDb.query<CaseDetailCountsRow>(
    `
      select
        (select count(*)::text from document_items where case_id = $1 and status != 'deleted') as document_items_total,
        (select count(*)::text from document_items where case_id = $1 and status in ('approved', 'waived')) as document_items_done,
        (select count(*)::text from document_items where case_id = $1 and status != 'deleted' and category = 'questionnaire') as questionnaire_items_total,
        (select count(*)::text from document_items where case_id = $1 and status in ('approved', 'waived') and category = 'questionnaire') as questionnaire_items_done,
        (select count(*)::text from case_parties where case_id = $1) as case_parties,
        (select count(*)::text from tasks where case_id = $1 and status != 'deleted') as tasks,
        (select count(*)::text from tasks where case_id = $1 and status = 'pending') as tasks_pending,
        (select count(*)::text from communication_logs where case_id = $1) as communication_logs,
        (select count(*)::text from submission_packages where case_id = $1) as submission_packages,
        (select count(*)::text from generated_documents where case_id = $1) as generated_documents,
        (select count(*)::text from validation_runs where case_id = $1) as validation_runs,
        (select count(*)::text from review_records where case_id = $1) as review_records,
        (select count(*)::text from billing_records where case_id = $1) as billing_records,
        (select count(*)::text from payment_records where case_id = $1) as payment_records
    `,
    [id],
  );
  return result.rows.at(0);
}

async function queryLatestValidation(
  tenantDb: TenantDb,
  id: string,
): Promise<LatestValidationRow | undefined> {
  const result = await tenantDb.query<LatestValidationRow>(
    `
      select id, result_status, executed_at, blocking_count, warning_count
      from validation_runs
      where case_id = $1
      order by executed_at desc
      limit 1
    `,
    [id],
  );
  return result.rows.at(0);
}

async function queryLatestSubmission(
  tenantDb: TenantDb,
  id: string,
): Promise<LatestSubmissionRow | undefined> {
  const result = await tenantDb.query<LatestSubmissionRow>(
    `
      select id, submission_no, submission_kind, submitted_at, related_submission_id
      from submission_packages
      where case_id = $1
      order by submitted_at desc
      limit 1
    `,
    [id],
  );
  return result.rows.at(0);
}

async function queryLatestReview(
  tenantDb: TenantDb,
  id: string,
): Promise<LatestReviewRow | undefined> {
  const result = await tenantDb.query<LatestReviewRow>(
    `
      select rr.id, rr.decision, rr.reviewed_at, rr.reviewer_user_id,
             u.name as reviewer_display_name
      from review_records rr
      left join users u on u.id = rr.reviewer_user_id
      where rr.case_id = $1
      order by rr.reviewed_at desc
      limit 1
    `,
    [id],
  );
  return result.rows.at(0);
}

async function queryDocProgressByProvider(
  tenantDb: TenantDb,
  id: string,
): Promise<DocProgressByProviderRow[]> {
  const result = await tenantDb.query<DocProgressByProviderRow>(
    `
      select
        coalesce(provided_by_role, 'unknown') as provider_role,
        count(*)::text as total,
        count(*) filter (where status in ('approved', 'waived'))::text as done
      from document_items
      where case_id = $1 and status != 'deleted'
      group by provided_by_role
      order by provider_role
    `,
    [id],
  );
  return result.rows;
}

const RESIDENCE_PERIOD_SUMMARY_COLS =
  "id, org_id, case_id, customer_id, visa_type, status_of_residence, period_years, period_label, valid_from, valid_until, card_number, is_current, entry_date, reminder_created, notes, created_by, created_at, updated_at";

async function queryCurrentResidencePeriod(
  tenantDb: TenantDb,
  caseId: string,
): Promise<CaseResidencePeriodSummary | null> {
  const result = await tenantDb.query<Record<string, unknown>>(
    `
      select ${RESIDENCE_PERIOD_SUMMARY_COLS}
      from residence_periods
      where case_id = $1 and is_current = true
      order by valid_until desc
      limit 1
    `,
    [caseId],
  );
  const row = result.rows.at(0);
  if (!row) return null;
  const period = mapResidencePeriodRow(row as never);
  return toResidencePeriodSummary(period);
}

function deriveBillingSummary(caseEntity: Case): CaseBillingSummary {
  return {
    quotePrice: caseEntity.quotePrice,
    depositPaid: caseEntity.depositPaidCached,
    finalPaymentPaid: caseEntity.finalPaymentPaidCached,
    unpaidAmount: caseEntity.billingUnpaidAmountCached,
    billingRiskAcknowledged: caseEntity.billingRiskAcknowledgedBy !== null,
    billingRiskAcknowledgedAt: caseEntity.billingRiskAcknowledgedAt ?? null,
    billingRiskAckReasonCode: caseEntity.billingRiskAckReasonCode ?? null,
  };
}

function deriveDeepLink(
  caseEntity: Case,
  caseRow: CaseListSummaryRow,
): CaseDeepLinkContext {
  return {
    customerId: caseEntity.customerId,
    customerName: caseRow.customer_name ?? "",
    groupId: caseEntity.groupId,
    groupName: caseRow.group_name,
    ownerUserId: caseEntity.ownerUserId,
    ownerDisplayName: caseRow.owner_display_name ?? "",
    assistantUserId: caseEntity.assistantUserId,
    assistantDisplayName: caseRow.assistant_display_name,
  };
}

/** @param current 当前案件 @param toStepCode 目标步骤编码 @returns 已校验的 BMV 步骤 */
function validateWorkflowStepTransitionTarget(
  current: Case,
  toStepCode: string,
): BmvWorkflowStep {
  if (current.caseTypeCode !== BMV_CASE_TYPE) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_NOT_APPLICABLE +
        ": Workflow step transitions are only available for BMV cases",
    );
  }
  if (!isBmvWorkflowStep(toStepCode)) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID +
        `: Invalid target step code: ${toStepCode}`,
    );
  }
  const fromStepCode = current.currentWorkflowStepCode;
  if (fromStepCode !== null) {
    if (!isBmvWorkflowStep(fromStepCode)) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID +
          `: Current step code is invalid: ${fromStepCode}`,
      );
    }
    if (!isValidStepTransition(fromStepCode, toStepCode)) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_TRANSITION_INVALID +
          `: Transition from ${fromStepCode} to ${toStepCode} is not allowed`,
      );
    }
  }
  const currentStage = current.stage ?? current.status;
  const boundary = checkParallelBoundary(toStepCode, currentStage);
  if (!boundary.compatible) {
    throw new BadRequestException(
      CASE_WRITE_ERROR_CODES.WORKFLOW_STEP_PARALLEL_BOUNDARY +
        `: ${boundary.reason ?? "Parallel boundary violated"}`,
    );
  }
  return toStepCode;
}

const OVERSEAS_STEP_CODE_SET: ReadonlySet<string> = new Set(
  Object.values(OVERSEAS_STEP_CODES),
);

/**
 *
 */
export function isOverseasStepCode(code: string): code is OverseasStepCode {
  return OVERSEAS_STEP_CODE_SET.has(code);
}

type OverseasStepEffects = {
  stampCoeSent: boolean;
  stampOverseasVisa: boolean;
  stampEntryConfirmed: boolean;
  resultOutcome: string | null;
};

/**
 * 解析海外返签步骤流转的附加副作用（自动打戳 + 结果态收敛）。
 *
 * - COE_SENT → stamp coe_sent_at（首次写入）
 * - VISA_APPLYING → stamp overseas_visa_start_at（首次写入）
 * - ENTRY_SUCCESS → stamp entry_confirmed_at（首次写入）
 * - VISA_REJECTED → set result_outcome = 'rejected'
 */
export function resolveOverseasStepEffects(
  current: Case,
  toStepCode: string,
): OverseasStepEffects {
  return {
    stampCoeSent:
      toStepCode === OVERSEAS_STEP_CODES.COE_SENT && !current.coeSentAt,
    stampOverseasVisa:
      toStepCode === OVERSEAS_STEP_CODES.VISA_APPLYING &&
      !current.overseasVisaStartAt,
    stampEntryConfirmed:
      toStepCode === OVERSEAS_STEP_CODES.ENTRY_SUCCESS &&
      !current.entryConfirmedAt,
    resultOutcome:
      toStepCode === OVERSEAS_STEP_CODES.VISA_REJECTED ? "rejected" : null,
  };
}

type PhaseStampEffects = {
  stampCoeSent: boolean;
  stampOverseasVisa: boolean;
  stampEntryConfirmed: boolean;
};

/**
 * 解析 businessPhase 推进时应附带的时间戳副作用（首次进入才打戳）。
 *
 * - COE_SENT → stamp coe_sent_at
 * - VISA_APPLYING → stamp overseas_visa_start_at
 * - SUCCESS → stamp entry_confirmed_at
 *
 * 与 `resolveOverseasStepEffects` 共享语义但作用于业务维度 phase 推进通路；
 * 二者各司其职：workflow_step 维度在 `transitionWorkflowStep` 内打戳，
 * businessPhase 维度在 `transitionPhase` 内打戳。
 *
 * @param current 当前 case
 * @param toPhase 目标 phase（已经过合法性校验）
 * @returns 三个 stamping 标志的布尔组合
 * @see BUG-098
 */
export function resolvePhaseStampEffects(
  current: Case,
  toPhase: string,
): PhaseStampEffects {
  return {
    stampCoeSent: toPhase === "COE_SENT" && !current.coeSentAt,
    stampOverseasVisa:
      toPhase === "VISA_APPLYING" && !current.overseasVisaStartAt,
    stampEntryConfirmed: toPhase === "SUCCESS" && !current.entryConfirmedAt,
  };
}

/**
 * 判断 businessPhase 推进是否应递增 `supplement_count`。
 *
 * 业务规范：补资料循环以「重新进入 NEED_SUPPLEMENT」为一次循环计次。
 * 仅当来源为 UNDER_REVIEW、目标为 NEED_SUPPLEMENT 时计为新一轮补资料。
 * `supplement_count_cached` 仅作快速读取缓存，真相源仍为 SubmissionPackage 数量。
 *
 * @param fromPhase 当前 phase
 * @param toPhase 目标 phase
 * @returns 是否应将 supplement_count + 1
 * @see BUG-099
 */
export function shouldIncrementSupplementCount(
  fromPhase: string,
  toPhase: string,
): boolean {
  return fromPhase === "UNDER_REVIEW" && toPhase === "NEED_SUPPLEMENT";
}

/**
 * 终态 phase → S9 映射。非终态返回 null（stage 不动）。
 */
export function mapPhaseToTerminalStage(phase: string): string | null {
  if (phase === "CLOSED_SUCCESS" || phase === "CLOSED_FAILED") return "S9";
  return null;
}

type PhaseTransitionSideEffects = {
  stamps: PhaseStampEffects;
  incrementSupplement: boolean;
  closeReason: string | null;
  resultOutcome: string | null;
};

function buildPhaseTransitionTimelinePayload(
  fromPhase: string,
  toPhase: string,
  updated: Case,
  effects: PhaseTransitionSideEffects,
): Record<string, unknown> {
  const { stamps, incrementSupplement } = effects;
  return {
    from: fromPhase,
    to: toPhase,
    coeSentAt: stamps.stampCoeSent ? updated.coeSentAt : null,
    overseasVisaStartAt: stamps.stampOverseasVisa
      ? updated.overseasVisaStartAt
      : null,
    entryConfirmedAt: stamps.stampEntryConfirmed
      ? updated.entryConfirmedAt
      : null,
    ...(incrementSupplement
      ? { supplementCount: updated.supplementCount }
      : {}),
    ...(effects.closeReason !== null
      ? { closeReason: effects.closeReason }
      : {}),
    ...(effects.resultOutcome !== null
      ? { resultOutcome: effects.resultOutcome }
      : {}),
  };
}

function settledValueOrUndefined<T>(
  result: PromiseSettledResult<T>,
): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}

function settledValueOrDefault<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

const AGGREGATE_SUB_QUERY_LABELS = [
  "counts",
  "latestValidation",
  "latestSubmission",
  "latestReview",
  "docProgress",
  "currentResidencePeriod",
] as const;

function logSettledErrors(
  results: PromiseSettledResult<unknown>[],
  caseId: string,
): void {
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const msg =
        r.reason instanceof Error ? r.reason.message : String(r.reason);
      // eslint-disable-next-line no-console
      console.error(
        `[CasesService.getDetailAggregate] sub-query "${AGGREGATE_SUB_QUERY_LABELS[i]}" failed for case ${caseId}: ${msg}`,
      );
    }
  }
}

/** 案件服务，提供案件 CRUD、状态变更与软删除能力。 */
@Injectable()
export class CasesService {
  /**
   * @param pool 连接池
   * @param templatesResolver 模板解析服务
   * @param permissionsService 权限判定服务
   * @param billingPlansService 收费计划服务
   * @param paymentRecordsService 回款记录服务
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
  ) {}

  /** 创建案件（事务内：写入 + document_items + Timeline + 跨组留痕）。
   * @param input
   * @param ctx 请求上下文 @param input 创建参数 @returns Case 实体 */
  async create(ctx: RequestContext, input: CaseCreateInput): Promise<Case> {
    try {
      validateDueAt(input.dueAt);
      validateCaseEnums(input);
      const checklistItems = await this.resolveChecklistItems(
        ctx,
        input.caseTypeCode,
      );
      const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

      return await tenantDb.transaction(async (tx) => {
        await this.assertCreateRefs(tx, input);
        const { resolvedGroupId, isCrossGroup, customerGroupId } =
          await this.resolveCreateGroup(tx, ctx, input);

        const created = await this.insertCaseWithAutoNumber(tx, ctx, {
          ...input,
          groupId: resolvedGroupId,
        });
        await this.insertDocumentItems(
          tx,
          ctx.orgId,
          created.id,
          checklistItems,
        );
        await writeTimelineInTx(tx, ctx, {
          entityType: "case",
          entityId: created.id,
          action: "case.created",
          payload: {
            caseTypeCode: created.caseTypeCode,
            stage: created.stage,
            status: created.status,
          },
        });

        if (isCrossGroup) {
          await writeCrossGroupTimeline(
            tx,
            ctx,
            created.id,
            customerGroupId,
            resolvedGroupId,
            input.crossGroupReason,
          );
        }

        return created;
      });
    } catch (error) {
      CasesService.wrapCreateError(error, input);
    }
  }

  private static wrapCreateError(
    error: unknown,
    input: CaseCreateInput,
  ): never {
    if (error instanceof HttpException) throw error;

    const pgCode = (error as { code?: string }).code;
    const PG_KNOWN_CONSTRAINTS = ["23503", "23505", "23514"];
    if (pgCode && PG_KNOWN_CONSTRAINTS.includes(pgCode)) {
      throw new BadRequestException({
        code: CASE_WRITE_ERROR_CODES.CREATE_FAILED,
        detail: {
          source: "pg",
          constraint: (error as { constraint?: string }).constraint ?? null,
          pgCode,
        },
        message: `Failed to create case: ${pgCode === "23503" ? "foreign key violation" : pgCode === "23505" ? "unique constraint violation" : "check constraint violation"}`,
      });
    }

    const errMsg = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.error(
      `[CasesService.create] unexpected error for customer=${input.customerId} caseType=${input.caseTypeCode}:`,
      error,
    );
    throw new InternalServerErrorException({
      code: CASE_WRITE_ERROR_CODES.CREATE_FAILED,
      detail: errMsg,
      message: "Failed to create case",
    });
  }

  private async assertCreateRefs(
    tx: TenantDbTx,
    input: CaseCreateInput,
  ): Promise<void> {
    await this.assertBelongsToOrg(tx, "customers", input.customerId);
    await this.assertBelongsToOrg(tx, "users", input.ownerUserId);
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (input.companyId) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      await this.assertBelongsToOrg(tx, "companies", input.companyId);
    }
    if (input.assistantUserId) {
      await this.assertBelongsToOrg(tx, "users", input.assistantUserId);
    }

    if (requiresBmvCaseCreationGate(input.caseTypeCode)) {
      await this.assertBmvCaseCreationGate(tx, input);
    }
  }

  private async assertBmvCaseCreationGate(
    tx: TenantDbTx,
    input: CaseCreateInput,
  ): Promise<void> {
    const row = await tx.query<{ base_profile: unknown }>(
      `select base_profile from customers where id = $1 limit 1`,
      [input.customerId],
    );
    const baseProfile = normalizeObject(row.rows.at(0)?.base_profile);
    const bmvProfile = resolveCustomerBmvProfile(baseProfile);

    const gate = checkBmvCaseCreationGate({
      caseTypeCode: input.caseTypeCode,
      customerId: input.customerId,
      bmvQuestionnaireStatus: bmvProfile.questionnaireStatus,
      bmvQuoteStatus: bmvProfile.quoteStatus,
      bmvSignStatus: bmvProfile.signStatus,
      bmvIntakeStatus: bmvProfile.intakeStatus,
    });

    if (!gate.allowed) {
      throw new BadRequestException({
        code: CASE_WRITE_ERROR_CODES.BMV_GATE_BLOCKED,
        blockers: gate.blockers,
      });
    }
  }

  private async resolveCreateGroup(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: CaseCreateInput,
  ): Promise<{
    resolvedGroupId: string | null;
    isCrossGroup: boolean;
    customerGroupId: string | null;
  }> {
    const customerGroupId = await this.resolveCustomerGroupId(
      tx,
      input.customerId,
    );
    const explicitGroupId = await this.resolveExplicitGroupId(
      tx,
      ctx.orgId,
      input.groupId,
    );
    const resolvedGroupId = explicitGroupId ?? customerGroupId;
    const isCrossGroup =
      resolvedGroupId !== null &&
      customerGroupId !== null &&
      resolvedGroupId !== customerGroupId;

    if (isCrossGroup && !input.crossGroupReason?.trim()) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.CROSS_GROUP_REASON_REQUIRED +
          ": crossGroupReason is required when creating a case in a different group than the customer",
      );
    }
    return { resolvedGroupId, isCrossGroup, customerGroupId };
  }

  /**
   * 将显式 groupId 入参（UUID / slug / 显示名）规范化为 groups.id（UUID）。
   *
   * 兼容前端 admin 链路：建案向导 Step 3 的 `draft.group` 来自客户 DTO 的
   * `customer.group` 字段（即 `groups.name`），既可能是 catalog slug
   * （如 `tokyo-1`），也可能是真实 UUID。统一在 service 入口做归一化，
   * 避免 cases.group_id 列直接接收非 UUID 字符串导致 FK 违例 / 500。
   *
   * - 入参为空/null → 返回 null
   * - 入参为 UUID → 校验组织内是否存在；不存在抛 400
   * - 入参为非 UUID 字符串 → 按 `groups.name` 精确匹配；未命中抛 400
   */
  private async resolveExplicitGroupId(
    tx: TenantDbTx,
    orgId: string,
    raw: string | null | undefined,
  ): Promise<string | null> {
    if (raw === undefined || raw === null) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const result = await tx.query<{ id: string }>(
      `select id from groups
       where org_id = $1 and (id::text = $2 or name = $2)
       limit 1`,
      [orgId, trimmed],
    );
    const found = result.rows.at(0)?.id ?? null;
    if (!found) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.GROUP_NOT_FOUND +
          `: groupId "${trimmed}" does not match any active group in the organization`,
      );
    }
    return found;
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
    const summary = await this.aggregateCaseBillingSummaryFull(
      tenantDb,
      caseId,
    );

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

  private async aggregateCaseBillingSummaryFull(
    tenantDb: TenantDb,
    caseId: string,
  ): Promise<CaseBillingSummaryFull> {
    const result = await tenantDb.query<BillingSummaryAggRow>(
      `select
        c.quote_price,
        coalesce((select sum(amount_due) from billing_records where case_id = $1), 0) as total_due,
        coalesce((select sum(amount_received) from payment_records where case_id = $1 and record_status = 'valid'), 0) as total_received,
        (select count(*)::int from billing_records where case_id = $1) as plan_count,
        (select count(*)::int from payment_records where case_id = $1 and record_status = 'valid') as payment_count,
        (select count(*)::int from billing_records where case_id = $1 and status in ('due','partial','overdue') and due_date < now()::date) as overdue_plan_count,
        c.deposit_paid_cached,
        c.final_payment_paid_cached,
        c.billing_risk_acknowledged_by,
        c.billing_risk_acknowledged_at,
        c.billing_risk_ack_reason_code,
        c.billing_risk_ack_reason_note,
        c.billing_risk_ack_evidence_url
      from cases c
      where c.id = $1
        and coalesce(c.metadata->>'_status', '') is distinct from 'deleted'
      limit 1`,
      [caseId],
    );

    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Case not found");

    const totalDue = Number(row.total_due);
    const totalReceived = Number(row.total_received);

    const billingRiskAck: CaseBillingRiskAckRecord = {
      acknowledged: row.billing_risk_acknowledged_by !== null,
      acknowledgedAt: toTimestampStringOrNull(row.billing_risk_acknowledged_at),
      acknowledgedBy: row.billing_risk_acknowledged_by ?? null,
      acknowledgedByDisplayName: null,
      reasonCode: row.billing_risk_ack_reason_code ?? null,
      reasonNote: row.billing_risk_ack_reason_note ?? null,
      evidenceUrl: row.billing_risk_ack_evidence_url ?? null,
    };

    return {
      quotePrice: row.quote_price !== null ? Number(row.quote_price) : null,
      totalDue,
      totalReceived,
      unpaidAmount: Math.max(totalDue - totalReceived, 0),
      depositPaid: row.deposit_paid_cached,
      finalPaymentPaid: row.final_payment_paid_cached,
      billingRiskAck,
      planCount: Number(row.plan_count),
      paymentCount: Number(row.payment_count),
      overduePlanCount: Number(row.overdue_plan_count),
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

    const { whereClause, params } = buildCaseListFilterPrefixed(input, "cs.");

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from cases cs ${whereClause}`,
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

    return {
      case: caseEntity,
      counts: mapDetailCountsRow(counts),
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
      if (f.companyId)
        await this.assertBelongsToOrg(tx, "companies", f.companyId);
      if (f.assistantUserId)
        await this.assertBelongsToOrg(tx, "users", f.assistantUserId);
      const updated = await this.executeUpdateCase(tx, id, f);
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

    await this.validateTransition(
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
      const result = await tx.query<CaseQueryRow>(
        `update cases set stage = $2, status = $2, close_reason = coalesce($4, close_reason), business_phase = $5, updated_at = now()
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
      const updated = mapCaseRow(row);
      await tx.query(
        `insert into case_stage_history(org_id, case_id, from_stage, to_stage, changed_by)
         values ($1, $2, $3, $4, $5)`,
        [ctx.orgId, id, fromStage, toStage, ctx.userId],
      );
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.transitioned",
        payload: {
          from: fromStage,
          to: toStage,
          businessPhase: newPhase,
        },
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
          ctx.userId,
          input.reasonCode,
          input.reasonNote ?? null,
          input.evidenceUrl ?? null,
        ],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to acknowledge billing risk");
      const updated = mapCaseRow(row);
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
      await this.assertPostApprovalBillingGate(tx, current, input.stage);
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
        [id, JSON.stringify(nextMetadata), input.stage, stampVisa, stampEntry],
      );
      const row = result.rows.at(0);
      if (!row)
        throw new BadRequestException("Failed to update post-approval stage");
      const updated = mapCaseRow(row);
      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.post_approval_stage_changed",
        payload: { from: previousStage, to: input.stage },
      });
      return updated;
    });
  }

  private async assertPostApprovalBillingGate(
    tx: TenantDbTx,
    current: Case,
    nextStage: string,
  ): Promise<void> {
    if (nextStage !== "coe_sent") return;
    await this.runCoeSendBillingGate(tx, current);
  }

  private async runCoeSendBillingGate(
    tx: TenantDbTx,
    current: Case,
  ): Promise<void> {
    const hasPlans = await this.hasFinalPaymentBillingRecords(tx, current.id);
    if (!hasPlans) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.POST_APPROVAL_BILLING_BLOCKED +
          `: Final payment milestone is missing. ` +
          `Please create a final-payment billing record before sending COE.`,
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

  private async hasFinalPaymentBillingRecords(
    tx: TenantDbTx,
    caseId: string,
  ): Promise<boolean> {
    const result = await tx.query<Record<string, unknown>>(
      `select amount_due, status, milestone_name, gate_effect_mode
       from billing_records
       where case_id = $1 and (
         lower(milestone_name) like '%尾款%'
         or lower(milestone_name) like '%final%'
         or lower(milestone_name) like '%結果%'
       )
       limit 1`,
      [caseId],
    );
    return result.rows.length > 0;
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
      await this.assertWorkflowStepBillingGate(tx, current, toStepCode);
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
      const updated = mapCaseRow(row);

      await writeTimelineInTx(tx, ctx, {
        entityType: "case",
        entityId: updated.id,
        action: "case.workflow_step_transitioned",
        payload: { from: fromStepCode, to: toStepCode },
      });

      await this.writeOverseasStepTimeline(tx, ctx, updated, toStepCode);

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
    this.assertValidPhaseTransitionInput(fromPhase, toPhase);

    this.assertCloseReasonForFailedPhase(toPhase, input.closeReason);

    if (toPhase === "CLOSED_SUCCESS") {
      await this.assertClosedSuccessGate(ctx, id);
    }

    const effects = this.buildPhaseTransitionEffects(
      current,
      fromPhase,
      toPhase,
      input,
    );

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      await this.assertCoeSendBillingGate(tx, current, toPhase);
      const updated = await this.executePhaseTransitionUpdate(
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

  private assertCloseReasonForFailedPhase(
    toPhase: string,
    closeReason: string | null | undefined,
  ): void {
    if (toPhase === "CLOSED_FAILED" && !closeReason) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.CLOSE_REASON_REQUIRED +
          ": closeReason is required when transitioning to CLOSED_FAILED",
      );
    }
  }

  private buildPhaseTransitionEffects(
    current: Case,
    fromPhase: string,
    toPhase: string,
    input: PhaseTransitionInput,
  ): PhaseTransitionSideEffects {
    const closeReason: string | null =
      toPhase === "CLOSED_FAILED" ? (input.closeReason ?? null) : null;
    const resultOutcome: string | null =
      toPhase === "CLOSED_SUCCESS"
        ? "success"
        : toPhase === "CLOSED_FAILED"
          ? (input.resultOutcome ?? "failure")
          : null;

    return {
      stamps: resolvePhaseStampEffects(current, toPhase),
      incrementSupplement: shouldIncrementSupplementCount(fromPhase, toPhase),
      closeReason,
      resultOutcome,
    };
  }

  private assertValidPhaseTransitionInput(
    fromPhase: string,
    toPhase: string,
  ): void {
    if (!isBusinessPhase(toPhase)) {
      throw new BadRequestException(`Invalid target phase: ${toPhase}`);
    }
    try {
      assertPhaseTransition(fromPhase, toPhase);
    } catch (e) {
      if (e instanceof PhaseTransitionError) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }
  }

  private async executePhaseTransitionUpdate(
    tx: TenantDbTx,
    id: string,
    fromPhase: string,
    toPhase: string,
    effects: PhaseTransitionSideEffects,
  ): Promise<Case> {
    const result = await tx.query<CaseQueryRow>(
      `update cases
         set business_phase = $2,
             stage = case
               when $2 in ('CLOSED_SUCCESS','CLOSED_FAILED') then 'S9'
               else stage
             end,
             close_reason = case when $2 = 'CLOSED_FAILED' then $7 else close_reason end,
             result_outcome = case
               when $2 = 'CLOSED_SUCCESS' then 'success'
               when $2 = 'CLOSED_FAILED' then coalesce($8, 'failure')
               else result_outcome
             end,
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
   * businessPhase 维度推进到 COE_SENT 时的尾款守卫。
   *
   * 触发条件：仅当 toPhase === COE_SENT 时执行；其他 phase 立即放行。
   */
  private async assertCoeSendBillingGate(
    tx: TenantDbTx,
    current: Case,
    toPhase: string,
  ): Promise<void> {
    if (toPhase !== "COE_SENT") return;
    await this.runCoeSendBillingGate(tx, current);
  }

  private async assertClosedSuccessGate(
    ctx: RequestContext,
    caseId: string,
  ): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const rp = await queryCurrentResidencePeriod(tenantDb, caseId);

    if (!rp) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED +
          ": CLOSED_SUCCESS requires a current residence period record",
      );
    }

    if (!rp.reminderCreated) {
      throw new BadRequestException(
        CASE_WRITE_ERROR_CODES.SUCCESS_CLOSEOUT_BLOCKED +
          ": CLOSED_SUCCESS requires reminderCreated=true on the current residence period",
      );
    }
  }

  /**
   * 海外返签步骤流转后的额外时间线写入。
   *
   * - ENTRY_SUCCESS → case.overseas_entry_confirmed
   * - VISA_REJECTED → case.overseas_visa_rejected
   */
  private async writeOverseasStepTimeline(
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

  /** 子步骤收费门禁检查 — block 与 warn 双路径对齐 decideFinalPaymentGuard。 */
  private async assertWorkflowStepBillingGate(
    tx: TenantDbTx,
    current: Case,
    toStepCode: BmvWorkflowStep,
  ): Promise<void> {
    const blueprintItem = BMV_STEP_LOOKUP.get(toStepCode);
    if (
      !blueprintItem?.billingGate ||
      blueprintItem.billingGate.mode === "off"
    ) {
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

  /**
   * 预解析 `document_checklist` 模板配置。
   * @param ctx 请求上下文。
   * @param caseTypeCode 案件类型编码。
   * @returns checklist 项目数组；legacy/无模板时返回空数组。
   */
  private async resolveChecklistItems(
    ctx: RequestContext,
    caseTypeCode: string,
  ): Promise<ChecklistItem[]> {
    const resolved = await this.templatesResolver.resolve(ctx, {
      kind: "document_checklist",
      key: caseTypeCode,
    });
    if (resolved.mode !== "template" || !resolved.used) return [];

    const rawItems = Array.isArray(resolved.config.items)
      ? (resolved.config.items as Record<string, unknown>[])
      : Array.isArray(resolved.config.requirementBlueprint)
        ? (resolved.config.requirementBlueprint as Record<string, unknown>[])
        : [];

    return rawItems.map((item) => {
      const code =
        typeof item.code === "string"
          ? item.code
          : typeof item.itemCode === "string"
            ? item.itemCode
            : typeof item.checklistItemCode === "string"
              ? item.checklistItemCode
              : "";

      return {
        code,
        name: typeof item.name === "string" ? item.name : "",
        ownerSide:
          typeof item.ownerSide === "string" ? item.ownerSide : "applicant",
        category: typeof item.category === "string" ? item.category : null,
        requiredFlag:
          typeof item.requiredFlag === "boolean" ? item.requiredFlag : false,
        providedByRole:
          typeof item.providedByRole === "string" ? item.providedByRole : null,
      };
    });
  }

  /** 校验 state_flow 模板允许的状态变更。
   * @param c
   * @param from
   * @param to
   * @param ctx 请求上下文 @param c 当前案件 @param from 原状态 @param to 目标状态 */
  private async validateTransition(
    ctx: RequestContext,
    c: Case,
    from: string,
    to: string,
    closeReason?: string | null,
  ): Promise<void> {
    const resolved = await this.templatesResolver.resolve(ctx, {
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
      await this.validateTransitionGate(ctx, c, from, to, closeReason);
      return;
    }

    const allowed = DEFAULT_CASE_TRANSITIONS[from] as string[] | undefined;
    if (!allowed?.includes(to)) {
      throw new BadRequestException(
        `Transition from '${from}' to '${to}' is not allowed`,
      );
    }

    await this.validateTransitionGate(ctx, c, from, to, closeReason);
  }

  private async validateTransitionGate(
    ctx: RequestContext,
    c: Case,
    from: string,
    to: string,
    closeReason?: string | null,
  ): Promise<void> {
    if (from === "S3" && to === "S4") {
      await this.validateReadyForDocumentPreparation(ctx, c);
      return;
    }

    if (from === "S4" && to === "S5") {
      await this.validateReadyForInternalReview(ctx, c);
      return;
    }

    if (from === "S5" && to === "S6") {
      await this.validateReadyForSubmission(ctx, c);
      return;
    }

    if (from === "S6" && to === "S7") {
      await this.validateGateC(ctx, c);
      return;
    }

    if (from === "S8" && to === "S9") {
      await this.validateSuccessCloseout(ctx, c, closeReason);
      return;
    }
  }

  private async validateReadyForDocumentPreparation(
    ctx: RequestContext,
    c: Case,
  ): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
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
   */
  private async validateReadyForInternalReview(
    ctx: RequestContext,
    c: Case,
  ): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
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

  private async getLatestValidationRun(
    tenantDb: TenantDb,
    orgId: string,
    caseId: string,
  ): Promise<
    { id: string; result_status: string; executed_at: unknown } | undefined
  > {
    const validationRunResult = await tenantDb.query<{
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

    return validationRunResult.rows.at(0);
  }

  private async getLatestReviewRecord(
    tenantDb: TenantDb,
    orgId: string,
    caseId: string,
    validationRunId: string,
  ): Promise<{ id: string; decision: string } | undefined> {
    const reviewResult = await tenantDb.query<{ id: string; decision: string }>(
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

    return reviewResult.rows.at(0);
  }

  /**
   * S5→S6：最新 ValidationRun 必须 passed 且未过期（non-stale），
   * 若模板启用复核则还需 ReviewRecord=approved。
   */
  private async validateReadyForSubmission(
    ctx: RequestContext,
    c: Case,
  ): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await this.assertLatestValidationRunPassed(tenantDb, ctx, c, "S5", "S6");
  }

  /**
   * Gate-C（S6→S7）：生成 SubmissionPackage 前校验。
   * - 最新 ValidationRun 必须 passed 且 non-stale
   * - 模板启用复核时 ReviewRecord=approved
   * - 存在欠款余额时必须已完成风险确认
   */
  private async validateGateC(ctx: RequestContext, c: Case): Promise<void> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await this.assertLatestValidationRunPassed(tenantDb, ctx, c, "S6", "S7");

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
   */
  private async validateSuccessCloseout(
    ctx: RequestContext,
    c: Case,
    closeReason?: string | null,
  ): Promise<void> {
    if (!requiresSuccessCloseoutCheck(c)) return;

    if (canBypassSuccessCloseoutForFailure(c, closeReason)) return;

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
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

  /**
   * 校验最新 ValidationRun=passed 且 non-stale，以及复核（如启用）。
   * S5→S6 和 Gate-C 共用此逻辑。
   */
  private async assertLatestValidationRunPassed(
    tenantDb: TenantDb,
    ctx: RequestContext,
    c: Case,
    fromLabel: string,
    toLabel: string,
  ): Promise<void> {
    const label = `${fromLabel}→${toLabel}`;
    const latestVR = await this.getLatestValidationRun(
      tenantDb,
      ctx.orgId,
      c.id,
    );
    if (!latestVR) {
      throw new BadRequestException(
        `${label} requires a passed validation run`,
      );
    }
    if (latestVR.result_status !== "passed") {
      throw new BadRequestException(
        `${label} requires the latest validation run to be passed`,
      );
    }

    const stale = await this.isValidationRunStale(
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

    if (!(await this.isReviewRequired(ctx, c))) return;

    const latestReview = await this.getLatestReviewRecord(
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

  /**
   * 判断最新 ValidationRun 是否已过期（stale）。
   *
   * 失效条件（对齐 P0 权威基线 §2.5）：
   * 1. 任一必交资料项在 VR 执行后 updated
   * 2. 任一 CaseParty 在 VR 执行后 updated
   */
  private async isValidationRunStale(
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

  private async isReviewRequired(
    ctx: RequestContext,
    c: Case,
  ): Promise<boolean> {
    const resolved = await this.templatesResolver.resolve(ctx, {
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

  /** 插入 Case 主表行。
   * @param ctx
   * @param input
   * @param tx 事务连接 @param ctx 请求上下文 @param input 创建参数 @returns Case 实体 */
  private async insertCase(
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

  private async insertCaseWithAutoNumber(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: CaseCreateInput,
  ): Promise<Case> {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const caseNo = await this.generateCaseNo(tx, ctx.orgId);
      try {
        return await this.insertCase(tx, ctx, { ...input, caseNo });
      } catch (error) {
        if (attempt === 0 && isCaseNoConflict(error)) continue;
        throw error;
      }
    }
    throw new BadRequestException("Failed to create case");
  }

  private async generateCaseNo(tx: TenantDbTx, orgId: string): Promise<string> {
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

  /** 执行 Case 更新 SQL 并返回更新后的 Case。 */
  private async executeUpdateCase(
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

  /** 批量插入 document_items。
   * @param orgId
   * @param caseId
   * @param items
   * @param tx 事务连接 @param orgId 组织 ID @param caseId 案件 ID @param items 项目列表 */
  private async insertDocumentItems(
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

  /**
   * 从 Customer.base_profile 中解析 group_id，再查 groups 表确认有效性。
   *
   * 接受两种存储形态以兼容历史数据与新建路径（BUG-159）：
   * - `groups.name = base_profile->>'group_id'/'groupId'/'group'`（slug / 显示名）
   * - `groups.id::text = base_profile->>'group_id'/'groupId'/'group'`（migration 034
   *   将 group_id UUID 字面回填到 baseProfile 的场景）
   *
   * 若 customer 未关联 group 或 group 不存在于 groups 表，返回 null。
   */
  private async resolveCustomerGroupId(
    tx: TenantDbTx,
    customerId: string,
  ): Promise<string | null> {
    const result = await tx.query<{ group_id: string }>(
      `SELECT g.id AS group_id
       FROM customers c
       CROSS JOIN LATERAL (
         SELECT coalesce(
           nullif(trim(c.base_profile->>'group_id'), ''),
           nullif(trim(c.base_profile->>'groupId'), ''),
           nullif(trim(c.base_profile->>'group'), '')
         ) AS group_val
       ) cv
       JOIN groups g ON g.org_id = c.org_id
         AND (g.name = cv.group_val OR g.id::text = cv.group_val)
       WHERE c.id = $1
       LIMIT 1`,
      [customerId],
    );
    return result.rows.at(0)?.group_id ?? null;
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

  /** 允许 assertBelongsToOrg 使用的表名白名单。 */
  private static readonly ALLOWED_ASSERT_TABLES = new Set([
    "customers",
    "users",
    "companies",
  ]);

  /** 断言记录属于当前 org（RLS 过滤 + 表名白名单防注入）。
   * @param table
   * @param id
   * @param tx 事务连接 @param table 表名 @param id 记录 ID */
  private async assertBelongsToOrg(
    tx: TenantDbTx,
    table: string,
    id: string,
  ): Promise<void> {
    if (!CasesService.ALLOWED_ASSERT_TABLES.has(table)) {
      throw new Error(`assertBelongsToOrg: disallowed table "${table}"`);
    }
    const r = await tx.query<{ id: string }>(
      `select id from ${table} where id = $1 limit 1`,
      [id],
    );
    if (r.rows.length === 0)
      throw new BadRequestException(
        `Referenced ${table} record not found in current organization`,
      );
  }
}

type ChecklistItem = {
  code: string;
  name: string;
  ownerSide?: string;
  category?: string | null;
  requiredFlag?: boolean;
  providedByRole?: string | null;
};

type TimelineInput = {
  entityType: string;
  entityId: string;
  action: string;
  payload: Record<string, unknown>;
};

/** 事务内写入 Timeline 记录。
 * @param ctx
 * @param input
 * @param tx 事务连接 @param ctx 请求上下文 @param input timeline 内容 */
async function writeTimelineInTx(
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

async function writeCrossGroupTimeline(
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

/** 校验 dueAt 日期合法性。
 * @param dueAt 到期日期 */
function validateDueAt(dueAt: string | null | undefined): void {
  if (!dueAt) return;
  if (isNaN(new Date(dueAt).getTime()))
    throw new BadRequestException("Invalid dueAt date");
}
