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
import type { CaseBillingPlanDto } from "../cases/cases.types-billing";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb, type TenantDbTx } from "../tenancy/tenantDb";
import { customerNameExpr } from "../../../infra/db/customerNameExpr";
import { syncBillingCacheForCase } from "./billingGuards";
import { writeTimelineInTx } from "./timelineHelpers";

/** Database row shape for billing_records. */
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

/** Input for listing billing plans (org-wide or scoped to a single case). */
export type BillingPlanListInput = {
  caseId?: string;
  status?: BillingPlanStatus;
  groupId?: string;
  ownerId?: string;
  q?: string;
  page?: number;
  limit?: number;
};

/** Input for explicit status transition. */
export type BillingPlanTransitionInput = {
  toStatus: BillingPlanStatus;
};

const BILLING_TABLE = "billing_records";
const BILLING_PLAN_COLS = `id, org_id, case_id, milestone_name, amount_due, due_date, status, gate_effect_mode, remark, created_at, updated_at`;

export const BILLING_PLAN_LIST_COLS = `br.id, br.org_id, br.case_id, br.milestone_name, br.amount_due, br.due_date, br.status, br.gate_effect_mode, br.remark, br.created_at, br.updated_at,
  coalesce((select sum(pr.amount_received) from payment_records pr where pr.billing_record_id = br.id and pr.record_status = 'valid'), 0) as paid_amount,
  c.case_no, c.case_name, c.group_id, c.owner_user_id,
  ${customerNameExpr("cu")} as customer_name,
  owner.name as owner_display_name`;

export const BILLING_PLAN_LIST_FROM = `${BILLING_TABLE} br
  join cases c on c.id = br.case_id and coalesce(c.metadata->>'_status', '') is distinct from 'deleted'
  left join customers cu on cu.id = c.customer_id
  left join users owner on owner.id = c.owner_user_id`;

const VALID_STATUSES: ReadonlySet<string> = new Set([
  "due",
  "partial",
  "paid",
  "overdue",
]);

const VALID_GATE_MODES: ReadonlySet<string> = new Set(["off", "warn", "block"]);

const STATUS_TRANSITIONS: Partial<Record<string, string[]>> = {
  due: ["partial", "paid", "overdue"],
  partial: ["paid", "overdue"],
  overdue: ["partial", "paid"],
};

function buildListWhere(orgId: string, input: BillingPlanListInput) {
  const w: string[] = [];
  const p: unknown[] = [];
  const eq = (col: string, val: unknown) => {
    p.push(val);
    w.push(`${col} = $${String(p.length)}`);
  };
  eq("br.org_id", orgId);
  if (input.caseId) eq("br.case_id", input.caseId);
  if (input.status) eq("br.status", input.status);
  if (input.groupId) eq("c.group_id", input.groupId);
  if (input.ownerId) eq("c.owner_user_id", input.ownerId);
  if (input.q) {
    p.push(input.q);
    const qi = `$${String(p.length)}`;
    const like = (col: string) =>
      `lower(${col}) like '%' || lower(${qi}) || '%'`;
    w.push(
      `(${[like("c.case_no"), like("c.case_name"), like("cu.base_profile->>'displayName'"), like("br.milestone_name")].join(" or ")})`,
    );
  }
  return { whereClause: `where ${w.join(" and ")}`, params: p };
}

function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return value instanceof Date ? value.toISOString() : null;
}

function toDateStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return value instanceof Date ? value.toISOString().slice(0, 10) : null;
}

/**
 * 将数据库行映射为 BillingPlan 实体。
 *
 * @param row 数据库行
 * @returns BillingPlan
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

/** list 路径聚合行：billing_records JOIN cases/customers/users + paid_amount 子聚合。 */
export type BillingPlanWithPaymentsRow = BillingPlanQueryRow & {
  paid_amount: string | number;
  case_no: string | null;
  case_name: string | null;
  customer_name: string | null;
  group_id: string | null;
  owner_user_id: string | null;
  owner_display_name: string | null;
};

/**
 * list 路径专用 mapper — 输出 CaseBillingPlanDto。
 *
 * @param row 聚合 join 行
 * @returns CaseBillingPlanDto
 */
export function mapBillingPlanWithPaymentsRow(
  row: BillingPlanWithPaymentsRow,
): CaseBillingPlanDto {
  const amountDue = Number(row.amount_due);
  const paidAmount = Number(row.paid_amount);
  return {
    id: row.id,
    caseId: row.case_id,
    milestoneName: row.milestone_name,
    amountDue,
    dueDate: toDateStringOrNull(row.due_date),
    status: row.status as BillingPlanStatus,
    gateEffectMode: row.gate_effect_mode as BillingGateEffectMode,
    remark: row.remark,
    paidAmount,
    unpaidAmount: Math.max(amountDue - paidAmount, 0),
    createdAt: toTimestampStringOrNull(row.created_at) ?? "",
    updatedAt: toTimestampStringOrNull(row.updated_at) ?? "",
    caseNo: row.case_no ?? null,
    caseName: row.case_name ?? null,
    customerName: row.customer_name ?? null,
    groupId: row.group_id ?? null,
    ownerUserId: row.owner_user_id ?? null,
    ownerDisplayName: row.owner_display_name ?? null,
  };
}

/**
 * Service for BillingPlan CRUD and status transitions (P0 §3.20).
 */
@Injectable()
export class BillingPlansService {
  /**
   * 初始化服务。
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 新建收费节点（事务内写入 timeline + 同步缓存）。
   *
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 新建的 BillingPlan
   */
  async create(
    ctx: RequestContext,
    input: BillingPlanCreateInput,
  ): Promise<BillingPlan> {
    validateAmountDue(input.amountDue);
    validateDate(input.dueDate, "dueDate");
    validateGateEffectMode(input.gateEffectMode);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      await this.assertCaseBelongsToOrg(tx, input.caseId);

      const result = await tx.query<BillingPlanQueryRow>(
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
      if (!row)
        throw new BadRequestException("Failed to create billing record");
      const created = mapBillingPlanRow(row);

      await writeTimelineInTx(tx, ctx, {
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

      await syncBillingCacheForCase(tx, input.caseId);
      return created;
    });
  }

  /**
   * 按 ID 查询收费节点。
   *
   * @param ctx 请求上下文
   * @param id 收费节点 ID
   * @returns BillingPlan 或 null
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
   * 分页列表，支持 org-wide 或按 caseId 筛选。
   *
   * @param ctx 请求上下文
   * @param input 筛选与分页参数
   * @returns 分页结果
   */
  async list(
    ctx: RequestContext,
    input: BillingPlanListInput,
  ): Promise<{ items: CaseBillingPlanDto[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 20, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const { whereClause, params } = buildListWhere(ctx.orgId, input);

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from ${BILLING_PLAN_LIST_FROM} ${whereClause}`,
      params,
    );
    const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listParams = [...params, limit, offset];
    const result = await tenantDb.query<BillingPlanWithPaymentsRow>(
      `select ${BILLING_PLAN_LIST_COLS}
       from ${BILLING_PLAN_LIST_FROM}
       ${whereClause}
       order by br.created_at desc, br.id desc
       limit $${String(listParams.length - 1)} offset $${String(listParams.length)}`,
      listParams,
    );

    return { items: result.rows.map(mapBillingPlanWithPaymentsRow), total };
  }

  /**
   * 更新非状态字段（事务内 select for update + timeline + 缓存同步）。
   *
   * @param ctx 请求上下文
   * @param id 收费节点 ID
   * @param input 更新参数
   * @returns 更新后的 BillingPlan
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: BillingPlanUpdateInput,
  ): Promise<BillingPlan> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const current = await this.getForUpdate(tx, id);

      if (current.status === "paid") {
        throw new BadRequestException(
          "Cannot update a billing plan that is already paid",
        );
      }

      const next = mergeUpdateFields(current, input);
      validateAmountDue(next.amountDue);
      validateDate(next.dueDate, "dueDate");
      validateGateEffectMode(next.gateEffectMode);

      const result = await tx.query<BillingPlanQueryRow>(
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

      await writeTimelineInTx(tx, ctx, {
        entityType: "billing_plan",
        entityId: updated.id,
        action: "billing_plan.updated",
        payload: { before: current, after: updated },
      });

      await syncBillingCacheForCase(tx, current.caseId);
      return updated;
    });
  }

  /**
   * 状态变迁（事务内 select for update + timeline + 缓存同步）。
   *
   * @param ctx 请求上下文
   * @param id 收费节点 ID
   * @param input 目标状态
   * @returns 变迁后的 BillingPlan
   */
  async transition(
    ctx: RequestContext,
    id: string,
    input: BillingPlanTransitionInput,
  ): Promise<BillingPlan> {
    validateStatus(input.toStatus);

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    return tenantDb.transaction(async (tx) => {
      const current = await this.getForUpdate(tx, id);

      validateTransition(current.status, input.toStatus);

      const result = await tx.query<BillingPlanQueryRow>(
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

      await writeTimelineInTx(tx, ctx, {
        entityType: "billing_plan",
        entityId: updated.id,
        action: "billing_plan.transitioned",
        payload: { from: current.status, to: updated.status },
      });

      await syncBillingCacheForCase(tx, current.caseId);
      return updated;
    });
  }

  private async getForUpdate(tx: TenantDbTx, id: string): Promise<BillingPlan> {
    const result = await tx.query<BillingPlanQueryRow>(
      `select ${BILLING_PLAN_COLS} from ${BILLING_TABLE} where id = $1 for update`,
      [id],
    );
    const row = result.rows.at(0);
    if (!row) throw new NotFoundException("Billing plan not found");
    return mapBillingPlanRow(row);
  }

  private async assertCaseBelongsToOrg(
    tx: TenantDbTx,
    caseId: string,
  ): Promise<void> {
    const result = await tx.query<{ id: string }>(
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

function validateAmountDue(v: number): void {
  if (!Number.isFinite(v) || v < 0)
    throw new BadRequestException(
      "amountDue must be greater than or equal to 0",
    );
}
function validateDate(v: string | null | undefined, field: string): void {
  if (v === null || v === undefined) return;
  if (Number.isNaN(new Date(v).getTime()))
    throw new BadRequestException(`Invalid ${field}`);
}
function validateGateEffectMode(m: string | undefined | null): void {
  if (m === null || m === undefined) return;
  if (!VALID_GATE_MODES.has(m))
    throw new BadRequestException(`Invalid gateEffectMode: ${m}`);
}
function validateStatus(s: string): void {
  if (!VALID_STATUSES.has(s))
    throw new BadRequestException(`Invalid status: ${s}`);
}
function validateTransition(from: string, to: string): void {
  if (!STATUS_TRANSITIONS[from]?.includes(to))
    throw new BadRequestException(
      `Transition from '${from}' to '${to}' is not allowed`,
    );
}
