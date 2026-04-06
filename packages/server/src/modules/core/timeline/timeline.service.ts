import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import { createTenantDb } from "../tenancy/tenantDb";
import type { RequestContext } from "../tenancy/requestContext";
import type {
  TimelineAction,
  TimelineEntityType,
  TimelineLog,
} from "../model/coreEntities";

/**
 * Timeline 写入入参。
 */
export type TimelineWriteInput = {
  entityType: TimelineEntityType;
  entityId: string;
  action: TimelineAction;
  payload: Record<string, unknown>;
};

/**
 * Timeline 查询入参。
 */
export type TimelineListInput = {
  entityType?: TimelineEntityType;
  entityId?: string;
  limit?: number;
};

/**
 * 统一 Timeline 写入服务。
 */
@Injectable()
export class TimelineService {
  /**
   * 创建服务。
   *
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 写入一条 timeline 记录。
   *
   * @param ctx 请求上下文
   * @param input 记录内容
   * @returns 写入结果
   */
  async write(ctx: RequestContext, input: TimelineWriteInput): Promise<void> {
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
  async list(
    ctx: RequestContext,
    input: TimelineListInput = {},
  ): Promise<TimelineLog[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

    const where: string[] = [];
    const params: unknown[] = [];

    if (input.entityType) {
      params.push(input.entityType);
      where.push("entity_type = $" + String(params.length));
    }
    if (input.entityId) {
      params.push(input.entityId);
      where.push("entity_id = $" + String(params.length));
    }

    params.push(limit);
    const limitParam = "$" + String(params.length);

    const sql = `
      select id, org_id, entity_type, entity_id, action, actor_user_id, payload, created_at
      from timeline_logs
      ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
      order by created_at desc, id desc
      limit ${limitParam}
    `;

    const result = await tenantDb.query<{
      id: string;
      org_id: string;
      entity_type: string;
      entity_id: string;
      action: string;
      actor_user_id: string | null;
      payload: unknown;
      created_at: unknown;
    }>(sql, params);

    return result.rows.map((r) => ({
      id: r.id,
      orgId: r.org_id,
      entityType: r.entity_type as TimelineEntityType,
      entityId: r.entity_id,
      action: r.action,
      actorUserId: r.actor_user_id,
      payload: normalizePayload(r.payload),
      createdAt: String(r.created_at),
    }));
  }
}

function normalizePayload(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object")
        return parsed as Record<string, unknown>;
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object") return value as Record<string, unknown>;
  return {};
}
