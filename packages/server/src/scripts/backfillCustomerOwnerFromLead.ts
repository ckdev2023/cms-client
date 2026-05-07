/**
 * 一次性 backfill 脚本：按 leads.converted_customer_id = customers.id 把
 * 缺位的 ownerUserId / groupId / visaType 回填到 customers.base_profile。
 *
 * 仅在生产 / demo 环境一次性运行，不挂到 db:seed-dev。
 *
 * 用法：
 *   DB_URL=postgres://... npx tsx src/scripts/backfillCustomerOwnerFromLead.ts
 *   # 或在有 .env 的环境下：
 *   npx tsx --env-file=.env src/scripts/backfillCustomerOwnerFromLead.ts
 *
 * DRY_RUN=1 模式下只打印将要更新的行，不实际写入。
 */

import { createPgPool } from "../infra/db/createPgPool";
import { mapIntendedCaseTypeToCustomerVisaType } from "../modules/core/leads/leads.admin.convert";

/** leads → customers バックフィル対象行。 */
type BackfillRow = {
  customer_id: string;
  base_profile: Record<string, unknown>;
  owner_user_id: string | null;
  assigned_user_id: string | null;
  group_id: string | null;
  intended_case_type: string | null;
};

/** バックフィル時に customers.base_profile へマージする差分。 */
type BackfillPatch = {
  ownerUserId?: string;
  groupId?: string;
  visaType?: string;
};

/**
 * 行ごとに不足フィールドを検出してパッチを構築する。
 *
 * @param row - leads JOIN customers の結果行
 * @returns 差分パッチ。不足なしなら `null`
 */
function buildPatch(row: BackfillRow): BackfillPatch | null {
  const bp = row.base_profile;
  const patch: BackfillPatch = {};

  if (!bp.ownerUserId) {
    const owner = row.assigned_user_id ?? row.owner_user_id;
    if (owner) patch.ownerUserId = owner;
  }

  if (!bp.groupId && row.group_id) {
    patch.groupId = row.group_id;
  }

  if (!bp.visaType && row.intended_case_type) {
    const visa = mapIntendedCaseTypeToCustomerVisaType(row.intended_case_type);
    if (visa) patch.visaType = visa;
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export { buildPatch, type BackfillRow, type BackfillPatch };

const BACKFILL_QUERY = `
  SELECT c.id AS customer_id, c.base_profile,
         l.owner_user_id, l.assigned_user_id,
         l.group_id, l.intended_case_type
  FROM customers c
  JOIN leads l ON l.converted_customer_id = c.id
  WHERE l.converted_customer_id IS NOT NULL
`;

type PgClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

async function applyBackfill(
  client: PgClient,
  rows: BackfillRow[],
  dryRun: boolean,
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;
  if (!dryRun) await client.query("BEGIN");

  for (const row of rows) {
    const patch = buildPatch(row);
    if (!patch) {
      skipped++;
      continue;
    }
    if (dryRun) {
      process.stdout.write(
        `[dry-run] customer=${row.customer_id} patch=${JSON.stringify(patch)}\n`,
      );
    } else {
      await client.query(
        `UPDATE customers
         SET base_profile = base_profile || $2::jsonb, updated_at = now()
         WHERE id = $1`,
        [row.customer_id, JSON.stringify(patch)],
      );
    }
    updated++;
  }

  if (!dryRun) await client.query("COMMIT");
  return { updated, skipped };
}

async function main() {
  const dryRun = process.env.DRY_RUN === "1";
  const dbUrl = process.env.DB_URL?.trim();
  if (!dbUrl) throw new Error("DB_URL environment variable is required");

  const pool = createPgPool(dbUrl);
  const client = await pool.connect();

  try {
    const { rows } = await client.query<BackfillRow>(BACKFILL_QUERY);
    const { updated, skipped } = await applyBackfill(client, rows, dryRun);
    const mode = dryRun ? "dry-run" : "committed";
    process.stdout.write(
      `[backfill] ${mode}: ${String(updated)} updated, ${String(skipped)} skipped, ${String(rows.length)} total\n`,
    );
  } catch (error) {
    if (!dryRun) await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

const isDirectRun =
  process.argv[1]?.endsWith("backfillCustomerOwnerFromLead.ts") ?? false;
if (isDirectRun) {
  await main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[backfill] failed: ${message}\n`);
    process.exitCode = 1;
  });
}
