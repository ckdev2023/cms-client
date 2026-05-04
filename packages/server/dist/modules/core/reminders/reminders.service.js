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
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import { TimelineService } from "../timeline/timeline.service";
function toTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}
function toTimestampString(value) {
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
export function mapReminderRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    caseId: row.case_id,
    targetType: row.target_type,
    targetId: row.target_id,
    remindAt: toTimestampString(row.remind_at),
    recipientType: row.recipient_type,
    recipientId: row.recipient_id,
    channel: row.channel,
    dedupeKey: row.dedupe_key,
    sendStatus: row.send_status,
    retryCount: Number(row.retry_count),
    sentAt: toTimestampStringOrNull(row.sent_at),
    payloadSnapshot:
      row.payload_snapshot !== null && row.payload_snapshot !== undefined
        ? row.payload_snapshot
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
export function mapReminderListRow(row) {
  return {
    ...mapReminderRow(row),
    caseNo: row.case_no ?? null,
    recipientName: row.recipient_name ?? null,
  };
}
/**
 * Reminder 服务，提供 CRUD、到期查询与软取消能力（P0 aligned）。
 */
let RemindersService = class RemindersService {
  pool;
  timelineService;
  /**
   * 构造函数。
   *
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline 服务
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   * 创建提醒。
   *
   * @param ctx 请求上下文
   * @param input 创建参数
   * @returns 创建成功的 Reminder 实体
   */
  async create(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    if (input.dedupeKey) {
      const existing = await tenantDb.query(
        `select id from reminders where dedupe_key = $1 limit 1`,
        [input.dedupeKey],
      );
      if (existing.rows.length > 0) {
        throw new BadRequestException(
          `Reminder with dedupe_key '${input.dedupeKey}' already exists`,
        );
      }
    }
    let result;
    try {
      result = await tenantDb.query(
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
    } catch (err) {
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
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const page = Math.max(input.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const filterWhere = [];
    const filterParams = [];
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
    const countResult = await tenantDb.query(
      `select count(*) as count from reminders ${countWhereClause}`,
      filterParams,
    );
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    const listWhere = filterWhere.map((clause) => `r.${clause}`);
    const listParams = [...filterParams];
    const listWhereClause =
      listWhere.length > 0 ? `where ${listWhere.join(" and ")}` : "";
    listParams.push(limit);
    const limitParam = "$" + String(listParams.length);
    listParams.push(offset);
    const offsetParam = "$" + String(listParams.length);
    const result = await tenantDb.query(
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
  async update(ctx, id, input) {
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
    const result = await tenantDb.query(
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
  async cancel(ctx, id) {
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
  async due(ctx) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(`
        select ${REMINDER_COLS}
        from reminders
        where remind_at <= now() and send_status = 'pending'
        order by remind_at asc
      `);
    return result.rows.map(mapReminderRow);
  }
};
RemindersService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  RemindersService,
);
export { RemindersService };
const PG_CLIENT_ERROR_LABELS = {
  23502: "not null violation",
  "22P02": "invalid input format",
};
function extractPgCode(err) {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = err.code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
function wrapReminderCreateError(err) {
  const pgCode = extractPgCode(err);
  if (pgCode === "23503") {
    throw new BadRequestException({
      errorCode: "REMINDER_REF_NOT_FOUND",
      message: "Referenced record not found",
    });
  }
  if (pgCode === "23502" || pgCode === "22P02") {
    const column = err.column ?? null;
    throw new BadRequestException({
      errorCode: "REMINDER_VALIDATION_FAILED",
      detail: { source: "pg", pgCode, column },
      message: `Reminder validation failed: ${PG_CLIENT_ERROR_LABELS[pgCode]}`,
    });
  }
  throw err;
}
//# sourceMappingURL=reminders.service.js.map
