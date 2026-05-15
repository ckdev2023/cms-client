import { BadRequestException } from "@nestjs/common";

import type { PaymentMethod, PaymentRecord } from "../model/coreEntities";

export { writeTimelineInTx, type TimelineInput } from "./timelineHelpers";

// ─── List 路径：类型、常量、WHERE 构建 ────────────────────────

/** recordStatus 过滤值：valid/voided/reversed 单选或 all 全量。 */
export type PaymentRecordListRecordStatus =
  | "valid"
  | "voided"
  | "reversed"
  | "all";

/** Input for listing payment records (org-wide, all filters optional). */
export type PaymentRecordListInput = {
  billingPlanId?: string;
  caseId?: string;
  recordStatus?: PaymentRecordListRecordStatus;
  q?: string;
  from?: string;
  to?: string;
  groupId?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
};

export const PAYMENT_RECORD_LIST_COLS = `pr.id, pr.org_id, pr.billing_record_id, pr.case_id, pr.amount_received,
  pr.received_at, pr.payment_method, pr.record_status,
  pr.receipt_storage_type, pr.receipt_relative_path_or_key,
  pr.note, pr.void_reason_code, pr.void_reason_note,
  pr.voided_by, pr.voided_at, pr.reversed_from_payment_record_id,
  pr.recorded_by, pr.created_at,
  br.milestone_name,
  c.case_name, c.case_no,
  recorded_user.name as recorded_by_display_name,
  voided_user.name as voided_by_display_name`;

export const PAYMENT_RECORD_LIST_FROM = `payment_records pr
  join billing_records br on br.id = pr.billing_record_id
  join cases c
    on c.id = pr.case_id
    and coalesce(c.metadata->>'_status', '') is distinct from 'deleted'
  left join customers cu on cu.id = c.customer_id
  left join users recorded_user on recorded_user.id = pr.recorded_by
  left join users voided_user on voided_user.id = pr.voided_by`;

function pushFilter(
  where: string[],
  params: unknown[],
  value: unknown,
  expr: (idx: string) => string,
): void {
  if (value === undefined || value === null) return;
  params.push(value);
  where.push(expr(`$${String(params.length)}`));
}

/**
 * 动态构建 payment_records list 查询的 WHERE 子句。
 *
 * @param orgId - 租户 org ID
 * @param input - 过滤条件
 * @returns whereClause 与参数数组
 */
export function buildPaymentRecordListWhere(
  orgId: string,
  input: PaymentRecordListInput,
): { whereClause: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  params.push(orgId);
  where.push(`pr.org_id = $${String(params.length)}`);

  pushFilter(
    where,
    params,
    input.billingPlanId,
    (i) => `pr.billing_record_id = ${i}`,
  );
  pushFilter(where, params, input.caseId, (i) => `pr.case_id = ${i}`);

  const status = input.recordStatus ?? "valid";
  if (status !== "all") {
    pushFilter(where, params, status, (i) => `pr.record_status = ${i}`);
  }

  pushFilter(where, params, input.groupId, (i) => `c.group_id = ${i}`);
  pushFilter(where, params, input.ownerId, (i) => `c.owner_user_id = ${i}`);
  pushFilter(where, params, input.from, (i) => `pr.received_at >= ${i}`);
  pushFilter(where, params, input.to, (i) => `pr.received_at <= ${i}`);

  if (input.q) {
    params.push(input.q);
    const qi = `$${String(params.length)}`;
    where.push(
      `(lower(c.case_no) like '%' || lower(${qi}) || '%'` +
        ` or lower(c.case_name) like '%' || lower(${qi}) || '%'` +
        ` or lower(cu.base_profile->>'displayName') like '%' || lower(${qi}) || '%'` +
        ` or lower(br.milestone_name) like '%' || lower(${qi}) || '%'` +
        ` or lower(pr.note) like '%' || lower(${qi}) || '%')`,
    );
  }
  return { whereClause: `where ${where.join(" and ")}`, params };
}

const VALID_PAYMENT_METHODS: ReadonlySet<string> = new Set([
  "bank_transfer",
  "cash",
  "credit_card",
  "other",
]);

/**
 * 回款金额正数校验。
 *
 * @param amountReceived - 回款金额
 */
export function validateAmountReceived(amountReceived: number): void {
  if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
    throw new BadRequestException("amountReceived must be greater than 0");
  }
}

/**
 * 回款日期 ISO 格式校验。
 *
 * @param receivedAt - 回款日期字符串
 */
export function validateReceivedAt(receivedAt: string): void {
  if (Number.isNaN(new Date(receivedAt).getTime())) {
    throw new BadRequestException("Invalid receivedAt");
  }
}

/**
 * 回款方式枚举校验。
 *
 * @param paymentMethod - 回款方式
 */
export function validatePaymentMethod(
  paymentMethod: PaymentMethod | null | undefined,
): void {
  if (paymentMethod === undefined || paymentMethod === null) return;
  if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
    throw new BadRequestException(
      `Invalid paymentMethod: ${paymentMethod}. Must be one of: ${[...VALID_PAYMENT_METHODS].join(", ")}`,
    );
  }
}

/**
 * 根据已收金额与应收金额推导收费计划状态。
 *
 * 当 amountDue ≤ 0（占位或未录入应收）时：无回款保持 due；
 * 已有回款则判为 paid，以便 `final_payment_paid_cached` / COE 门与实收对齐
 *（避免 status 长期停在 partial 导致尾款门禁死锁）。
 *
 * @param totalReceived - 累计有效回款
 * @param amountDue - 应收金额
 * @returns 新状态：paid / partial / due
 */
export function deriveBillingStatus(
  totalReceived: number,
  amountDue: number,
): string {
  if (amountDue <= 0) {
    if (totalReceived <= 0) return "due";
    return "paid";
  }
  if (totalReceived >= amountDue) return "paid";
  if (totalReceived > 0) return "partial";
  return "due";
}

/**
 * 构建回款 timeline payload。
 *
 * @param pr - 回款记录
 * @returns timeline payload 对象
 */
export function buildPaymentTimelinePayload(
  pr: PaymentRecord,
): Record<string, unknown> {
  return {
    billingPlanId: pr.billingPlanId,
    caseId: pr.caseId,
    amountReceived: pr.amountReceived,
    receivedAt: pr.receivedAt,
    paymentMethod: pr.paymentMethod,
    recordStatus: pr.recordStatus,
  };
}
