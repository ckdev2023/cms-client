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
import { mapJobRow } from "./jobs.model";
/**
 * Job 队列服务（入队 + 查询）。
 */
let JobsService = class JobsService {
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
   * 入队一个 job（支持幂等）。
   *
   * @param ctx 请求上下文
   * @param input 入队入参
   * @returns Job
   */
  async enqueue(ctx, input) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const maxRetries = clampInt(input.maxRetries ?? 3, 0, 20);
    const runAt = input.runAt ?? new Date().toISOString();
    const idempotencyKey = input.idempotencyKey ?? null;
    const result = await tenantDb.query(
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
  async get(ctx, id) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const result = await tenantDb.query(
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
  async list(ctx, input = {}) {
    const tenantDb = createTenantDb(this.pool, ctx.orgId, ctx.userId);
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const where = [];
    const params = [];
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
    const result = await tenantDb.query(sql, params);
    return result.rows.map(mapJobRow);
  }
};
JobsService = __decorate(
  [
    Injectable(),
    __param(0, Inject(Pool)),
    __metadata("design:paramtypes", [Pool]),
  ],
  JobsService,
);
export { JobsService };
function clampInt(v, min, max) {
  const n = Math.floor(v);
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
//# sourceMappingURL=jobs.service.js.map
