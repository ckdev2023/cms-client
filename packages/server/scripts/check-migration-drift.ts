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
    const msg = err instanceof Error ? err.message : String(err);
    const isConnectionError =
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("timeout") ||
      msg.includes("Connection terminated");

    if (isConnectionError) {
      process.stdout.write(
        `[migration-drift] DB unreachable — skipping drift check (${msg})\n`,
      );
      return;
    }

    throw err;
  } finally {
    await pool.end();
  }
}

await main();
