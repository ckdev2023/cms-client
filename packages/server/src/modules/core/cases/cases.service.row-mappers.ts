/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * cases 行 → DTO 映射函数集合。
 *
 * 拆分自 `cases.service.ts`（BUG-N/A: 文件超长重构）。
 * 与生产 SQL（`cases.service.sql.ts`）共同维护，避免列漂移。
 */
import type { Case } from "../model/coreEntities";
import { normalizeObject } from "../../../infra/utils/normalize";
import type {
  CaseListItemDto,
  CaseDetailCounts,
  CaseLatestValidationSummary,
  CaseLatestSubmissionSummary,
  CaseLatestReviewSummary,
  CaseDocumentProgressByProvider,
} from "./cases.types";

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
  jurisdiction_authority: string | null;
  business_phase: string;
  current_workflow_step_code: string | null;
  created_at: unknown;
  updated_at: unknown;
};

/**
 *
 */
export type CaseListSummaryRow = CaseQueryRow & {
  customer_name: string | null;
  customer_name_zh: string | null;
  customer_name_ja: string | null;
  customer_name_en: string | null;
  group_name: string | null;
  owner_display_name: string | null;
  assistant_display_name: string | null;
};

/**
 *
 */
export type BillingSummaryAggRow = {
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

/**
 *
 */
export type CaseDetailCountsRow = {
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

/**
 *
 */
export type LatestSubmissionRow = {
  id: string;
  submission_no: number | string;
  submission_kind: string;
  submitted_at: unknown;
  related_submission_id: string | null;
  authority_name: string | null;
};

/**
 *
 */
export type LatestReviewRow = {
  id: string;
  decision: string;
  reviewed_at: unknown;
  reviewer_user_id: string | null;
  reviewer_display_name: string | null;
};

/**
 *
 */
export type DocProgressByProviderRow = {
  provider_role: string;
  total: string;
  done: string;
};

/**
 *
 */
export type LatestValidationRow = {
  id: string;
  result_status: string;
  executed_at: unknown;
  blocking_count: number | string;
  warning_count: number | string;
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

/**
 *
 * @param value
 */
export function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

/**
 *
 * @param value
 */
export function toTimestampString(value: unknown): string {
  const s = toTimestampStringOrNull(value);
  if (!s) return "";
  return s;
}

function parseIntSafe(value: string | undefined): number {
  return parseInt(value ?? "0", 10) || 0;
}

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

/**
 * P0 新增字段の DB 行 → エンティティ変換。
 * @param row
 */
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
    jurisdictionAuthority: row.jurisdiction_authority ?? null,
    businessPhase: row.business_phase,
    currentWorkflowStepCode: row.current_workflow_step_code ?? null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

/**
 *
 * @param row
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

/**
 *
 * @param row
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

/**
 *
 * @param row
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
    authorityName: row.authority_name ?? null,
  };
}

/**
 *
 * @param row
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

/**
 *
 * @param rows
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

/**
 *
 * @param row
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
