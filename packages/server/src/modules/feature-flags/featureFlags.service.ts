import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { TimelineService } from "../core/timeline/timeline.service";
import type { RequestContext } from "../core/tenancy/requestContext";
import { createTenantDb } from "../core/tenancy/tenantDb";
import { normalizeObject } from "../../infra/utils/normalize";
import {
  shouldEnableFlagByRollout,
  type FeatureFlagResolution,
  type FeatureFlagRollout,
  type FeatureFlagRow,
} from "./featureFlags.model";

/**
 * Feature Flag 写入入参。
 */
type FeatureFlagUpsertInput = {
  key: string;
  enabled: boolean;
  rollout?: FeatureFlagRollout;
  note?: string;
};

/**
 * Feature Flag 服务：读写 + 灰度决策。
 */
@Injectable()
export class FeatureFlagsService {
  /**
   * 创建服务。
   *
   * @param pool PostgreSQL 连接池
   * @param timelineService Timeline service
   */
  constructor(
    @Inject(Pool) private readonly pool: Pool,
    @Inject(TimelineService) private readonly timelineService: TimelineService,
  ) {}

  /**
   * 查询本 org 的所有 flags（按 key 排序）。
   *
   * @param ctx 请求上下文
   * @returns flag 列表
   */
  async list(ctx: RequestContext): Promise<FeatureFlagRow[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<{
      id: string;
      org_id: string;
      key: string;
      enabled: boolean;
      payload: unknown;
      created_at: unknown;
      updated_at: unknown;
    }>(
      `
        select id, org_id, key, enabled, payload, created_at, updated_at
        from feature_flags
        order by key asc
      `,
    );
    return result.rows.map(mapRow);
  }

  /**
   * 按 key 查询单条 flag。
   *
   * @param ctx 请求上下文
   * @param key flag key
   * @returns flag 或 null
   */
  async get(ctx: RequestContext, key: string): Promise<FeatureFlagRow | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<{
      id: string;
      org_id: string;
      key: string;
      enabled: boolean;
      payload: unknown;
      created_at: unknown;
      updated_at: unknown;
    }>(
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
  async resolve(
    ctx: RequestContext,
    input: { key: string; entityId?: string },
  ): Promise<FeatureFlagResolution> {
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
  async upsert(
    ctx: RequestContext,
    input: FeatureFlagUpsertInput,
  ): Promise<FeatureFlagRow> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const payload: Record<string, unknown> = {};
    if (input.rollout) payload.rollout = input.rollout;
    if (input.note !== undefined) payload.note = input.note;

    const result = await tenantDb.query<{
      id: string;
      org_id: string;
      key: string;
      enabled: boolean;
      payload: unknown;
      created_at: unknown;
      updated_at: unknown;
    }>(
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
}

function mapRow(row: {
  id: string;
  org_id: string;
  key: string;
  enabled: boolean;
  payload: unknown;
  created_at: unknown;
  updated_at: unknown;
}): FeatureFlagRow {
  return {
    id: row.id,
    orgId: row.org_id,
    key: row.key,
    enabled: row.enabled,
    payload: normalizeObject(row.payload),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function parseRolloutFromPayload(
  payload: Record<string, unknown>,
): FeatureFlagRollout | null {
  const v = payload.rollout;
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const type = (v as Record<string, unknown>).type;
  if (type === "all") return { type: "all" };
  if (type !== "percentage") return null;
  const percentageRaw = (v as Record<string, unknown>).percentage;
  const percentage =
    typeof percentageRaw === "number"
      ? percentageRaw
      : typeof percentageRaw === "string"
        ? Number(percentageRaw)
        : NaN;
  if (!Number.isFinite(percentage)) return null;
  const saltRaw = (v as Record<string, unknown>).salt;
  const salt =
    typeof saltRaw === "string" && saltRaw.trim().length > 0
      ? saltRaw.trim()
      : "default";
  return { type: "percentage", percentage, salt };
}
