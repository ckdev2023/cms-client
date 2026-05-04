import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";

import type { Reminder, ReminderSendStatus } from "../model/coreEntities";
import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";

/**
 * 数据库查询返回的 reminder 行类型（P0 aligned）。
 */
export type ReminderQueryRow = {
  id: string;
  org_id: string;
  case_id: string | null;
  target_type: string;
  target_id: string;
  remind_at: unknown;
  recipient_type: string;
  recipient_id: string | null;
  channel: string;
  dedupe_key: string | null;
  send_status: string;
  retry_count: string | number;
  sent_at: unknown;
  payload_snapshot: unknown;
  created_at: unknown;
  updated_at: unknown;
};

/**
 * Reminder 列表行额外携带的引用解析字段（BUG-163）。
 */
export type ReminderListJoinRow = ReminderQueryRow & {
  case_no: string | null;
  recipient_name: string | null;
};

/**
 * 列表视图返回的 Reminder + 引用展示字段（BUG-163：避免 UI 直显 raw UUID）。
 */
export type ReminderListItem = Reminder & {
  caseNo: string | null;
  recipientName: string | null;
};

/**
 * 创建 Reminder 入参（P0 aligned）。
 */
export type ReminderCreateInput = {
  caseId?: string | null;
  targetType: string;
  targetId: string;
  remindAt: string;
  recipientType?: string;
  recipientId?: string | null;
  channel?: string;
  dedupeKey?: string | null;
  payloadSnapshot?: Record<string, unknown> | null;
};

/**
 * 更新 Reminder 入参。
 */
export type ReminderUpdateInput = {
  remindAt?: string;
  payloadSnapshot?: Record<string, unknown> | null;
};

/**
 * 列表查询入参（P0 aligned）。
 */
export type ReminderListInput = {
  sendStatus?: string;
  targetType?: string;
  caseId?: string;
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
 * 将数据库行映射为 P0 Reminder 实体。
 *
 * @param row 数据库行
 * @returns Reminder 实体
 */
export function mapReminderRow(row: ReminderQueryRow): Reminder {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    targetType: row.target_type as Reminder["targetType"],
    targetId: row.target_id,
    remindAt: toTimestampString(row.remind_at),
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    channel: row.channel,
    dedupeKey: row.dedupe_key,
    sendStatus: row.send_status as ReminderSendStatus,
    retryCount: Number(row.retry_count),
    sentAt: toTimestampStringOrNull(row.sent_at),
    payloadSnapshot:
      row.payload_snapshot !== null && row.payload_snapshot !== undefined
        ? (row.payload_snapshot as Record<string, unknown>)
        : null,
    createdAt: toTimestampString(row.created_at),
    updatedAt: toTimestampString(row.updated_at),
  };
}

const REMINDER_COLS = `id, org_id, case_id, target_type, target_id, remind_at, recipient_type, recipient_id, channel, dedupe_key, send_status, retry_count, sent_at, payload_snapshot, created_at, updated_at`;

const REMINDER_LIST_SELECT = `
  r.id, r.org_id, r.case_id, r.target_type, r.target_id, r.remind_at,
  r.recipient_type, r.recipient_id, r.channel, r.dedupe_key, r.send_status,
  r.retry_count, r.sent_at, r.payload_snapshot, r.created_at, r.updated_at,
  c.case_no as case_no,
  u.name as recipient_name
`;

/**
 * 把 reminder 列表 join row 映射成附带 caseNo / recipientName 的列表项。
 *
 * @param row reminders + cases + users join 后的查询结果
 * @returns 列表展示用的 Reminder + 引用解析字段
 */
export function mapReminderListRow(row: ReminderListJoinRow): ReminderListItem {
  return {
    ...mapReminderRow(row),
    caseNo: row.case_no ?? null,
    recipientName: row.recipient_name ?? null,
  };
}

/**
 * Reminder 服务，提供 CRUD、到期查询与软取消能力（P0 aligned）。
 */
@Injectable()
export class RemindersService {
  /**
   * 构造函数。
   *
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 创建提醒。
   *
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 Reminder 实体
   */
  async create(
    ctx: RequestContext,
    input: ReminderCreateInput,
  ): Promise<Reminder> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    if (input.dedupeKey) {
      const existing = await tenantDb.query<{ id: string }>(
        `select id from reminders where dedupe_key = $1 limit 1`,
        [input.dedupeKey],
      );
      if (existing.rows.length > 0) {
        throw new BadRequestException(
          `Reminder with dedupe_key '${input.dedupeKey}' already exists`,
        );
      }
    }

    let result: { rows: ReminderQueryRow[] };
    try {
      result = await tenantDb.query<ReminderQueryRow>(
        `
        insert into reminders (org_id, case_id, target_type, target_id, remind_at, recipient_type, recipient_id, channel, dedupe_key, send_status, status, payload_snapshot)
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 'pending', $10::jsonb)
        returning ${REMINDER_COLS}
      `,
        [
          ctx.orgId,
          input.caseId ?? null,
          input.targetType,
          input.targetId,
          input.remindAt,
          input.recipientType ?? "user",
          input.recipientId ?? null,
          input.channel ?? "in_app",
          input.dedupeKey ?? null,
          JSON.stringify(input.payloadSnapshot ?? null),
        ],
      );
    } catch (err: unknown) {
      wrapReminderCreateError(err);
    }

    const row = result.rows.at(0);
    if (!row) throw new BadRequestException("Failed to create reminder");
    const created = mapReminderRow(row);

    await this.timelineService.write(ctx, {
      entityType: "reminder",
      entityId: created.id,
      action: "reminder.created",
      payload: { targetType: created.targetType, targetId: created.targetId },
    });

    return created;
  }

  /**
   * 根据 ID 获取提醒详情。
   *
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
   * 获取提醒列表（支持 sendStatus / targetType / caseId 筛选 + 分页）。
   *
   * @param ctx 请求上下文
   * @param input 查询参数
   * @returns 列表和总数
   */
  async list(
    ctx: RequestContext,
    input: ReminderListInput = {},
  ): Promise<{ items: ReminderListItem[]; total: number }> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const filterWhere: string[] = [];
    const filterParams: unknown[] = [];

    if (input.sendStatus) {
      filterParams.push(input.sendStatus);
      filterWhere.push("send_status = $" + String(filterParams.length));
    }
    if (input.targetType) {
      filterParams.push(input.targetType);
      filterWhere.push("target_type = $" + String(filterParams.length));
    }
    if (input.caseId) {
      filterParams.push(input.caseId);
      filterWhere.push("case_id = $" + String(filterParams.length));
    }

    const countWhereClause =
      filterWhere.length > 0 ? `where ${filterWhere.join(" and ")}` : "";
    const countResult = await tenantDb.query<{ count: string }>(
      `select count(*) as count from reminders ${countWhereClause}`,
      filterParams,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);

    const listWhere: string[] = filterWhere.map((clause) => `r.${clause}`);
    const listParams: unknown[] = [...filterParams];
    const listWhereClause =
      listWhere.length > 0 ? `where ${listWhere.join(" and ")}` : "";

    listParams.push(limit);
    const limitParam = "$" + String(listParams.length);
    listParams.push(offset);
    const offsetParam = "$" + String(listParams.length);

    const result = await tenantDb.query<ReminderListJoinRow>(
      `
        select ${REMINDER_LIST_SELECT}
        from reminders r
        left join cases c on c.id = r.case_id and c.org_id = r.org_id
        left join users u on u.id = r.recipient_id and u.org_id = r.org_id
        ${listWhereClause}
        order by r.created_at desc, r.id desc
        limit ${limitParam} offset ${offsetParam}
      `,
      listParams,
    );

    return { items: result.rows.map(mapReminderListRow), total };
  }

  /**
   * 更新提醒。
   *
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
    if (current.sendStatus !== "pending") {
      throw new BadRequestException("Only pending reminders can be updated");
    }

    const nextRemindAt = input.remindAt ?? current.remindAt;
    const nextPayload =
      input.payloadSnapshot !== undefined
        ? input.payloadSnapshot
        : current.payloadSnapshot;

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ReminderQueryRow>(
      `
        update reminders
        set remind_at = $2, payload_snapshot = $3::jsonb, updated_at = now()
        where id = $1
        returning ${REMINDER_COLS}
      `,
      [id, nextRemindAt, JSON.stringify(nextPayload)],
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
   * 取消提醒（软删除：sendStatus → canceled）。
   *
   * @param ctx 请求上下文
   * @param id 提醒 ID
   */
  async cancel(ctx: RequestContext, id: string): Promise<void> {
    const current = await this.get(ctx, id);
    if (!current) throw new NotFoundException("Reminder not found");
    if (current.sendStatus !== "pending") {
      throw new BadRequestException("Only pending reminders can be cancelled");
    }

    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.query(
      `update reminders set send_status = 'canceled', updated_at = now() where id = $1`,
      [id],
    );

    await this.timelineService.write(ctx, {
      entityType: "reminder",
      entityId: id,
      action: "reminder.cancelled",
      payload: { previousStatus: current.sendStatus },
    });
  }

  /**
   * 查询已到期未发送的提醒。
   *
   * @param ctx 请求上下文
   * @returns 到期的 Reminder 列表
   */
  async due(ctx: RequestContext): Promise<Reminder[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<ReminderQueryRow>(
      `
        select ${REMINDER_COLS}
        from reminders
        where remind_at <= now() and send_status = 'pending'
        order by remind_at asc
      `,
    );
    return result.rows.map(mapReminderRow);
  }
}

const PG_CLIENT_ERROR_LABELS: Readonly<Record<string, string>> = {
  "23502": "not null violation",
  "22P02": "invalid input format",
};

function extractPgCode(err: unknown): string | undefined {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

function wrapReminderCreateError(err: unknown): never {
  const pgCode = extractPgCode(err);
  if (pgCode === "23503") {
    throw new BadRequestException({
      errorCode: "REMINDER_REF_NOT_FOUND",
      message: "Referenced record not found",
    });
  }
  if (pgCode === "23502" || pgCode === "22P02") {
    const column = (err as { column?: string }).column ?? null;
    throw new BadRequestException({
      errorCode: "REMINDER_VALIDATION_FAILED",
      detail: { source: "pg", pgCode, column },
      message: `Reminder validation failed: ${PG_CLIENT_ERROR_LABELS[pgCode]}`,
    });
  }
  throw err;
}
