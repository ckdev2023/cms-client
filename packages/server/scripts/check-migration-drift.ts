/**
 * Migration drift guard — DB の schema_migrations とディスク上の *.up.sql を突合し、
 * 未適用のマイグレーションがあれば非 0 で終了する。
 *
 * DB 接続不可の場合は警告のみ出して exit 0（CI 等 DB 不在の環境を壊さない）。
 *
 * 使い方:
 *   tsx --env-file=.env scripts/check-migration-drift.ts
 */

import path from "node:path";
import { Pool } from "pg";

import { findPendingMigrationKeys } from "../src/infra/db/runMigrationsLib";

const MIGRATIONS_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../src/infra/db/migrations",
);

const CONNECTION_ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

const CONNECTION_ERROR_MESSAGES = [
  "ECONNREFUSED",
  "ENOTFOUND",
  "timeout",
  "Connection terminated",
];

/**
 * 判定是否为「DB 连不上」类错误。
 *
 * 注意不能只看 `err.message`：pg-pool 在连接失败时抛出的是 AggregateError，
 * 其 `message` 为空字符串，错误信息只存在于 `code` 与嵌套的 `errors[]` 中
 * （表现为 `AggregateError [ECONNREFUSED]:` 后无内容）。仅匹配 message 会
 * 让本脚本在无 DB 环境下崩溃，违背「DB 不在时 warn 并 exit 0」的契约。
 * @param err 捕获到的异常
 * @returns 是否为连接类错误
 */
function isConnectionError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;

  const code: unknown = (err as { code?: unknown }).code;
  if (typeof code === "string" && CONNECTION_ERROR_CODES.has(code)) return true;

  const msg = err instanceof Error ? err.message : "";
  if (CONNECTION_ERROR_MESSAGES.some((needle) => msg.includes(needle))) {
    return true;
  }

  const nested: unknown = (err as { errors?: unknown }).errors;
  return Array.isArray(nested) && nested.some(isConnectionError);
}

/**
 * 生成可读的错误描述（AggregateError 的 message 为空时回退到 code）。
 * @param err 捕获到的异常
 * @returns 描述文本
 */
function describeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg) return msg;
  const code: unknown = (err as { code?: unknown }).code;
  return typeof code === "string" ? code : "unknown error";
}

async function main(): Promise<void> {
  const dbUrl = process.env.DB_URL;
  if (!dbUrl) {
    process.stdout.write(
      "[migration-drift] DB_URL not set — skipping drift check\n",
    );
    return;
  }

  const pool = new Pool({
    connectionString: dbUrl,
    max: 2,
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
  });

  try {
    const pending = await findPendingMigrationKeys(pool, MIGRATIONS_DIR);

    if (pending.length === 0) {
      process.stdout.write("[migration-drift] ok — no drift detected\n");
      return;
    }

    process.stderr.write(
      `[migration-drift] DRIFT DETECTED — ${String(pending.length)} pending migration(s):\n`,
    );
    for (const key of pending) {
      process.stderr.write(`  - ${key}\n`);
    }
    process.stderr.write(
      `\nRun \`npm run db:migrate\` from packages/server to apply.\n`,
    );
    process.exitCode = 1;
  } catch (err: unknown) {
    if (isConnectionError(err)) {
      process.stdout.write(
        `[migration-drift] DB unreachable — skipping drift check (${describeError(err)})\n`,
      );
      return;
    }

    throw err;
  } finally {
    await pool.end();
  }
}

await main();
