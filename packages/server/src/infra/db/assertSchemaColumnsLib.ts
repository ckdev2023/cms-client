import type { Pool } from "pg";

/**
 * 启动期需要存在性校验的关键 (table, column) 列表。
 *
 * 历史背景：BUG-108 / 109 / 096 都源自 server SQL 字符串里写的列名
 * 与当前 PG schema 漂移（重命名 / 删除 / 未跑 migration），但单测全部走
 * mockTx，CI 全绿；只有跑到真实 PG 才 500。本清单覆盖这些最容易出事的列，
 * 让 boot 期就 fail-fast 并指向 `npm run db:migrate`，与 BUG-100 的迁移
 * 应用校验形成上下两层兜底。
 *
 * 收录原则：只放「server 关键 SQL 字符串里写过、且 schema 漂移成本高」的列；
 * 不追求穷举，新增 P0 漂移即时回填即可。
 */
export const SERVER_CRITICAL_COLUMNS: readonly {
  table: string;
  column: string;
}[] = [
  { table: "customers", column: "base_profile" },
  { table: "users", column: "name" },
  { table: "reminders", column: "target_type" },
  { table: "reminders", column: "send_status" },
  { table: "reminders", column: "remind_at" },
];

type ColumnRow = { table_name: string; column_name: string };

/**
 * 校验给定的 (table, column) 列表全部存在于当前 schema。
 *
 * 通过单条 `information_schema.columns` 查询批量拉取所有目标表的列名，
 * 任一缺失即抛 fail-fast Error，附 `npm run db:migrate` 恢复 hint。
 *
 * @param pool PostgreSQL 连接池
 * @param required 需要校验的 (table, column) 列表，默认使用
 *   `SERVER_CRITICAL_COLUMNS`
 * @throws 当任一列缺失时抛出
 */
export async function assertCriticalSchemaColumns(
  pool: Pool,
  required: readonly {
    table: string;
    column: string;
  }[] = SERVER_CRITICAL_COLUMNS,
): Promise<void> {
  if (required.length === 0) return;

  const tables = [...new Set(required.map((r) => r.table))];
  const result = await pool.query<ColumnRow>(
    `select table_name, column_name
       from information_schema.columns
      where table_schema = current_schema()
        and table_name = any($1::text[])`,
    [tables],
  );

  const present = new Set(
    result.rows.map((row) => `${row.table_name}.${row.column_name}`),
  );
  const missing = required
    .filter((r) => !present.has(`${r.table}.${r.column}`))
    .map((r) => `${r.table}.${r.column}`);

  if (missing.length === 0) return;

  throw new Error(
    `[db] critical columns missing: ${missing.join(", ")}. ` +
      `Run \`npm run db:migrate\` from packages/server before starting the server.`,
  );
}
