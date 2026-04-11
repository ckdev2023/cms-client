import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import { hasRequiredRole } from "../auth/roles";
import type {
  BillingPlan,
  PaymentMethod,
  PaymentRecord,
  PaymentRecordStatus,
  TimelineAction,
  TimelineEntityType,
} from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import {
  mapBillingPlanRow,
  type BillingPlanQueryRow,
} from "./billingPlans.service";

/** Database row shape for payment_records (P0 aligned). */
export type PaymentRecordQueryRow = {
  id: string;
  org_id: string;
  billing_record_id: string;
  case_id: string;
  amount_received: string | number;
  received_at: unknown;
  payment_method: string | null;
  record_status: string;
  receipt_storage_type: string | null;
  receipt_relative_path_or_key: string | null;
  note: string | null;
  void_reason_code: string | null;
  void_reason_note: string | null;
  voided_by: string | null;
  voided_at: unknown;
  reversed_from_payment_record_id: string | null;
  recorded_by: string | null;
  created_at: unknown;
};

/** Input for creating a payment record. */
export type PaymentRecordCreateInput = {
  billingPlanId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod?: PaymentMethod | null;
  note?: string | null;
};

/** Input for listing payment records. */
export type PaymentRecordListInput = {
  billingPlanId?: string;
  caseId?: string;
  page?: number;
  limit?: number;
};

/** Input for voiding a payment record. */
export type PaymentRecordVoidInput = {
  reasonCode: string;
  reasonNote?: string | null;
};

type TimelineInput = {
  entityType: TimelineEntityType;
  entityId: string;
  action: TimelineAction;
  payload: Record<string, unknown>;
};

const PAYMENT_RECORD_COLS = `id, org_id, billing_record_id, case_id, amount_received, received_at, payment_method, record_status, receipt_storage_type, receipt_relative_path_or_key, note, void_reason_code, void_reason_note, voided_by, voided_at, reversed_from_payment_record_id, recorded_by, created_at`;
const BILLING_PLAN_COLS = `id, org_id, case_id, milestone_name, amount_due, due_date, status, gate_effect_mode, remark, created_at, updated_at`;
const VALID_PAYMENT_METHODS: ReadonlySet<string> = new Set([
  "bank_transfer",
  "cash",
  "credit_card",
  "other",
]);

function toTimestampStringOrNull(value: unknown): string | null {
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
export function mapPaymentRecordRow(row: PaymentRecordQueryRow): PaymentRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    billingPlanId: row.billing_record_id,
    caseId: row.case_id,
    amountReceived: Number(row.amount_received),
    receivedAt: toTimestampStringOrNull(row.received_at) ?? "",
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? null,
    recordStatus: row.record_status as PaymentRecordStatus,
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
 * Service for PaymentRecord CRUD with P0 void/reverse support.
 */
@Injectable()
export class PaymentRecordsService {
  /**
   * Initialize payment records service.
   *
   * @param pool - PostgreSQL connection pool
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * Create a payment record (initial record_status = valid).
   *
   * @param ctx - request context
   * @param input - creation input
   * @returns created PaymentRecord
   */
  async create(
    ctx: RequestContext,
    input: PaymentRecordCreateInput,
  ): Promise<PaymentRecord> {
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
  async get(ctx: RequestContext, id: string): Promise<PaymentRecord | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<PaymentRecordQueryRow>(
      `select ${PAYMENT_RECORD_COLS} from payment_records where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapPaymentRecordRow(row) : null;
  }

  /**
   * List payment records with pagination.
   *
   * @param ctx - request context
   * @param input - list input
   * @returns paginated list
   */
  async list(
    ctx: RequestContext,
    input: PaymentRecordListInput = {},
  ): Promise<{ items: PaymentRecord[]; total: number }> {
    if (!input.billingPlanId && !input.caseId) {
      throw new BadRequestException(
        "billingPlanId or caseId is required for listing payment records",
      );
    }
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];
    if (input.billingPlanId) {
      params.push(input.billingPlanId);
      where.push(`billing_record_id = $${String(params.length)}`);
    }
    if (input.caseId) {
      params.push(input.caseId);
      where.push(`case_id = $${String(params.length)}`);
    }
    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from payment_records ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<PaymentRecordQueryRow>(
      `select ${PAYMENT_RECORD_COLS} from payment_records ${whereClause}
       order by received_at desc, created_at desc, id desc
       limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );
    return { items: result.rows.map(mapPaymentRecordRow), total };
  }

  /**
   * Void a payment record (P0: no physical delete, mark as voided).
   *
   * @param ctx - request context
   * @param id - PaymentRecord ID
   * @param input - void reason
   * @returns voided PaymentRecord
   */
  async void(
    ctx: RequestContext,
    id: string,
    input: PaymentRecordVoidInput,
  ): Promise<PaymentRecord> {
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
      const result = await tx.query<PaymentRecordQueryRow>(
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
      return voided;
    });
  }

  private async createInTx(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: PaymentRecordCreateInput,
  ): Promise<PaymentRecord> {
    const bp = await this.getBillingPlanForUpdate(tx, input.billingPlanId);
    const pr = await this.insertPaymentRecord(tx, ctx, bp, input);
    await writeTimelineInTx(tx, ctx, {
      entityType: "payment_record",
      entityId: pr.id,
      action: "payment_record.created",
      payload: buildPaymentTimelinePayload(pr),
    });
    await this.recalculateBillingStatus(tx, ctx, bp, pr.id);
    return pr;
  }

  private async insertPaymentRecord(
    tx: TenantDbTx,
    ctx: RequestContext,
    billingPlan: BillingPlan,
    input: PaymentRecordCreateInput,
  ): Promise<PaymentRecord> {
    const result = await tx.query<PaymentRecordQueryRow>(
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

  private async getBillingPlanForUpdate(
    tx: TenantDbTx,
    id: string,
  ): Promise<BillingPlan> {
    const result = await tx.query<BillingPlanQueryRow>(
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

  private async getPaymentRecordForUpdate(
    tx: TenantDbTx,
    id: string,
  ): Promise<PaymentRecord> {
    const result = await tx.query<PaymentRecordQueryRow>(
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
  private async recalculateBillingStatus(
    tx: TenantDbTx,
    ctx: RequestContext,
    billingPlan: BillingPlan,
    paymentRecordId: string,
  ): Promise<void> {
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

  private async getTotalValidReceived(
    tx: TenantDbTx,
    billingPlanId: string,
  ): Promise<number> {
    const result = await tx.query<{ total_received: string | number }>(
      `select coalesce(sum(amount_received), 0) as total_received
       from payment_records
       where billing_record_id = $1 and record_status = 'valid'`,
      [billingPlanId],
    );
    return Number(result.rows[0]?.total_received ?? 0);
  }
}

function validateAmountReceived(amountReceived: number): void {
  if (!Number.isFinite(amountReceived) || amountReceived <= 0) {
    throw new BadRequestException("amountReceived must be greater than 0");
  }
}

function validateReceivedAt(receivedAt: string): void {
  if (Number.isNaN(new Date(receivedAt).getTime())) {
    throw new BadRequestException("Invalid receivedAt");
  }
}

function validatePaymentMethod(
  paymentMethod: PaymentMethod | null | undefined,
): void {
  if (paymentMethod === undefined || paymentMethod === null) return;
  if (!VALID_PAYMENT_METHODS.has(paymentMethod)) {
    throw new BadRequestException(
      `Invalid paymentMethod: ${paymentMethod}. Must be one of: ${[...VALID_PAYMENT_METHODS].join(", ")}`,
    );
  }
}

function deriveBillingStatus(totalReceived: number, amountDue: number): string {
  if (totalReceived >= amountDue && totalReceived > 0) return "paid";
  if (totalReceived > 0) return "partial";
  return "due";
}

async function writeTimelineInTx(
  tx: TenantDbTx,
  ctx: RequestContext,
  input: TimelineInput,
): Promise<void> {
  await tx.query(
    `insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
     values ($1, $2, $3, $4, $5, $6::jsonb)`,
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

function buildPaymentTimelinePayload(
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
