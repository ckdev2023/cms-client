import { BadRequestException } from "@nestjs/common";
import { sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

import * as drizzleSchema from "../../../infra/db/drizzle/schema";
import { isUuid } from "./uuid";

/**
 * 租户隔离后的 DB 访问接口。
 */
export type TenantDb = {
  query<T extends QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
  transaction<T>(fn: (tx: TenantDbTx) => Promise<T>): Promise<T>;
};

/**
 * 事务内的租户隔离 DB 访问接口（复用同一个连接与事务）。
 */
export type TenantDbTx = {
  query<T extends QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>>;
};

/**
 * 应用内共享的 Drizzle schema DB 类型。
 */
export type AppDrizzleDb = NodePgDatabase<typeof drizzleSchema>;

/**
 * 租户隔离后的 Drizzle 访问接口。
 */
export type TenantDrizzleDb = {
  query<T>(fn: (db: AppDrizzleDb) => Promise<T>): Promise<T>;
  transaction<T>(fn: (tx: AppDrizzleDb) => Promise<T>): Promise<T>;
};

/**
 * 带租户上下文的 Drizzle repository 会话。
 */
export type TenantDrizzleRepositorySession = {
  db: AppDrizzleDb;
  assertBelongsToOrg(table: string, id: string): Promise<void>;
};

/**
 * 租户隔离的 Drizzle repository。
 */
export type TenantDrizzleRepository = {
  query<T>(
    fn: (session: TenantDrizzleRepositorySession) => Promise<T>,
  ): Promise<T>;
  transaction<T>(
    fn: (session: TenantDrizzleRepositorySession) => Promise<T>,
  ): Promise<T>;
};

/**
 * 在当前事务连接上写入 orgId（配合 RLS）。
 *
 * @param client pg client
 * @param orgId orgId
 * @returns void
 */
async function setOrgId(client: PoolClient, orgId: string): Promise<void> {
  await client.query("select set_config('app.org_id', $1, true)", [orgId]);
}

/**
 * 在当前事务连接上写入 actorUserId（用于 trigger/audit）。
 *
 * @param client pg client
 * @param actorUserId actor user id
 * @returns void
 */
async function setActorUserId(
  client: PoolClient,
  actorUserId: string,
): Promise<void> {
  await client.query("select set_config('app.actor_user_id', $1, true)", [
    actorUserId,
  ]);
}

/**
 * 将 pg client 封装为事务内的查询接口。
 *
 * @param client pg client
 * @returns tx
 */
function createTx(client: PoolClient): TenantDbTx {
  return {
    query<T extends QueryResultRow>(
      sql: string,
      params: unknown[] = [],
    ): Promise<QueryResult<T>> {
      return client.query<T>(sql, params);
    },
  };
}

/**
 * 将 pg client 封装为带 schema 的 Drizzle DB。
 *
 * @param client pg client
 * @returns Drizzle DB
 */
function createDrizzleDb(client: PoolClient): AppDrizzleDb {
  return drizzle(client, { schema: drizzleSchema });
}

/**
 * 基于当前 tenant 连接创建带引用断言能力的 Drizzle repository session。
 *
 * @param client pg client
 * @param allowedAssertTables 允许断言的表白名单
 * @returns repository session
 */
function createTenantDrizzleRepositorySession(
  client: PoolClient,
  allowedAssertTables: ReadonlySet<string>,
): TenantDrizzleRepositorySession {
  const db = createDrizzleDb(client);

  return {
    db,
    async assertBelongsToOrg(table: string, id: string): Promise<void> {
      if (!allowedAssertTables.has(table)) {
        throw new Error(`assertBelongsToOrg: disallowed table "${table}"`);
      }
      const result = await db.execute<{ id: string }>(sql`
        select id
        from ${sql.raw(table)}
        where id = ${id}
        limit 1
      `);
      if (result.rows.length === 0) {
        throw new BadRequestException(
          `Referenced ${table} record not found in current organization`,
        );
      }
    },
  };
}

/**
 * 获取一个连接并在事务内执行：begin -> set_config -> fn -> commit/rollback。
 *
 * @param pool PostgreSQL 连接池
 * @param orgId orgId
 * @param actorUserId actor user id（可选）
 * @param fn 回调
 * @returns fn 结果
 */
async function withTenantClient<T>(
  pool: Pool,
  orgId: string,
  actorUserId: string | undefined,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setOrgId(client, orgId);
    if (actorUserId) {
      await setActorUserId(client, actorUserId);
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * 创建 TenantDb：通过 set_config('app.org_id', ...) 配合 RLS，强制所有业务表查询携带 org_id。
 *
 * @param pool PostgreSQL 连接池
 * @param orgId 组织 ID
 * @param actorUserId 当前操作者用户 ID（可选，用于 DB trigger 写入 timeline/audit）
 * @returns TenantDb
 */
export function createTenantDb(
  pool: Pool,
  orgId: string,
  actorUserId?: string,
): TenantDb {
  if (!isUuid(orgId)) {
    throw new Error("Invalid orgId (uuid required)");
  }
  if (actorUserId && !isUuid(actorUserId)) {
    throw new Error("Invalid actorUserId (uuid required)");
  }

  return {
    async query<T extends QueryResultRow>(
      sql: string,
      params: unknown[] = [],
    ): Promise<QueryResult<T>> {
      return withTenantClient(pool, orgId, actorUserId, (client) =>
        client.query<T>(sql, params),
      );
    },
    async transaction<T>(fn: (tx: TenantDbTx) => Promise<T>): Promise<T> {
      return withTenantClient(pool, orgId, actorUserId, async (client) => {
        const tx = createTx(client);
        return fn(tx);
      });
    },
  };
}

/**
 * 创建 TenantDrizzleDb：沿用 `createTenantDb` 的 RLS/actor 注入方式，
 * 但对外暴露 Drizzle 风格的查询入口。
 *
 * 说明：
 * - 每次 `query()` / `transaction()` 都会获取独立连接
 * - 在事务内写入 `app.org_id` 与可选的 `app.actor_user_id`
 * - 提交/回滚边界与 `createTenantDb` 保持一致，避免租户语义漂移
 *
 * @param pool PostgreSQL 连接池
 * @param orgId 组织 ID
 * @param actorUserId 当前操作者用户 ID（可选，用于 DB trigger 写入 timeline/audit）
 * @returns TenantDrizzleDb
 */
export function createTenantDrizzleDb(
  pool: Pool,
  orgId: string,
  actorUserId?: string,
): TenantDrizzleDb {
  if (!isUuid(orgId)) {
    throw new Error("Invalid orgId (uuid required)");
  }
  if (actorUserId && !isUuid(actorUserId)) {
    throw new Error("Invalid actorUserId (uuid required)");
  }

  return {
    async query<T>(fn: (db: AppDrizzleDb) => Promise<T>): Promise<T> {
      return withTenantClient(pool, orgId, actorUserId, async (client) => {
        const db = createDrizzleDb(client);
        return fn(db);
      });
    },
    async transaction<T>(fn: (tx: AppDrizzleDb) => Promise<T>): Promise<T> {
      return withTenantClient(pool, orgId, actorUserId, async (client) => {
        const db = createDrizzleDb(client);
        return fn(db);
      });
    },
  };
}

/**
 * 创建 TenantDrizzleRepository：在 tenant scope 内同时暴露 Drizzle DB
 * 与租户内引用断言能力，供 service 复用统一模式。
 *
 * @param pool PostgreSQL 连接池
 * @param orgId 组织 ID
 * @param actorUserId 当前操作者用户 ID（可选）
 * @param allowedAssertTables 可用于 assertBelongsToOrg 的表白名单
 * @returns TenantDrizzleRepository
 */
export function createTenantDrizzleRepository(
  pool: Pool,
  orgId: string,
  actorUserId: string | undefined,
  allowedAssertTables: readonly string[],
): TenantDrizzleRepository {
  if (!isUuid(orgId)) {
    throw new Error("Invalid orgId (uuid required)");
  }
  if (actorUserId && !isUuid(actorUserId)) {
    throw new Error("Invalid actorUserId (uuid required)");
  }

  const allowedTables = new Set(allowedAssertTables);

  return {
    async query<T>(
      fn: (session: TenantDrizzleRepositorySession) => Promise<T>,
    ): Promise<T> {
      return withTenantClient(pool, orgId, actorUserId, async (client) => {
        const session = createTenantDrizzleRepositorySession(
          client,
          allowedTables,
        );
        return fn(session);
      });
    },
    async transaction<T>(
      fn: (session: TenantDrizzleRepositorySession) => Promise<T>,
    ): Promise<T> {
      return withTenantClient(pool, orgId, actorUserId, async (client) => {
        const session = createTenantDrizzleRepositorySession(
          client,
          allowedTables,
        );
        return fn(session);
      });
    },
  };
}
