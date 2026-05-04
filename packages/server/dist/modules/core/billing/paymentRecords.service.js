var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
            ? (desc = Object.getOwnPropertyDescriptor(target, key))
            : desc,
      d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return (c > 3 && r && Object.defineProperty(target, key, r), r);
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { hasRequiredRole } from "../auth/roles";
import { createTenantDb } from "../tenancy/tenantDb";
import { mapBillingPlanRow } from "./billingPlans.service";
import { syncBillingCacheForCase } from "./billingGuards";
import {
  buildPaymentRecordListWhere,
  buildPaymentTimelinePayload,
  deriveBillingStatus,
  PAYMENT_RECORD_LIST_COLS,
  PAYMENT_RECORD_LIST_FROM,
  validateAmountReceived,
  validatePaymentMethod,
  validateReceivedAt,
  writeTimelineInTx,
} from "./paymentRecordHelpers";
const PAYMENT_RECORD_COLS = `id, org_id, billing_record_id, case_id, amount_received, received_at, payment_method, record_status, receipt_storage_type, receipt_relative_path_or_key, note, void_reason_code, void_reason_note, voided_by, voided_at, reversed_from_payment_record_id, recorded_by, created_at`;
const BILLING_PLAN_COLS = `id, org_id, case_id, milestone_name, amount_due, due_date, status, gate_effect_mode, remark, created_at, updated_at`;
function toTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}
/**
 * Map a database row to a PaymentRecord entity.
 *
 * @param row - database row
 * @returns PaymentRecord entity
 */
export function mapPaymentRecordRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    billingPlanId: row.billing_record_id,
    caseId: row.case_id,
    amountReceived: Number(row.amount_received),
    receivedAt: toTimestampStringOrNull(row.received_at) ?? "",
    paymentMethod: row.payment_method ?? null,
    recordStatus: row.record_status,
    receiptStorageType: row.receipt_storage_type ?? null,
    receiptRelativePathOrKey: row.receipt_relative_path_or_key ?? null,
    note: row.note ?? null,
    voidReasonCode: row.void_reason_code ?? null,
    voidReasonNote: row.void_reason_note ?? null,
    voidedBy: row.voided_by ?? null,
    voidedAt: toTimestampStringOrNull(row.voided_at),
    reversedFromPaymentRecordId: row.reversed_from_payment_record_id ?? null,
    recordedBy: row.recorded_by,
    createdAt: toTimestampStringOrNull(row.created_at) ?? "",
  };
}
/**
 * list 路径专用 mapper — 输出 CasePaymentRecordDto（含 displayName + 扩展字段）。
 *
 * D10 复用语义：`recordStatus='reversed'` 时 `voidedByDisplayName` 表示冲正操作人。
 *
 * @param row - 聚合 join 行
 * @returns CasePaymentRecordDto
 */
export function mapPaymentRecordListRow(row) {
  const { orgId: _orgId, ...base } = mapPaymentRecordRow(row);
  void _orgId;
  return {
    ...base,
    voidedByDisplayName: row.voided_by_display_name ?? null,
    recordedByDisplayName: row.recorded_by_display_name ?? null,
    caseNo: row.case_no ?? null,
    caseName: row.case_name ?? null,
    milestoneName: row.milestone_name ?? null,
  };
}
/**
 * Service for PaymentRecord CRUD with P0 void/reverse support.
 */
let PaymentRecordsService = class PaymentRecordsService {
  pool;
  /**
   * Initialize payment records service.
   *
   * @param pool - PostgreSQL connection pool
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * Create a payment record (initial record_status = valid).
   *
   * @param ctx - request context
   * @param input - creation input
   * @returns created PaymentRecord
   */
  async create(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    validateAmountReceived(input.amountReceived);
    validateReceivedAt(input.receivedAt);
    validatePaymentMethod(input.paymentMethod);
    return tenantDb.transaction((tx) => this.createInTx(tx, ctx, input));
  }
  /**
   * Get a payment record by ID.
   *
   * @param ctx - request context
   * @param id - PaymentRecord ID
   * @returns PaymentRecord or null
   */
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `select ${PAYMENT_RECORD_COLS} from payment_records where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapPaymentRecordRow(row) : null;
  }
  /**
   * List payment records with pagination (org-wide, all filters optional).
   *
   * JOIN billing_records / cases / customers / users 以获取
   * caseName / caseNo / milestoneName / recordedByDisplayName / voidedByDisplayName。
   *
   * `recordStatus` 默认 `'valid'`；传 `'all'` 时返回三态全量。
   *
   * @param ctx - request context
   * @param input - list input
   * @returns paginated CasePaymentRecordDto list
   */
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const { whereClause, params } = buildPaymentRecordListWhere(
      ctx.orgId,
      input,
    );
    const countResult = await tenantDb.query(
      `select count(*) as count from ${PAYMENT_RECORD_LIST_FROM} ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);
    const listParams = [...params, limit, offset];
    const result = await tenantDb.query(
      `select ${PAYMENT_RECORD_LIST_COLS}
       from ${PAYMENT_RECORD_LIST_FROM}
       ${whereClause}
       order by pr.received_at desc, pr.created_at desc, pr.id desc
       limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );
    return { items: result.rows.map(mapPaymentRecordListRow), total };
  }
  /**
   * Void a payment record (P0: no physical delete, mark as voided).
   *
   * @param ctx - request context
   * @param id - PaymentRecord ID
   * @param input - void reason
   * @returns voided PaymentRecord
   */
  async void(ctx, id, input) {
    if (!hasRequiredRole(ctx.role, ["manager"])) {
      throw new ForbiddenException(
        "Voiding payment record requires manager role",
      );
    }
    if (!input.reasonCode || typeof input.reasonCode !== "string") {
      throw new BadRequestException("reasonCode is required for void");
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const pr = await this.getPaymentRecordForUpdate(tx, id);
      if (pr.recordStatus !== "valid") {
        throw new BadRequestException(
          `Only valid payment records can be voided (current: ${pr.recordStatus})`,
        );
      }
      const bp = await this.getBillingPlanForUpdate(tx, pr.billingPlanId);
      const result = await tx.query(
        `update payment_records
         set record_status = 'voided', void_reason_code = $2,
             void_reason_note = $3, voided_by = $4, voided_at = now()
         where id = $1
         returning ${PAYMENT_RECORD_COLS}`,
        [id, input.reasonCode, input.reasonNote ?? null, ctx.userId],
      );
      const row = result.rows.at(0);
      if (!row) throw new BadRequestException("Failed to void payment record");
      const voided = mapPaymentRecordRow(row);
      await writeTimelineInTx(tx, ctx, {
        entityType: "payment_record",
        entityId: voided.id,
        action: "payment_record.voided",
        payload: {
          ...buildPaymentTimelinePayload(voided),
          reasonCode: input.reasonCode,
        },
      });
      await this.recalculateBillingStatus(tx, ctx, bp, voided.id);
      await syncBillingCacheForCase(tx, bp.caseId);
      return voided;
    });
  }
  /**
   * Reverse a valid payment record (D1 方案 A：原地翻状态).
   *
   * 原地将 `record_status` 从 `'valid'` 翻为 `'reversed'`，不新增行、不引入负数金额。
   * 冲正信息复用 `void_reason_code / void_reason_note / voided_by / voided_at` 列承载——
   * 当 `recordStatus='reversed'` 时，`voidedBy` / `voidedAt` 表示冲正操作人/时间（D10 复用语义）。
   *
   * @param ctx - request context
   * @param id - PaymentRecord ID
   * @param input - reverse reason (reasonCode required)
   * @returns reversed PaymentRecord
   */
  async reverse(ctx, id, input) {
    if (!hasRequiredRole(ctx.role, ["manager"])) {
      throw new ForbiddenException(
        "Reversing payment record requires manager role",
      );
    }
    if (!input.reasonCode || typeof input.reasonCode !== "string") {
      throw new BadRequestException("reasonCode is required for reverse");
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction((tx) => this.reverseInTx(tx, ctx, id, input));
  }
  async reverseInTx(tx, ctx, id, input) {
    const pr = await this.getPaymentRecordForUpdate(tx, id);
    if (pr.recordStatus !== "valid") {
      throw new BadRequestException(
        `Only valid payment records can be reversed (current: ${pr.recordStatus})`,
      );
    }
    const bp = await this.getBillingPlanForUpdate(tx, pr.billingPlanId);
    const result = await tx.query(
      `update payment_records
       set record_status = 'reversed', void_reason_code = $2,
           void_reason_note = $3, voided_by = $4, voided_at = now()
       where id = $1
       returning ${PAYMENT_RECORD_COLS}`,
      [id, input.reasonCode, input.reasonNote ?? null, ctx.userId],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to reverse payment record");
    const reversed = mapPaymentRecordRow(row);
    await writeTimelineInTx(tx, ctx, {
      entityType: "payment_record",
      entityId: reversed.id,
      action: "payment_record.reversed",
      payload: {
        ...buildPaymentTimelinePayload(reversed),
        reasonCode: input.reasonCode,
      },
    });
    await this.recalculateBillingStatus(tx, ctx, bp, reversed.id);
    await syncBillingCacheForCase(tx, bp.caseId);
    return reversed;
  }
  async createInTx(tx, ctx, input) {
    const bp = await this.getBillingPlanForUpdate(tx, input.billingPlanId);
    const pr = await this.insertPaymentRecord(tx, ctx, bp, input);
    await writeTimelineInTx(tx, ctx, {
      entityType: "payment_record",
      entityId: pr.id,
      action: "payment_record.created",
      payload: buildPaymentTimelinePayload(pr),
    });
    await this.recalculateBillingStatus(tx, ctx, bp, pr.id);
    await syncBillingCacheForCase(tx, bp.caseId);
    return pr;
  }
  async insertPaymentRecord(tx, ctx, billingPlan, input) {
    const result = await tx.query(
      `insert into payment_records (
         org_id, billing_record_id, case_id, amount_received,
         received_at, payment_method, record_status, note, recorded_by
       ) values ($1, $2, $3, $4, $5, $6, 'valid', $7, $8)
       returning ${PAYMENT_RECORD_COLS}`,
      [
        ctx.orgId,
        billingPlan.id,
        billingPlan.caseId,
        input.amountReceived,
        input.receivedAt,
        input.paymentMethod ?? null,
        input.note ?? null,
        ctx.userId,
      ],
    );
    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create payment record");
    return mapPaymentRecordRow(row);
  }
  async getBillingPlanForUpdate(tx, id) {
    const result = await tx.query(
      `select ${BILLING_PLAN_COLS} from billing_records where id = $1 limit 1 for update`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        "Referenced billing plan not found in current organization",
      );
    }
    return mapBillingPlanRow(row);
  }
  async getPaymentRecordForUpdate(tx, id) {
    const result = await tx.query(
      `select ${PAYMENT_RECORD_COLS} from payment_records where id = $1 limit 1 for update`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Payment record not found");
    return mapPaymentRecordRow(row);
  }
  /**
   * Recalculate billing plan status from valid payment totals.
   *
   * @param tx - database transaction
   * @param ctx - request context
   * @param billingPlan - current billing plan
   * @param paymentRecordId - triggering payment record ID
   */
  async recalculateBillingStatus(tx, ctx, billingPlan, paymentRecordId) {
    const totalReceived = await this.getTotalValidReceived(tx, billingPlan.id);
    const nextStatus = deriveBillingStatus(
      totalReceived,
      billingPlan.amountDue,
    );
    if (nextStatus === billingPlan.status) return;
    await tx.query(
      `update billing_records set status = $2, updated_at = now() where id = $1`,
      [billingPlan.id, nextStatus],
    );
    await writeTimelineInTx(tx, ctx, {
      entityType: "billing_plan",
      entityId: billingPlan.id,
      action: "billing_plan.transitioned",
      payload: {
        from: billingPlan.status,
        to: nextStatus,
        paymentRecordId,
        totalReceived,
      },
    });
  }
  async getTotalValidReceived(tx, billingPlanId) {
    const result = await tx.query(
      `select coalesce(sum(amount_received), 0) as total_received
       from payment_records
       where billing_record_id = $1 and record_status = 'valid'`,
      [billingPlanId],
    );
    return Number(result.rows[0]?.total_received ?? 0);
  }
};
PaymentRecordsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  PaymentRecordsService,
);
export { PaymentRecordsService };
//# sourceMappingURL=paymentRecords.service.js.map
