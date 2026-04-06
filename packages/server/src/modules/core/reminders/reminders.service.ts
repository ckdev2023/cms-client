import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Reminder } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

/**
 * 数据库查询返回的 reminder 行类型。
 */
export type ReminderQueryRow = {
  id: string;
  org_id: string;
  entity_type: string;
  entity_id: string;
  scheduled_at: unknown;
  status: string;
  payload: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * 创建 Reminder 入参。
 */
export type ReminderCreateInput = {
  entityType: string;
  entityId: string;
  scheduledAt: string;
  payload?: Record<string, unknown> | null;
};

/**
 * 更新 Reminder 入参。
 */
export type ReminderUpdateInput = {
  scheduledAt?: string;
  payload?: Record<string, unknown> | null;
};

/**
 * 列表查询入参。
 */
export type ReminderListInput = {
  status?: string;
  entityType?: string;
  page?: number;
  limit?: number;
};

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

/**
 * 将数据库行映射为 Reminder 实体。
 * @param row 数据库行
 * @returns Reminder 实体
 */
export function mapReminderRow(row: ReminderQueryRow): Reminder {
  return {
    id: row.id,
    orgId: row.org_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    scheduledAt: toTimestampString(row.scheduled_at),
    status: row.status,
    payload:
      row.payload !== null && row.payload !== undefined
        ? (row.payload as Record<string, unknown>)
        : null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

const REMINDER_COLS = `id, org_id, entity_type, entity_id, scheduled_at, status, payload, created_at, updated_at`;

/**
 * Reminder 服务，提供 CRUD、到期查询与软取消能力。
 */
@Injectable()
export class RemindersService {
  /**
   * 构造函数。
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 创建提醒。
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 Reminder 实体
   */
  async create(
    ctx: RequestContext,
    input: ReminderCreateInput,
  ): Promise<Reminder> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ReminderQueryRow>(
      `
        insert into reminders (org_id, entity_type, entity_id, scheduled_at, status, payload)
        values ($1, $2, $3, $4, $5, $6::jsonb)
        returning ${REMINDER_COLS}
      `,
      [
        ctx.orgId,
        input.entityType,
        input.entityId,
        input.scheduledAt,
        "pending",
        JSON.stringify(input.payload ?? null),
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create reminder");
    const created = mapReminderRow(row);

    await this.timelineService.write(ctx, {
      entityType: "reminder",
      entityId: created.id,
      action: "reminder.created",
      payload: { entityType: created.entityType, entityId: created.entityId },
    });

    return created;
  }

  /**
   * 根据 ID 获取提醒详情。
   * @param ctx 请求上下文
   * @param id 提醒 ID
   * @returns Reminder 或 null
   */
  async get(ctx: RequestContext, id: string): Promise<Reminder | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ReminderQueryRow>(
      `select ${REMINDER_COLS} from reminders where id = $1 limit 1`,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapReminderRow(row) : null;
  }

  /**
   * 获取提醒列表（支持 status / entityType 筛选 + 分页）。
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 列表和总数
   */
  async list(
    ctx: RequestContext,
    input: ReminderListInput = {},
  ): Promise<{ items: Reminder[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const where: string[] = [];
    const params: unknown[] = [];

    if (input.status) {
      params.push(input.status);
      where.push("status = $" + String(params.length));
    }
    if (input.entityType) {
      params.push(input.entityType);
      where.push("entity_type = $" + String(params.length));
    }

    const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";

    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from reminders ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    params.push(limit);
    const limitParam = "$" + String(params.length);
    params.push(offset);
    const offsetParam = "$" + String(params.length);

    const result = await tenantDb.query<ReminderQueryRow>(
      `
        select ${REMINDER_COLS}
        from reminders
        ${whereClause}
        order by created_at desc, id desc
        limit ${limitParam} offset ${offsetParam}
      `,
      params,
    );

    return { items: result.rows.map(mapReminderRow), total };
  }

  /**
   * 更新提醒。
   * @param ctx 请求上下文
   * @param id 提醒 ID
   * @param input 更新参数
   * @returns 更新后的 Reminder 实体
   */
  async update(
    ctx: RequestContext,
    id: string,
    input: ReminderUpdateInput,
  ): Promise<Reminder> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Reminder not found");
    if (current.status !== "pending") {
      throw new BadRequestException("Only pending reminders can be updated");
    }

    const nextScheduledAt = input.scheduledAt ?? current.scheduledAt;
    const nextPayload =
      input.payload !== undefined ? input.payload : current.payload;

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ReminderQueryRow>(
      `
        update reminders
        set scheduled_at = $2, payload = $3::jsonb, updated_at = now()
        where id = $1
        returning ${REMINDER_COLS}
      `,
      [id, nextScheduledAt, JSON.stringify(nextPayload)],
    );

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to update reminder");
    const updated = mapReminderRow(row);

    await this.timelineService.write(ctx, {
      entityType: "reminder",
      entityId: updated.id,
      action: "reminder.updated",
      payload: { before: current, after: updated },
    });

    return updated;
  }

  /**
   * 取消提醒（软删除：status → cancelled）。
   * @param ctx 请求上下文
   * @param id 提醒 ID
   */
  async cancel(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Reminder not found");
    if (current.status !== "pending") {
      throw new BadRequestException("Only pending reminders can be cancelled");
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.query(
      `update reminders set status = 'cancelled', updated_at = now() where id = $1`,
      [id],
    );

    await this.timelineService.write(ctx, {
      entityType: "reminder",
      entityId: id,
      action: "reminder.cancelled",
      payload: { previousStatus: current.status },
    });
  }

  /**
   * 查询已到期未发送的提醒。
   * @param ctx 请求上下文
   * @returns 到期的 Reminder 列表
   */
  async due(ctx: RequestContext): Promise<Reminder[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ReminderQueryRow>(
      `
        select ${REMINDER_COLS}
        from reminders
        where scheduled_at <= now() and status = 'pending'
        order by scheduled_at asc
      `,
    );
    return result.rows.map(mapReminderRow);
  }
}
