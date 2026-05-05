/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * 案件详情聚合所需的子查询与派生函数。
 *
 * 拆分自 `cases.service.ts`：
 * - case 主表 + summary 行查询
 * - counts / latest validation / latest submission / latest review / 文档进度
 * - residence_period 当前值查询
 * - case-level billing summary / deep-link 派生
 * - Promise.allSettled 子查询失败时的错误日志辅助
 */
import { BadRequestException, NotFoundException } from "@nestjs/common";

import type { CaseBillingSummary, CaseDeepLinkContext } from "./cases.types";
import { CASE_WRITE_ERROR_CODES } from "./cases.types";
import type { Case } from "../model/coreEntities";
import type { TenantDb } from "../tenancy/tenantDb";
import { mapResidencePeriodRow } from "../residence-periods/residencePeriods.service";
import {
  toResidencePeriodSummary,
  type CaseResidencePeriodSummary,
} from "./cases.types-residence-closeout";
import {
  CASE_COLS_PREFIXED,
  RESIDENCE_PERIOD_SUMMARY_COLS,
  SUMMARY_EXTRA_COLS,
  SUMMARY_JOINS,
} from "./cases.service.sql";
import {
  type BillingSummaryAggRow,
  type CaseDetailCountsRow,
  type CaseListSummaryRow,
  type DocProgressByProviderRow,
  type LatestReviewRow,
  type LatestSubmissionRow,
  type LatestValidationRow,
  toTimestampStringOrNull,
} from "./cases.service.row-mappers";
import type {
  CaseBillingRiskAckRecord,
  CaseBillingSummaryFull,
} from "./cases.types-billing";

/**
 *
 * @param tenantDb
 * @param id
 */
export async function queryDetailCaseRow(
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

/**
 *
 * @param tenantDb
 * @param id
 */
export async function queryDetailCounts(
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

/**
 *
 * @param tenantDb
 * @param id
 */
export async function queryLatestValidation(
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

/**
 *
 * @param tenantDb
 * @param id
 */
export async function queryLatestSubmission(
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

/**
 *
 * @param tenantDb
 * @param id
 */
export async function queryLatestReview(
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

/**
 *
 * @param tenantDb
 * @param id
 */
export async function queryDocProgressByProvider(
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

/**
 *
 * @param tenantDb
 * @param caseId
 */
export async function queryCurrentResidencePeriod(
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

/**
 * CLOSED_SUCCESS gate：必须存在当前 residence_period 且 reminderCreated=true。
 * @param tenantDb
 * @param caseId
 */
export async function assertClosedSuccessGate(
  tenantDb: TenantDb,
  caseId: string,
): Promise<void> {
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
 *
 * @param caseEntity
 */
/**
 * 案件 billing tab 用 summary — 单 SQL 实时聚合（不依赖缓存列）。
 * @param tenantDb
 * @param caseId
 */
export async function aggregateCaseBillingSummaryFull(
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

/**
 *
 * @param caseEntity
 */
export function deriveBillingSummary(caseEntity: Case): CaseBillingSummary {
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

/**
 *
 * @param caseEntity
 * @param caseRow
 */
export function deriveDeepLink(
  caseEntity: Case,
  caseRow: CaseListSummaryRow,
): CaseDeepLinkContext {
  return {
    customerId: caseEntity.customerId,
    customerName: caseRow.customer_name ?? "",
    customerNameZh: caseRow.customer_name_zh ?? "",
    customerNameJa: caseRow.customer_name_ja ?? "",
    customerNameEn: caseRow.customer_name_en ?? "",
    groupId: caseEntity.groupId,
    groupName: caseRow.group_name,
    ownerUserId: caseEntity.ownerUserId,
    ownerDisplayName: caseRow.owner_display_name ?? "",
    assistantUserId: caseEntity.assistantUserId,
    assistantDisplayName: caseRow.assistant_display_name,
  };
}

/**
 *
 * @param result
 */
export function settledValueOrUndefined<T>(
  result: PromiseSettledResult<T>,
): T | undefined {
  return result.status === "fulfilled" ? result.value : undefined;
}

/**
 *
 * @param result
 * @param fallback
 */
export function settledValueOrDefault<T>(
  result: PromiseSettledResult<T>,
  fallback: T,
): T {
  return result.status === "fulfilled" ? result.value : fallback;
}

export const AGGREGATE_SUB_QUERY_LABELS = [
  "counts",
  "latestValidation",
  "latestSubmission",
  "latestReview",
  "docProgress",
  "currentResidencePeriod",
] as const;

/**
 *
 * @param results
 * @param caseId
 */
export function logSettledErrors(
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
