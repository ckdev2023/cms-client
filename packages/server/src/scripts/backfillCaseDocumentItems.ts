/**
 * 一次性 backfill 脚本：为 document_items=0 の存量 case 从对应 case_templates
 * の requirement_blueprint JSONB 重建 document_items 行。
 *
 * 仅在生产 / demo 環境一次性运行，不挂到 db:seed-dev。
 *
 * 用法：
 *   DB_URL=postgres://... npx tsx src/scripts/backfillCaseDocumentItems.ts
 *   # 或在有 .env 的环境下：
 *   npx tsx --env-file=.env src/scripts/backfillCaseDocumentItems.ts
 *
 * DRY_RUN=1 模式下只打印将要插入的行，不实际写入。
 */

import { createPgPool } from "../infra/db/createPgPool";
import { parseRequirementBlueprint } from "../modules/core/cases/cases.template.repository";
import type { ChecklistItem } from "../modules/core/cases/cases.service.write-ops";

/**
 *
 */
export type BackfillCaseRow = {
  case_id: string;
  org_id: string;
  case_type_code: string;
  requirement_blueprint: unknown;
};

// BMV 子类型（biz_mgmt_*）当前共享 case_type='business_manager_visa' 模板蓝图，
// 因此先按精确 case_type 匹配，匹配不到时 BMV 系列回退到总表。
export const BACKFILL_QUERY = `
  SELECT c.id AS case_id, c.org_id, c.case_type_code,
         coalesce(t_exact.requirement_blueprint, t_bmv.requirement_blueprint)
           AS requirement_blueprint
  FROM cases c
  LEFT JOIN case_templates t_exact
    ON t_exact.org_id = c.org_id
   AND t_exact.case_type = c.case_type_code
   AND t_exact.active_flag = true
  LEFT JOIN case_templates t_bmv
    ON t_bmv.org_id = c.org_id
   AND t_bmv.case_type = 'business_manager_visa'
   AND t_bmv.active_flag = true
   AND (c.case_type_code LIKE 'biz_mgmt%')
   AND t_exact.id IS NULL
  WHERE NOT EXISTS (
    SELECT 1 FROM document_items di
     WHERE di.case_id = c.id
  )
    AND coalesce(c.metadata->>'_status','') IS DISTINCT FROM 'deleted'
`;

/**
 * テンプレートの requirement_blueprint JSONB からチェックリスト項目を抽出する。
 *
 * @param blueprint - case_templates.requirement_blueprint の生値
 * @returns パース済みチェックリスト配列（無効値なら空配列）
 */
export function buildItemsFromBlueprint(blueprint: unknown): ChecklistItem[] {
  return parseRequirementBlueprint(blueprint);
}

type PgClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

/**
 * document_items が存在しない case に対し、テンプレート blueprint から項目を一括挿入する。
 *
 * @param client - PG クライアント（トランザクション制御に使用）
 * @param rows - BACKFILL_QUERY の結果行
 * @param dryRun - true の場合 DB 書き込みせず stdout にログのみ出力
 * @returns 更新件数とスキップ件数
 */
export async function applyBackfill(
  client: PgClient,
  rows: BackfillCaseRow[],
  dryRun: boolean,
): Promise<{ updated: number; skipped: number }> {
  let updated = 0;
  let skipped = 0;
  if (!dryRun) await client.query("BEGIN");

  for (const row of rows) {
    const items = buildItemsFromBlueprint(row.requirement_blueprint);
    if (items.length === 0) {
      skipped++;
      continue;
    }
    if (dryRun) {
      process.stdout.write(
        `[dry-run] case=${row.case_id} items=${String(items.length)}\n`,
      );
    } else {
      for (const item of items) {
        await client.query(
          `INSERT INTO document_items (org_id, case_id, checklist_item_code, name, status, owner_side, category, required_flag, provided_by_role)
           VALUES ($1,$2,$3,$4,'pending',$5,$6,$7,$8)`,
          [
            row.org_id,
            row.case_id,
            item.code,
            item.name,
            item.ownerSide ?? "applicant",
            item.category ?? null,
            item.requiredFlag ?? false,
            item.providedByRole ?? null,
          ],
        );
      }
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
    const { rows } = await client.query<BackfillCaseRow>(BACKFILL_QUERY);
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
  process.argv[1]?.endsWith("backfillCaseDocumentItems.ts") ?? false;
if (isDirectRun) {
  await main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`[backfill] failed: ${message}\n`);
    process.exitCode = 1;
  });
}
