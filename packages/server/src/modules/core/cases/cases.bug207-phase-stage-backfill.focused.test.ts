import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BUSINESS_PHASES,
  type BusinessPhase,
  PHASE_TO_STAGE_DEFAULT,
} from "./businessPhase";

const __dirname = dirname(fileURLToPath(import.meta.url));

const MIGRATION_PATH = resolve(
  __dirname,
  "../../../infra/db/migrations/042_phase_stage_consistency_backfill.up.sql",
);

const migrationSql = readFileSync(MIGRATION_PATH, "utf-8");

/**
 * 从 SQL CASE WHEN 块中提取 `WHEN '<phase>' THEN '<stage>'` 对。
 * 只取 SET 子句里的第一个 CASE block（到第一个 END 为止）。
 * @param sql migration SQL 全文
 * @returns phase→stage 映射
 */
function parseCaseWhenPairs(sql: string): Map<string, string> {
  const setMatch = /SET\s+stage\s*=\s*CASE\s+business_phase([\s\S]*?)END/.exec(
    sql,
  );
  assert.ok(setMatch, "Could not find SET stage = CASE block in migration SQL");

  const pairs = new Map<string, string>();
  const whenPattern = /WHEN\s+'([A-Z_]+)'\s+THEN\s+'(S\d)'/g;
  let m: RegExpExecArray | null;
  while ((m = whenPattern.exec(setMatch[1])) !== null) {
    pairs.set(m[1], m[2]);
  }
  return pairs;
}

void describe("BUG-207 migration 042 — SQL↔PHASE_TO_STAGE_DEFAULT consistency", () => {
  const sqlPairs = parseCaseWhenPairs(migrationSql);

  void test("SQL CASE WHEN covers all 20 business phases", () => {
    for (const phase of BUSINESS_PHASES) {
      assert.ok(
        sqlPairs.has(phase),
        `Phase "${phase}" missing from migration SQL CASE WHEN`,
      );
    }
  });

  void test("SQL has no extra phases beyond BUSINESS_PHASES", () => {
    const phaseSet = new Set<string>(BUSINESS_PHASES);
    for (const phase of sqlPairs.keys()) {
      assert.ok(
        phaseSet.has(phase),
        `Migration SQL has unknown phase "${phase}" not in BUSINESS_PHASES`,
      );
    }
  });

  void test("every SQL WHEN→THEN pair matches PHASE_TO_STAGE_DEFAULT", () => {
    for (const phase of BUSINESS_PHASES) {
      const expected = PHASE_TO_STAGE_DEFAULT[phase];
      const actual = sqlPairs.get(phase) ?? "(missing)";
      assert.equal(
        actual,
        expected,
        `Phase "${phase}": SQL maps to ${actual}, but PHASE_TO_STAGE_DEFAULT maps to ${expected}`,
      );
    }
  });

  void test("SET block and WHERE block have identical CASE WHEN mappings", () => {
    const caseBlocks = [
      ...migrationSql.matchAll(/CASE\s+business_phase([\s\S]*?)END/g),
    ];
    assert.equal(
      caseBlocks.length,
      2,
      `Expected exactly 2 CASE blocks (SET + WHERE), got ${String(caseBlocks.length)}`,
    );

    const extract = (block: string): [string, string][] => {
      const pairs: [string, string][] = [];
      const pat = /WHEN\s+'([A-Z_]+)'\s+THEN\s+'(S\d)'/g;
      let m: RegExpExecArray | null;
      while ((m = pat.exec(block)) !== null) {
        pairs.push([m[1], m[2]]);
      }
      return pairs;
    };

    const setPairs = extract(caseBlocks[0][1]);
    const wherePairs = extract(caseBlocks[1][1]);

    assert.deepEqual(
      setPairs,
      wherePairs,
      "SET and WHERE CASE WHEN blocks must be identical for idempotency",
    );
  });
});

void describe("BUG-207 migration 042 — dirty data simulation", () => {
  const DIRTY_CASES: { phase: BusinessPhase; wrongStage: string }[] = [
    { phase: "WAITING_PAYMENT", wrongStage: "S1" },
    { phase: "WAITING_PAYMENT", wrongStage: "S1" },
    { phase: "WAITING_PAYMENT", wrongStage: "S1" },
    { phase: "WAITING_PAYMENT", wrongStage: "S1" },
    { phase: "WAITING_PAYMENT", wrongStage: "S1" },
    { phase: "WAITING_PAYMENT", wrongStage: "S1" },
    { phase: "WAITING_MATERIAL", wrongStage: "S1" },
    { phase: "SUCCESS", wrongStage: "S1" },
    { phase: "RENEWAL_REMINDER_SCHEDULED", wrongStage: "S1" },
  ];

  void test("all 9 dirty cases would be corrected by the migration mapping", () => {
    for (const { phase, wrongStage } of DIRTY_CASES) {
      const correctStage = PHASE_TO_STAGE_DEFAULT[phase];
      assert.notEqual(
        wrongStage,
        correctStage,
        `Dirty case (${phase}, ${wrongStage}) is actually already correct — test setup error`,
      );
    }
  });

  void test("after applying mapping, all 9 dirty cases land on PHASE_TO_STAGE_DEFAULT", () => {
    for (const { phase } of DIRTY_CASES) {
      const sqlPairs = parseCaseWhenPairs(migrationSql);
      const sqlTarget = sqlPairs.get(phase) ?? "(missing)";
      const expected = PHASE_TO_STAGE_DEFAULT[phase];
      assert.equal(
        sqlTarget,
        expected,
        `Phase "${phase}": SQL would set stage=${sqlTarget}, expected=${expected}`,
      );
    }
  });

  void test("idempotency: already-correct rows would NOT be touched (WHERE clause excludes them)", () => {
    assert.ok(
      migrationSql.includes("AND stage <>"),
      "Migration must include `AND stage <>` to ensure idempotency",
    );

    for (const phase of BUSINESS_PHASES) {
      const correctStage = PHASE_TO_STAGE_DEFAULT[phase];
      const sqlPairs = parseCaseWhenPairs(migrationSql);
      const sqlTarget = sqlPairs.get(phase) ?? "(missing)";
      assert.equal(
        sqlTarget,
        correctStage,
        `WHERE clause idempotency: phase "${phase}" maps to ${sqlTarget} in SQL but ${correctStage} in PHASE_TO_STAGE_DEFAULT`,
      );
    }
  });
});
