import { Inject, Injectable } from "@nestjs/common";
import { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { createTenantDb } from "../tenancy/tenantDb";
import type { Job, JobEnqueueInput, JobListInput } from "./jobs.model";
import { mapJobRow } from "./jobs.model";

type JobQueryRow = Parameters<typeof mapJobRow>[0];

/**
 * Job 队列服务（入队 + 查询）。
 */
@Injectable()
export class JobsService {
  /**
   * 创建服务。
   *
   * @param pool PostgreSQL 连接池
   */
  constructor(@Inject(Pool) private readonly pool: Pool) {}

  /**
   * 入队一个 job（支持幂等）。
   *
   * @param ctx 请求上下文
   * @param input 入队入参
   * @returns Job
   */
  async enqueue(ctx: RequestContext, input: JobEnqueueInput): Promise<Job> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);

    const maxRetries = clampInt(input.maxRetries ?? 3, 0, 20);
    const runAt = input.runAt ?? new Date().toISOString();
    const idempotencyKey = input.idempotencyKey ?? null;

    const result = await tenantDb.query<JobQueryRow>(
      `
        insert into jobs(
          org_id, type, payload, idempotency_key, max_retries, run_at
        )
        values ($1, $2, $3::jsonb, $4, $5, $6)
        on conflict (org_id, type, idempotency_key) where idempotency_key is not null
        do update set updated_at = jobs.updated_at
        returning
          id, org_id, type, payload, idempotency_key, status, attempts, max_retries, run_at,
          locked_at, locked_by, started_at, finished_at, last_error, created_at, updated_at
      `,
      [
        ctx.orgId,
        input.type,
        JSON.stringify(input.payload),
        idempotencyKey,
        maxRetries,
        runAt,
      ],
    );

    const row = result.rows.at(0);
    if (!row) throw new Error("Failed to enqueue job");
    return mapJobRow(row);
  }

  /**
   * 查询单个 job。
   *
   * @param ctx 请求上下文
   * @param id Job ID
   * @returns Job 或 null
   */
  async get(ctx: RequestContext, id: string): Promise<Job | null> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query<JobQueryRow>(
      `
        select
          id, org_id, type, payload, idempotency_key, status, attempts, max_retries, run_at,
          locked_at, locked_by, started_at, finished_at, last_error, created_at, updated_at
        from jobs
        where id = $1
        limit 1
      `,
      [id],
    );
    const row = result.rows.at(0);
    return row ? mapJobRow(row) : null;
  }

  /**
   * 查询 job 列表。
   *
   * @param ctx 请求上下文
   * @param input 查询入参
   * @returns Job 列表
   */
  async list(ctx: RequestContext, input: JobListInput = {}): Promise<Job[]> {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

    const where: string[] = [];
    const params: unknown[] = [];

    if (input.status) {
      params.push(input.status);
      where.push("status = $" + String(params.length));
    }

    params.push(limit);
    const limitParam = "$" + String(params.length);

    const sql = `
      select
        id, org_id, type, payload, idempotency_key, status, attempts, max_retries, run_at,
        locked_at, locked_by, started_at, finished_at, last_error, created_at, updated_at
      from jobs
      ${where.length > 0 ? `where ${where.join(" and ")}` : ""}
      order by created_at desc, id desc
      limit ${limitParam}
    `;

    const result = await tenantDb.query<JobQueryRow>(sql, params);
    return result.rows.map(mapJobRow);
  }
}

function clampInt(v: number, min: number, max: number): number {
  const n = Math.floor(v);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
