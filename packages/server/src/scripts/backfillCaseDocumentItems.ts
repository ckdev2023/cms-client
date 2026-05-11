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
import {
  parseRequirementBlueprint,
  resolveCaseTypeCandidates,
} from "../modules/core/cases/cases.template.repository";
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

export const BACKFILL_CASES_QUERY = `
  SELECT c.id AS case_id, c.org_id, c.case_type_code
  FROM cases c
  WHERE NOT EXISTS (
    SELECT 1 FROM document_items di
     WHERE di.case_id = c.id
  )
    AND coalesce(c.metadata->>'_status','') IS DISTINCT FROM 'deleted'
`;

export const TEMPLATE_BY_CANDIDATES_QUERY = `
  SELECT requirement_blueprint
  FROM case_templates
  WHERE org_id = $1
    AND case_type = ANY($2::text[])
    AND active_flag = true
  ORDER BY array_position($2::text[], case_type), created_at DESC
  LIMIT 1
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

/**
 *
 */
export type PgClient = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

/**
 * resolveCaseTypeCandidates と同一ロジックでテンプレートを解決し BackfillCaseRow 配列を返す。
 *
 * (org_id, case_type_code) 単位でキャッシュするため同一組み合わせのクエリは 1 回のみ。
 * @param client DB接続クライアント
 * @returns 解決済みの BackfillCaseRow 配列
 */
export async function resolveBackfillRows(
  client: PgClient,
): Promise<BackfillCaseRow[]> {
  const { rows: cases } = await client.query(BACKFILL_CASES_QUERY);

  const blueprintCache = new Map<string, unknown>();
  const result: BackfillCaseRow[] = [];

  for (const c of cases) {
    const caseId = c.case_id as string;
    const orgId = c.org_id as string;
    const caseTypeCode = c.case_type_code as string;
    const cacheKey = `${orgId}:${caseTypeCode}`;

    if (!blueprintCache.has(cacheKey)) {
      const candidates = resolveCaseTypeCandidates(caseTypeCode);
      const { rows: tplRows } = await client.query(
        TEMPLATE_BY_CANDIDATES_QUERY,
        [orgId, candidates],
      );
      blueprintCache.set(cacheKey, tplRows[0]?.requirement_blueprint ?? null);
    }

    result.push({
      case_id: caseId,
      org_id: orgId,
      case_type_code: caseTypeCode,
      requirement_blueprint: blueprintCache.get(cacheKey) ?? null,
    });
  }

  return result;
}

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
    const rows = await resolveBackfillRows(client);
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
