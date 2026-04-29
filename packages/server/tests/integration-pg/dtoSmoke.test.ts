/**
 * DTO 烟雾测试 — 对真 PG 执行 EXPLAIN 验证所有 DTO SELECT 语法正确。
 *
 * 运行方式：
 *   npm run test:integration-pg      (需要先启容器)
 *
 * 前置：
 *   docker compose -f docker-compose.integration.yml up -d
 *   npm run db:migrate（由 setup 自动执行）
 */

import fs from "node:fs";
import path from "node:path";
import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import { getTestPool, closeTestPool, migrateAndSeed } from "./setup";
import {
  DTO_SMOKE_ENTRIES,
  PRODUCTION_SQL_SOURCE_FILES,
  DRIFT_PATTERNS,
} from "./dtoSmokeRegistry";

before(async () => {
  await migrateAndSeed();
});

after(async () => {
  await closeTestPool();
});

// ─── Group 1: EXPLAIN 真 PG ────────────────────────────────────

for (const entry of DTO_SMOKE_ENTRIES) {
  void test(`[DTO smoke] ${entry.label}`, async () => {
    const pool = getTestPool();
    const sql = entry.buildSql();
    const explainSql = `explain (costs off) ${sql}`;
    try {
      await pool.query(explainSql);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      assert.fail(
        `EXPLAIN failed for "${entry.label}":\n${msg}\n\nSQL:\n${sql}`,
      );
    }
  });
}

void test("[DTO smoke] assertCriticalSchemaColumns passes on real PG", async () => {
  const { assertCriticalSchemaColumns } =
    await import("../../src/infra/db/assertSchemaColumnsLib");
  const pool = getTestPool();
  await assertCriticalSchemaColumns(pool);
});

// ─── Group 2: production source drift detection ────────────────

const SERVER_ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../..",
);

/**
 * 从 TS 源码中提取「SQL 字符串字面量」行。
 * 策略：抓所有 backtick template literal 内容 — SQL 常量有些只含列名/JOIN
 * 片段而不含关键字（如 GD_DTO_SELECT），仅靠关键字过滤会漏检。
 */
function extractTemplateLiteralLines(source: string): string[] {
  const lines: string[] = [];
  const templateRegex = /`([^`]*)`/g;
  let m: RegExpExecArray | null;
  while ((m = templateRegex.exec(source)) !== null) {
    lines.push(...m[1].split("\n"));
  }
  return lines;
}

for (const relPath of PRODUCTION_SQL_SOURCE_FILES) {
  void test(`[DTO drift] ${relPath} has no drifted column references`, () => {
    const absPath = path.join(SERVER_ROOT, relPath);
    const source = fs.readFileSync(absPath, "utf-8");
    const sqlLines = extractTemplateLiteralLines(source);

    for (const { pattern, description } of DRIFT_PATTERNS) {
      const hits: string[] = [];

      for (const line of sqlLines) {
        if (!pattern.test(line)) continue;
        hits.push(line.trim());
      }

      assert.equal(
        hits.length,
        0,
        `Drift detected in ${relPath}:\n  Pattern: ${String(pattern)}\n  Reason: ${description}\n  Matches:\n    ${hits.join("\n    ")}`,
      );
    }
  });
}
