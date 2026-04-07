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
import type { BillingRecord } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

export type BillingRecordQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  billing_type: string;
  milestone_name: string | null;
  amount_due: string | number;
  due_date: unknown;
  status: string;
  invoice_status: string;
  remark: string | null;
  created_at: unknown;
  updated_at: unknown;
};

export type BillingRecordCreateInput = {
  caseId: string;
  billingType?: string;
  milestoneName?: string | null;
  amountDue: number;
  dueDate?: string | null;
  invoiceStatus?: string;
  remark?: string | null;
};

export type BillingRecordUpdateInput = {
  caseId?: string;
  billingType?: string;
  milestoneName?: string | null;
  amountDue?: number;
  dueDate?: string | null;
  invoiceStatus?: string;
  remark?: string | null;
};

export type BillingRecordListInput = {
  caseId: string;
  page?: number;
  limit?: number;
};

export type BillingRecordTransitionInput = {
  toStatus: string;
};

type ResolvedBillingRecordUpdate = {
  caseId: string;
  billingType: string;
  milestoneName: string | null;
  amountDue: number;
  dueDate: string | null;
  invoiceStatus: string;
  remark: string | null;
};

const BILLING_RECORD_COLS = `id, org_id, case_id, billing_type, milestone_name, amount_due, due_date, status, invoice_status, remark, created_at, updated_at`;
const VALID_BILLING_TYPES = new Set([
  "standard",
  "milestone",
  "hourly",
  "fixed",
]);
const VALID_INVOICE_STATUSES = new Set(["none", "issued", "void"]);
const VALID_BILLING_STATUSES = new Set([
  "unquoted",
  "quoted_pending",
  "awaiting_payment",
  "partial_paid",
  "settled",
  "refunded",
]);
const BILLING_STATUS_TRANSITIONS: Partial<Record<string, string[]>> = {
  unquoted: ["quoted_pending"],
  quoted_pending: ["awaiting_payment", "unquoted"],
  awaiting_payment: ["partial_paid", "settled"],
  partial_paid: ["settled"],
  settled: ["refunded"],
  refunded: [],
};

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

function toDateStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value.toString();
  }
  return null;
}

export function mapBillingRecordRow(row: BillingRecordQueryRow): BillingRecord {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    billingType: row.billing_type,
    milestoneName: row.milestone_name,
    amountDue: Number(row.amount_due),
    dueDate: toDateStringOrNull(row.due_date),
    status: row.status,
    invoiceStatus: row.invoice_status,
    remark: row.remark,
    createdAt: toTimestampStringOrNull(row.created_at) ?? "",
    updatedAt: toTimestampStringOrNull(row.updated_at) ?? "",
  };
}

@Injectable()
export class BillingRecordsService {
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  async create(
    ctx: RequestContext,
    input: BillingRecordCreateInput,
  ): Promise<BillingRecord> {
    validateBillingType(input.billingType ?? "standard");
    validateInvoiceStatus(input.invoiceStatus ?? "none");
    validateAmountDue(input.amountDue);
    validateDate(input.dueDate, "dueDate");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await this.assertCaseBelongsToOrg(tenantDb, input.caseId);

    const result = await tenantDb.query<BillingRecordQueryRow>(
      `insert into billing_records (
         org_id, case_id, billing_type, milestone_name, amount_due, due_date, status, invoice_status, remark
       ) values ($1, $2, $3, $4, $5, $6, 'unquoted', $7, $8)
       returning ${BILLING_RECORD_COLS}`,
      [
        ctx.orgId,
        input.caseId,
        input.billingType ?? "standard",
        input.milestoneName ?? null,
        input.amountDue,
        input.dueDate ?? null,
        input.invoiceStatus ?? "none",
        input.remark ?? null,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create billing record");
    const created = mapBillingRecordRow(row);

    await this.timelineService.write(ctx, {
      entityType: "billing_record",
      entityId: created.id,
      action: "billing_record.created",
      payload: {
        caseId: created.caseId,
        status: created.status,
        amountDue: created.amountDue,
        invoiceStatus: created.invoiceStatus,
      },
    });

    return created;
  }

  async get(ctx: RequestContext, id: string): Promise<BillingRecord | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<BillingRecordQueryRow>(
      `select ${BILLING_RECORD_COLS} from billing_records where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapBillingRecordRow(row) : null;
  }

  async list(
    ctx: RequestContext,
    input: BillingRecordListInput,
  ): Promise<{ items: BillingRecord[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from billing_records where case_id = $1`,
      [input.caseId],
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const result = await tenantDb.query<BillingRecordQueryRow>(
      `select ${BILLING_RECORD_COLS} from billing_records
       where case_id = $1
       order by created_at desc, id desc
       limit $2 offset $3`,
      [input.caseId, limit, offset],
    );

    return { items: result.rows.map(mapBillingRecordRow), total };
  }

  async update(
    ctx: RequestContext,
    id: string,
    input: BillingRecordUpdateInput,
  ): Promise<BillingRecord> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Billing record not found");

    const next = resolveBillingRecordUpdate(current, input);
    validateBillingType(next.billingType);
    validateInvoiceStatus(next.invoiceStatus);
    validateAmountDue(next.amountDue);
    validateDate(next.dueDate, "dueDate");

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    if (next.caseId !== current.caseId) {
      await this.assertCaseBelongsToOrg(tenantDb, next.caseId);
    }

    const result = await tenantDb.query<BillingRecordQueryRow>(
      `update billing_records
       set case_id = $2,
           billing_type = $3,
           milestone_name = $4,
           amount_due = $5,
           due_date = $6,
           invoice_status = $7,
           remark = $8,
           updated_at = now()
       where id = $1
       returning ${BILLING_RECORD_COLS}`,
      [
        id,
        next.caseId,
        next.billingType,
        next.milestoneName,
        next.amountDue,
        next.dueDate,
        next.invoiceStatus,
        next.remark,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update billing record");
    const updated = mapBillingRecordRow(row);

    await this.timelineService.write(ctx, {
      entityType: "billing_record",
      entityId: updated.id,
      action: "billing_record.updated",
      payload: { before: current, after: updated },
    });

    return updated;
  }

  async transition(
    ctx: RequestContext,
    id: string,
    input: BillingRecordTransitionInput,
  ): Promise<BillingRecord> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Billing record not found");

    validateBillingStatus(input.toStatus);
    validateTransition(ctx, current.status, input.toStatus);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<BillingRecordQueryRow>(
      `update billing_records
       set status = $3, updated_at = now()
       where id = $1 and status = $2
       returning ${BILLING_RECORD_COLS}`,
      [id, current.status, input.toStatus],
    );

    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        `Transition conflict: billing record status has already changed from '${current.status}'`,
      );
    }
    const updated = mapBillingRecordRow(row);

    await this.timelineService.write(ctx, {
      entityType: "billing_record",
      entityId: updated.id,
      action: "billing_record.transitioned",
      payload: { from: current.status, to: updated.status },
    });

    return updated;
  }

  private async assertCaseBelongsToOrg(
    tenantDb: TenantDb,
    caseId: string,
  ): Promise<void> {
    const result = await tenantDb.query<{ id: string }>(
      `select id from cases where id = $1 limit 1`,
      [caseId],
    );
    if (result.rows.length === 0) {
      throw new BadRequestException(
        "Referenced cases record not found in current organization",
      );
    }
  }
}

function resolveBillingRecordUpdate(
  current: BillingRecord,
  input: BillingRecordUpdateInput,
): ResolvedBillingRecordUpdate {
  return {
    caseId: input.caseId ?? current.caseId,
    billingType: input.billingType ?? current.billingType,
    milestoneName:
      input.milestoneName !== undefined
        ? input.milestoneName
        : current.milestoneName,
    amountDue: input.amountDue ?? current.amountDue,
    dueDate: input.dueDate !== undefined ? input.dueDate : current.dueDate,
    invoiceStatus: input.invoiceStatus ?? current.invoiceStatus,
    remark: input.remark !== undefined ? input.remark : current.remark,
  };
}

function validateBillingType(billingType: string): void {
  if (!VALID_BILLING_TYPES.has(billingType)) {
    throw new BadRequestException(
      `Invalid billingType: ${billingType}. Must be one of: ${[...VALID_BILLING_TYPES].join(", ")}`,
    );
  }
}

function validateInvoiceStatus(invoiceStatus: string): void {
  if (!VALID_INVOICE_STATUSES.has(invoiceStatus)) {
    throw new BadRequestException(
      `Invalid invoiceStatus: ${invoiceStatus}. Must be one of: ${[...VALID_INVOICE_STATUSES].join(", ")}`,
    );
  }
}

function validateBillingStatus(status: string): void {
  if (!VALID_BILLING_STATUSES.has(status)) {
    throw new BadRequestException(
      `Invalid status: ${status}. Must be one of: ${[...VALID_BILLING_STATUSES].join(", ")}`,
    );
  }
}

function validateAmountDue(amountDue: number): void {
  if (!Number.isFinite(amountDue) || amountDue < 0) {
    throw new BadRequestException(
      "amountDue must be greater than or equal to 0",
    );
  }
}

function validateDate(value: string | null | undefined, field: string): void {
  if (value === undefined || value === null) return;
  if (Number.isNaN(new Date(value).getTime())) {
    throw new BadRequestException(`Invalid ${field}`);
  }
}

function validateTransition(
  ctx: RequestContext,
  from: string,
  to: string,
): void {
  if (!BILLING_STATUS_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(
      `Transition from '${from}' to '${to}' is not allowed`,
    );
  }
  if (to === "refunded" && !hasRequiredRole(ctx.role, ["manager"])) {
    throw new ForbiddenException(
      "Transition to 'refunded' requires manager role",
    );
  }
}
