/* eslint-disable jsdoc/require-jsdoc */
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
  BillingRecord,
  PaymentMethod,
  PaymentRecord,
  TimelineAction,
  TimelineEntityType,
} from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import {
  mapBillingRecordRow,
  type BillingRecordQueryRow,
} from "./billingRecords.service";

export type PaymentRecordQueryRow = {
  id: string;
  org_id: string;
  billing_record_id: string;
  case_id: string;
  amount_received: string | number;
  received_at: unknown;
  payment_method: string | null;
  receipt_file_url: string | null;
  recorded_by: string | null;
  created_at: unknown;
};

export type PaymentRecordCreateInput = {
  billingRecordId: string;
  amountReceived: number;
  receivedAt: string;
  paymentMethod?: PaymentMethod | null;
  receiptFileUrl?: string | null;
};

export type PaymentRecordListInput = {
  billingRecordId?: string;
  caseId?: string;
  page?: number;
  limit?: number;
};

type TimelineInput = {
  entityType: TimelineEntityType;
  entityId: string;
  action: TimelineAction;
  payload: Record<string, unknown>;
};

const PAYMENT_RECORD_COLS = `id, org_id, billing_record_id, case_id, amount_received, received_at, payment_method, receipt_file_url, recorded_by, created_at`;
const BILLING_RECORD_COLS = `id, org_id, case_id, billing_type, milestone_name, amount_due, due_date, status, invoice_status, remark, created_at, updated_at`;
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
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value.toString();
  }
  return null;
}

export function mapPaymentRecordRow(row: PaymentRecordQueryRow): PaymentRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    billingRecordId: row.billing_record_id,
    caseId: row.case_id,
    amountReceived: Number(row.amount_received),
    receivedAt: toTimestampStringOrNull(row.received_at) ?? "",
    paymentMethod: (row.payment_method as PaymentMethod | null) ?? null,
    receiptFileUrl: row.receipt_file_url,
    recordedBy: row.recorded_by,
    createdAt: toTimestampStringOrNull(row.created_at) ?? "",
  };
}

@Injectable()
export class PaymentRecordsService {
  constructor(@Inject(Pool) private readonly pool: Pool) {}

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

  private async createInTx(
    tx: TenantDbTx,
    ctx: RequestContext,
    input: PaymentRecordCreateInput,
  ): Promise<PaymentRecord> {
    const billingRecord = await this.getBillingRecordForUpdate(
      tx,
      input.billingRecordId,
    );
    const paymentRecord = await this.insertPaymentRecord(
      tx,
      ctx,
      billingRecord,
      input,
    );
    await writeTimelineInTx(tx, ctx, {
      entityType: "payment_record",
      entityId: paymentRecord.id,
      action: "payment_record.created",
      payload: buildPaymentTimelinePayload(paymentRecord),
    });
    await this.recalculateBillingStatus(
      tx,
      ctx,
      billingRecord,
      paymentRecord.id,
    );
    return paymentRecord;
  }

  async get(ctx: RequestContext, id: string): Promise<PaymentRecord | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<PaymentRecordQueryRow>(
      `select ${PAYMENT_RECORD_COLS} from payment_records where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapPaymentRecordRow(row) : null;
  }

  async list(
    ctx: RequestContext,
    input: PaymentRecordListInput = {},
  ): Promise<{ items: PaymentRecord[]; total: number }> {
    if (!input.billingRecordId && !input.caseId) {
      throw new BadRequestException(
        "billingRecordId or caseId is required for listing payment records",
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (input.billingRecordId) {
      params.push(input.billingRecordId);
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

  async delete(ctx: RequestContext, id: string): Promise<void> {
    if (!hasRequiredRole(ctx.role, ["manager"])) {
      throw new ForbiddenException(
        "Deleting payment record requires manager role",
      );
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.transaction(async (tx) => {
      const paymentRecord = await this.getPaymentRecordForUpdate(tx, id);
      const billingRecord = await this.getBillingRecordForUpdate(
        tx,
        paymentRecord.billingRecordId,
      );

      const result = await tx.query(
        `delete from payment_records where id = $1`,
        [paymentRecord.id],
      );
      if (result.rowCount === 0) {
        throw new BadRequestException("Failed to delete payment record");
      }

      await writeTimelineInTx(tx, ctx, {
        entityType: "payment_record",
        entityId: paymentRecord.id,
        action: "payment_record.deleted",
        payload: buildPaymentTimelinePayload(paymentRecord),
      });

      await this.recalculateBillingStatus(
        tx,
        ctx,
        billingRecord,
        paymentRecord.id,
      );
    });
  }

  private async insertPaymentRecord(
    tx: TenantDbTx,
    ctx: RequestContext,
    billingRecord: BillingRecord,
    input: PaymentRecordCreateInput,
  ): Promise<PaymentRecord> {
    const result = await tx.query<PaymentRecordQueryRow>(
      `insert into payment_records (
         org_id,
         billing_record_id,
         case_id,
         amount_received,
         received_at,
         payment_method,
         receipt_file_url,
         recorded_by
       ) values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning ${PAYMENT_RECORD_COLS}`,
      [
        ctx.orgId,
        billingRecord.id,
        billingRecord.caseId,
        input.amountReceived,
        input.receivedAt,
        input.paymentMethod ?? null,
        input.receiptFileUrl ?? null,
        ctx.userId,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create payment record");
    return mapPaymentRecordRow(row);
  }

  private async getBillingRecordForUpdate(
    tx: TenantDbTx,
    id: string,
  ): Promise<BillingRecord> {
    const result = await tx.query<BillingRecordQueryRow>(
      `select ${BILLING_RECORD_COLS}
       from billing_records
       where id = $1
       limit 1
       for update`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        "Referenced billing_records record not found in current organization",
      );
    }
    return mapBillingRecordRow(row);
  }

  private async getPaymentRecordForUpdate(
    tx: TenantDbTx,
    id: string,
  ): Promise<PaymentRecord> {
    const result = await tx.query<PaymentRecordQueryRow>(
      `select ${PAYMENT_RECORD_COLS}
       from payment_records
       where id = $1
       limit 1
       for update`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Payment record not found");
    return mapPaymentRecordRow(row);
  }

  private async recalculateBillingStatus(
    tx: TenantDbTx,
    ctx: RequestContext,
    billingRecord: BillingRecord,
    paymentRecordId: string,
  ): Promise<void> {
    const totalReceived = await this.getTotalReceived(tx, billingRecord.id);
    const nextStatus = deriveBillingStatus(
      totalReceived,
      billingRecord.amountDue,
    );
    if (nextStatus === billingRecord.status) return;

    const result = await tx.query<BillingRecordQueryRow>(
      `update billing_records
       set status = $2, updated_at = now()
       where id = $1
       returning ${BILLING_RECORD_COLS}`,
      [billingRecord.id, nextStatus],
    );
    const updatedRow = result.rows.at(0);
    if (!updatedRow) {
      throw new BadRequestException("Failed to update billing record status");
    }

    await writeTimelineInTx(tx, ctx, {
      entityType: "billing_record",
      entityId: billingRecord.id,
      action: "billing_record.transitioned",
      payload: {
        from: billingRecord.status,
        to: nextStatus,
        paymentRecordId,
        totalReceived,
      },
    });
  }

  private async getTotalReceived(
    tx: TenantDbTx,
    billingRecordId: string,
  ): Promise<number> {
    const result = await tx.query<{ total_received: string | number }>(
      `select coalesce(sum(amount_received), 0) as total_received
       from payment_records
       where billing_record_id = $1`,
      [billingRecordId],
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
      `Invalid paymentMethod: ${paymentMethod}. Must be one of: ${[
        ...VALID_PAYMENT_METHODS,
      ].join(", ")}`,
    );
  }
}

function deriveBillingStatus(totalReceived: number, amountDue: number): string {
  if (totalReceived >= amountDue && totalReceived > 0) return "settled";
  if (totalReceived > 0) return "partial_paid";
  return "awaiting_payment";
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
  paymentRecord: PaymentRecord,
): Record<string, unknown> {
  return {
    billingRecordId: paymentRecord.billingRecordId,
    caseId: paymentRecord.caseId,
    amountReceived: paymentRecord.amountReceived,
    receivedAt: paymentRecord.receivedAt,
    paymentMethod: paymentRecord.paymentMethod,
  };
}
