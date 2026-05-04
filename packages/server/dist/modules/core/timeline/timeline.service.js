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
import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { createTenantDb } from "../tenancy/tenantDb";
import { requireTimestampString } from "../model/timestamps";
/**
 * 统一 Timeline 写入服务。
 */
let TimelineService = class TimelineService {
  pool;
  /**
   * 创建服务。
   *
   * @param pool PostgreSQL 连接池
   */
  constructor(pool) {
    this.pool = pool;
  }
  /**
   * 写入一条 timeline 记录。
   *
   * @param ctx 请求上下文
   * @param input 记录内容
   * @returns 写入结果
   */
  async write(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    await tenantDb.query(
      `
        insert into timeline_logs(org_id, entity_type, entity_id, action, actor_user_id, payload)
        values ($1, $2, $3, $4, $5, $6::jsonb)
      `,
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
  /**
   * 查询 timeline 记录。
   *
   * @param ctx 请求上下文
   * @param input 查询条件
   * @returns timeline 记录列表（按时间倒序）
   */
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const { sql, params } = buildTimelineListQuery(input);
    const result = await tenantDb.query(sql, params);
    return result.rows.map(mapTimelineRow);
  }
};
TimelineService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  TimelineService,
);
export { TimelineService };
function buildTimelineListQuery(input) {
  const where = [];
  const params = [];
  pushTimelineFilter(where, params, "tl.entity_type", input.entityType);
  pushTimelineFilter(where, params, "tl.entity_id", input.entityId);
  params.push(Math.min(Math.max(input.limit ?? 50, 1), 200));
  const limitParam = `$${String(params.length)}`;
  return {
    sql: `
      select
        tl.id,
        tl.org_id,
        tl.entity_type,
        tl.entity_id,
        tl.action,
        tl.actor_user_id,
        nullif(trim(u.name), '') as actor_display_name,
        tl.payload,
        tl.created_at
      from timeline_logs tl
      left join users u on u.id = tl.actor_user_id and u.org_id = tl.org_id
      ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
      order by tl.created_at desc, tl.id desc
      limit ${limitParam}
    `,
    params,
  };
}
function pushTimelineFilter(where, params, column, value) {
  if (!value) return;
  params.push(value);
  where.push(`${column} = $${String(params.length)}`);
}
function mapTimelineRow(r) {
  return {
    id: r.id,
    orgId: r.org_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    action: r.action,
    actorUserId: r.actor_user_id,
    actorDisplayName: r.actor_display_name,
    payload: normalizePayload(r.payload),
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}
function normalizePayload(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object") return parsed;
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value;
  return {};
}
//# sourceMappingURL=timeline.service.js.map
