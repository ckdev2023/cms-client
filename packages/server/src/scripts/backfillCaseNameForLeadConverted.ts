/**
 * 一次性 backfill 脚本：為 lead 転化で case_name が NULL のまま作られた案件に、
 * composeCaseName 同等ロジックで可読名を書き戻す。
 *
 * 対象：case_name IS NULL かつ leads テーブルに converted_case_id で紐づく案件。
 *
 * 用法：
 *   DB_URL=postgres://... npx tsx src/scripts/backfillCaseNameForLeadConverted.ts
 *   # DRY_RUN=1 で書き込みなし確認
 *   DRY_RUN=1 DB_URL=postgres://... npx tsx src/scripts/backfillCaseNameForLeadConverted.ts
 */

import { createPgPool } from "../infra/db/createPgPool";
import { getCaseTypeLabelJa } from "../modules/core/cases/caseTypeLabels.ja";

/**
 * backfill 対象行の最小投影（cases × leads JOIN 結果から取得）。
 */
export type BackfillCaseNameRow = {
  case_id: string;
  case_type_code: string;
  lead_name: string | null;
};

export const BACKFILL_CASE_NAME_QUERY = `
  SELECT ca.id AS case_id,
         ca.case_type_code,
         l.name AS lead_name
  FROM cases ca
  INNER JOIN leads l ON l.converted_case_id = ca.id
  WHERE ca.case_name IS NULL
`;

/**
 * backfill 対象行から ja-JP ラベルで case_name を合成する。
 * `composeCaseName`（leads.admin.convert-case）と同等のロジック。
 *
 * @param row backfill 対象行（cases × leads JOIN 結果の最小投影）。
 * @returns 合成した case_name。情報不足で組み立て不能なら null。
 */
export function composeCaseNameFromRow(
  row: BackfillCaseNameRow,
): string | null {
  const trimmed = row.lead_name?.trim() ?? "";
  const applicant = trimmed.length > 0 ? trimmed : null;
  const typeLabel = getCaseTypeLabelJa(row.case_type_code) ?? null;
  const parts = [applicant, typeLabel].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}

type PgClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

/**
 * 行リストに対して backfill UPDATE を発行する（dry-run 対応）。
 *
 * @param client pg クライアント（query 互換 API のみ使用）。
 * @param rows backfill 対象行の配列。
 * @param dryRun true の場合は UPDATE を発行せずログのみ出力する。
 * @returns 更新件数 / スキップ件数の集計。
 */
export async function applyBackfillCaseName(
  client: PgClient,
  rows: BackfillCaseNameRow[],
  dryRun: boolean,
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;
  if (!dryRun) await client.query("BEGIN");

  for (const row of rows) {
    const caseName = composeCaseNameFromRow(row);
    if (!caseName) {
      skipped++;
      continue;
    }
    if (dryRun) {
      process.stdout.write(
        `[dry-run] case=${row.case_id} caseName="${caseName}"\n`,
      );
    } else {
      await client.query(
        `UPDATE cases SET case_name = $1, updated_at = now() WHERE id = $2 AND case_name IS NULL`,
        [caseName, row.case_id],
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
    const { rows } = await client.query<BackfillCaseNameRow>(
      BACKFILL_CASE_NAME_QUERY,
    );
    const { updated, skipped } = await applyBackfillCaseName(
      client,
      rows,
      dryRun,
    );
    const mode = dryRun ? "dry-run" : "committed";
    process.stdout.write(
      `[backfill-case-name] ${mode}: ${String(updated)} updated, ${String(skipped)} skipped, ${String(rows.length)} total\n`,
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
  process.argv[1]?.endsWith("backfillCaseNameForLeadConverted.ts") ?? false;
if (isDirectRun) {
  await main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[backfill-case-name] failed: ${message}\n`);
    process.exitCode = 1;
  });
}
