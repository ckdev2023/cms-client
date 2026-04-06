import type { Pool, PoolClient, QueryResult, QueryResultRow } from "pg";

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
