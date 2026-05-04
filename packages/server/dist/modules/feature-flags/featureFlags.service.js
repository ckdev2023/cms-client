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
import { TimelineService } from "../core/timeline/timeline.service";
import { createTenantDb } from "../core/tenancy/tenantDb";
import { requireTimestampString } from "../core/model/timestamps";
import { normalizeObject } from "../../infra/utils/normalize";
import { shouldEnableFlagByRollout } from "./featureFlags.model";
/**
 * Feature Flag 服务：读写 + 灰度决策。
 */
let FeatureFlagsService = class FeatureFlagsService {
  pool;
  timelineService;
  /**
   * 创建服务。
   *
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline service
   */
  constructor(pool, timelineService) {
    this.pool = pool;
    this.timelineService = timelineService;
  }
  /**
   * 查询本 org 的所有 flags（按 key 排序）。
   *
   * @param ctx 请求上下文
   * @returns flag 列表
   */
  async list(ctx) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(`
        select id, org_id, key, enabled, payload, created_at, updated_at
        from feature_flags
        order by key asc
      `);
    return result.rows.map(mapRow);
  }
  /**
   * 按 key 查询单条 flag。
   *
   * @param ctx 请求上下文
   * @param key flag key
   * @returns flag 或 null
   */
  async get(ctx, key) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
      `
        select id, org_id, key, enabled, payload, created_at, updated_at
        from feature_flags
        where key = $1
        limit 1
      `,
      [key],
    );
    const row = result.rows.at(0);
    if (!row) return null;
    return mapRow(row);
  }
  /**
   * 解析本次请求下某个 flag 是否启用。
   *
   * @param ctx 请求上下文
   * @param input 解析入参
   * @param input.key flag key
   * @param input.entityId 用于灰度分桶的实体 ID（可选）
   * @returns 解析结果
   */
  async resolve(ctx, input) {
    const row = await this.get(ctx, input.key);
    if (!row)
      return { key: input.key, enabled: false, used: false, reason: "missing" };
    if (!row.enabled)
      return {
        key: input.key,
        enabled: false,
        used: false,
        reason: "disabled",
      };
    const rollout = parseRolloutFromPayload(row.payload);
    if (!rollout) return { key: input.key, enabled: true, used: true };
    if (!shouldEnableFlagByRollout(rollout, input.entityId)) {
      return { key: input.key, enabled: false, used: false, reason: "rollout" };
    }
    return { key: input.key, enabled: true, used: true };
  }
  /**
   * 写入/更新 flag。
   *
   * @param ctx 请求上下文
   * @param input 写入内容
   * @returns upsert 后的 flag
   */
  async upsert(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const payload = {};
    if (input.rollout) payload.rollout = input.rollout;
    if (input.note !== undefined) payload.note = input.note;
    const result = await tenantDb.query(
      `
        insert into feature_flags(org_id, key, enabled, payload)
        values ($1, $2, $3, $4::jsonb)
        on conflict (org_id, key)
        do update
          set enabled = excluded.enabled,
              payload = excluded.payload,
              updated_at = now()
        returning id, org_id, key, enabled, payload, created_at, updated_at
      `,
      [ctx.orgId, input.key, input.enabled, JSON.stringify(payload)],
    );
    const row = result.rows.at(0);
    if (!row) throw new Error("Failed to upsert feature flag");
    await this.timelineService.write(ctx, {
      entityType: "organization",
      entityId: ctx.orgId,
      action: "feature_flag_upserted",
      payload: {
        key: input.key,
        enabled: input.enabled,
        rollout: input.rollout ?? null,
      },
    });
    return mapRow(row);
  }
};
FeatureFlagsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __param(1, Inject(TimelineService)),
    __metadata("design:paramtypes", [Pool, TimelineService]),
  ],
  FeatureFlagsService,
);
export { FeatureFlagsService };
function mapRow(row) {
  return {
    id: row.id,
    orgId: row.org_id,
    key: row.key,
    enabled: row.enabled,
    payload: normalizeObject(row.payload),
    createdAt: requireTimestampString(row.created_at, "created_at"),
    updatedAt: requireTimestampString(row.updated_at, "updated_at"),
  };
}
function parseRolloutFromPayload(payload) {
  const v = payload.rollout;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const type = v.type;
  if (type === "all") return { type: "all" };
  if (type !== "percentage") return null;
  const percentageRaw = v.percentage;
  const percentage =
    typeof percentageRaw === "number"
      ? percentageRaw
      : typeof percentageRaw === "string"
        ? Number(percentageRaw)
        : NaN;
  if (!Number.isFinite(percentage)) return null;
  const saltRaw = v.salt;
  const salt =
    typeof saltRaw === "string" && saltRaw.trim().length > 0
      ? saltRaw.trim()
      : "default";
  return { type: "percentage", percentage, salt };
}
//# sourceMappingURL=featureFlags.service.js.map
