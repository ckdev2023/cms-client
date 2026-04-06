import { Pool } from "pg";

/**
 * PostgreSQL 连接池类型。
 */
export type PgPool = Pool;

/**
 * 创建 PostgreSQL 连接池。
 *
 * @param dbUrl PostgreSQL 连接串
 * @returns 连接池
 */
export function createPgPool(dbUrl: string): PgPool {
  return new Pool({
    connectionString: dbUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
  });
}
