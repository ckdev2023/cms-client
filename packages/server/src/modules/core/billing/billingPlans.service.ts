import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type {
  BillingGateEffectMode,
  BillingPlan,
  BillingPlanStatus,
} from "../model/billingEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

/** Database row shape for billing_plans. */
export type BillingPlanQueryRow = {
  id: string;
  org_id: string;
  case_id: string;
  milestone_name: string | null;
  amount_due: string | number;
  due_date: unknown;
  status: string;
  gate_effect_mode: string;
  remark: string | null;
  created_at: unknown;
  updated_at: unknown;
};

/** Input for creating a billing plan node. */
export type BillingPlanCreateInput = {
  caseId: string;
  milestoneName?: string | null;
  amountDue: number;
  dueDate?: string | null;
  gateEffectMode?: BillingGateEffectMode;
  remark?: string | null;
};

/** Input for updating a billing plan node. */
export type BillingPlanUpdateInput = {
  milestoneName?: string | null;
  amountDue?: number;
  dueDate?: string | null;
  gateEffectMode?: BillingGateEffectMode;
  remark?: string | null;
};

/** Input for listing billing plans by case. */
export type BillingPlanListInput = {
  caseId: string;
  page?: number;
  limit?: number;
};

/** Input for explicit status transition. */
export type BillingPlanTransitionInput = {
  toStatus: BillingPlanStatus;
};

const BILLING_TABLE = "billing_plans";
const BILLING_PLAN_COLS = `id, org_id, case_id, milestone_name, amount_due, due_date, status, gate_effect_mode, remark, created_at, updated_at`;

const VALID_STATUSES: ReadonlySet<string> = new Set<string>([
  "due",
  "partial",
  "paid",
  "overdue",
]);

const VALID_GATE_MODES: ReadonlySet<string> = new Set<string>(["off", "warn"]);

const STATUS_TRANSITIONS: Partial<Record<string, string[]>> = {
  due: ["partial", "paid", "overdue"],
  partial: ["paid", "overdue"],
  overdue: ["partial", "paid"],
};

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}

function toDateStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return null;
}

/**
 * Map a database row to a BillingPlan entity.
 *
 * @param row - database row
 * @returns BillingPlan entity
 */
export function mapBillingPlanRow(row: BillingPlanQueryRow): BillingPlan {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    milestoneName: row.milestone_name,
    amountDue: Number(row.amount_due),
    dueDate: toDateStringOrNull(row.due_date),
    status: row.status as BillingPlanStatus,
    gateEffectMode: row.gate_effect_mode as BillingGateEffectMode,
    remark: row.remark,
    createdAt: toTimestampStringOrNull(row.created_at) ?? "",
    updatedAt: toTimestampStringOrNull(row.updated_at) ?? "",
  };
}

/**
 * Service for BillingPlan CRUD and status transitions (P0 §3.20).
 */
@Injectable()
export class BillingPlansService {
  /**
   * Initialize billing plans service.
   *
   * @param pool - PostgreSQL connection pool
   * @param timelineService - timeline audit service
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * Create a new billing plan node for a case.
   *
   * @param ctx - request context
   * @param input - creation input
   * @returns created BillingPlan
   */
  async create(
    ctx: RequestContext,
    input: BillingPlanCreateInput,
  ): Promise<BillingPlan> {
    validateAmountDue(input.amountDue);
    validateDate(input.dueDate, "dueDate");
    validateGateEffectMode(input.gateEffectMode);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await this.assertCaseBelongsToOrg(tenantDb, input.caseId);

    const result = await tenantDb.query<BillingPlanQueryRow>(
      `insert into ${BILLING_TABLE} (
         org_id, case_id, milestone_name, amount_due, due_date, status, gate_effect_mode, remark
       ) values ($1, $2, $3, $4, $5, 'due', $6, $7)
       returning ${BILLING_PLAN_COLS}`,
      [
        ctx.orgId,
        input.caseId,
        input.milestoneName ?? null,
        input.amountDue,
        input.dueDate ?? null,
        input.gateEffectMode ?? "warn",
        input.remark ?? null,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create billing plan");
    const created = mapBillingPlanRow(row);

    await this.timelineService.write(ctx, {
      entityType: "billing_plan",
      entityId: created.id,
      action: "billing_plan.created",
      payload: {
        caseId: created.caseId,
        milestoneName: created.milestoneName,
        amountDue: created.amountDue,
        status: created.status,
      },
    });

    return created;
  }

  /**
   * Get a billing plan by ID.
   *
   * @param ctx - request context
   * @param id - billing plan ID
   * @returns BillingPlan or null
   */
  async get(ctx: RequestContext, id: string): Promise<BillingPlan | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<BillingPlanQueryRow>(
      `select ${BILLING_PLAN_COLS} from ${BILLING_TABLE} where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapBillingPlanRow(row) : null;
  }

  /**
   * List billing plans for a case with pagination.
   *
   * @param ctx - request context
   * @param input - list input
   * @returns paginated list of BillingPlan
   */
  async list(
    ctx: RequestContext,
    input: BillingPlanListInput,
  ): Promise<{ items: BillingPlan[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from ${BILLING_TABLE} where case_id = $1`,
      [input.caseId],
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const result = await tenantDb.query<BillingPlanQueryRow>(
      `select ${BILLING_PLAN_COLS} from ${BILLING_TABLE}
       where case_id = $1
       order by created_at desc, id desc
       limit $2 offset $3`,
      [input.caseId, limit, offset],
    );

    return { items: result.rows.map(mapBillingPlanRow), total };
  }

  /**
   * Update non-status fields of a billing plan node.
   *
   * @param ctx - request context
   * @param id - billing plan ID
   * @param input - update input
   * @returns updated BillingPlan
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: BillingPlanUpdateInput,
  ): Promise<BillingPlan> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Billing plan not found");

    if (current.status === "paid") {
      throw new BadRequestException(
        "Cannot update a billing plan that is already paid",
      );
    }

    const next = mergeUpdateFields(current, input);
    validateAmountDue(next.amountDue);
    validateDate(next.dueDate, "dueDate");
    validateGateEffectMode(next.gateEffectMode);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<BillingPlanQueryRow>(
      `update ${BILLING_TABLE}
       set milestone_name = $2, amount_due = $3, due_date = $4,
           gate_effect_mode = $5, remark = $6, updated_at = now()
       where id = $1
       returning ${BILLING_PLAN_COLS}`,
      [
        id,
        next.milestoneName,
        next.amountDue,
        next.dueDate,
        next.gateEffectMode,
        next.remark,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update billing plan");
    const updated = mapBillingPlanRow(row);

    await this.timelineService.write(ctx, {
      entityType: "billing_plan",
      entityId: updated.id,
      action: "billing_plan.updated",
      payload: { before: current, after: updated },
    });

    return updated;
  }

  /**
   * Explicitly transition a billing plan's status (for overdue marking etc.).
   *
   * @param ctx - request context
   * @param id - billing plan ID
   * @param input - transition input
   * @returns updated BillingPlan
   */
  async transition(
    ctx: RequestContext,
    id: string,
    input: BillingPlanTransitionInput,
  ): Promise<BillingPlan> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Billing plan not found");

    validateStatus(input.toStatus);
    validateTransition(current.status, input.toStatus);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<BillingPlanQueryRow>(
      `update ${BILLING_TABLE}
       set status = $3, updated_at = now()
       where id = $1 and status = $2
       returning ${BILLING_PLAN_COLS}`,
      [id, current.status, input.toStatus],
    );

    const row = result.rows.at(0);
    if (!row) {
      throw new BadRequestException(
        `Transition conflict: billing plan status has already changed from '${current.status}'`,
      );
    }
    const updated = mapBillingPlanRow(row);

    await this.timelineService.write(ctx, {
      entityType: "billing_plan",
      entityId: updated.id,
      action: "billing_plan.transitioned",
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

function mergeUpdateFields(
  current: BillingPlan,
  input: BillingPlanUpdateInput,
): Required<BillingPlanUpdateInput> {
  return {
    milestoneName:
      input.milestoneName !== undefined
        ? input.milestoneName
        : current.milestoneName,
    amountDue: input.amountDue ?? current.amountDue,
    dueDate: input.dueDate !== undefined ? input.dueDate : current.dueDate,
    gateEffectMode: input.gateEffectMode ?? current.gateEffectMode,
    remark: input.remark !== undefined ? input.remark : current.remark,
  };
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

function validateGateEffectMode(mode: string | undefined | null): void {
  if (mode === undefined || mode === null) return;
  if (!VALID_GATE_MODES.has(mode)) {
    throw new BadRequestException(
      `Invalid gateEffectMode: ${mode}. Must be one of: ${[...VALID_GATE_MODES].join(", ")}`,
    );
  }
}

function validateStatus(status: string): void {
  if (!VALID_STATUSES.has(status)) {
    throw new BadRequestException(
      `Invalid status: ${status}. Must be one of: ${[...VALID_STATUSES].join(", ")}`,
    );
  }
}

function validateTransition(from: string, to: string): void {
  if (!STATUS_TRANSITIONS[from]?.includes(to)) {
    throw new BadRequestException(
      `Transition from '${from}' to '${to}' is not allowed`,
    );
  }
}
