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

import test, { after, before } from "node:test";
import assert from "node:assert/strict";

import { getTestPool, closeTestPool, migrateAndSeed } from "./setup";
import { DTO_SMOKE_ENTRIES } from "./dtoSmokeRegistry";

before(async () => {
  await migrateAndSeed();
});

after(async () => {
  await closeTestPool();
});

for (const entry of DTO_SMOKE_ENTRIES) {
  void test(`[DTO smoke] ${entry.label}`, async () => {
    const pool = getTestPool();
    const explainSql = `explain (costs off) ${entry.sql}`;
    try {
      await pool.query(explainSql);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      assert.fail(
        `EXPLAIN failed for "${entry.label}":\n${msg}\n\nSQL:\n${entry.sql}`,
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
