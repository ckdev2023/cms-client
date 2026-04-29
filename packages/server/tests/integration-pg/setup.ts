/**
 * integration-pg 测试基础设施：连接真 PG、跑 migration、提供隔离池。
 *
 * 使用方式：
 *   import { getTestPool, migrateAndSeed } from "./setup.ts";
 *
 * 环境变量 `INTEGRATION_PG_URL` 可覆盖默认连接串。
 * 默认值指向 docker-compose.integration.yml 启的容器。
 */

import path from "node:path";
import { Pool } from "pg";

import {
  listMigrations,
  readSql,
  ensureMigrationsTable,
  applyMigration,
  getAppliedMigrationIds,
} from "../../src/infra/db/runMigrationsLib";

const DEFAULT_URL = "postgres://cms_test:cms_test@localhost:5499/cms_test";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../src/infra/db/migrations",
);

let pool: Pool | null = null;

export function getTestPool(): Pool {
  if (pool) return pool;
  const url = process.env.INTEGRATION_PG_URL ?? DEFAULT_URL;
  pool = new Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 5_000,
    statement_timeout: 30_000,
  });
  return pool;
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * 跑所有 pending migration（幂等：已应用的跳过）。
 */
export async function migrateAndSeed(): Promise<void> {
  const p = getTestPool();
  await ensureMigrationsTable(p);

  const applied = new Set(await getAppliedMigrationIds(p));
  const migrations = listMigrations(MIGRATIONS_DIR);

  for (const m of migrations) {
    if (applied.has(m.key)) continue;
    const sql = readSql(MIGRATIONS_DIR, m.upFile);
    await applyMigration(p, m.key, sql);
  }
}

/**
 * 清除所有业务数据（保留 schema_migrations），保持 schema 完好。
 * 用于测试间隔离。
 */
export async function truncateAllBusinessTables(): Promise<void> {
  const p = getTestPool();
  const result = await p.query<{ tablename: string }>(
    `select tablename from pg_tables
      where schemaname = 'public'
        and tablename <> 'schema_migrations'`,
  );
  const tables = result.rows.map((r) => `"${r.tablename}"`);
  if (tables.length > 0) {
    await p.query(`truncate ${tables.join(", ")} cascade`);
  }
}
