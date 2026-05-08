import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { PoolClient, QueryResult } from "pg";

import { buildSeedSteps } from "./seedDevData";

type QueryCall = { sql: string; params?: unknown[] };

function createMockClient(): { client: PoolClient; queries: QueryCall[] } {
  const queries: QueryCall[] = [];
  const client = {
    query: (sql: string, params?: unknown[]): Promise<QueryResult> => {
      queries.push({ sql, params });
      if (/SELECT count\(\*\).*FROM users/i.test(sql)) {
        return Promise.resolve({
          rows: [{ cnt: "1" }],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });
      }
      if (/SELECT id FROM roles/i.test(sql)) {
        return Promise.resolve({
          rows: [{ id: "mock-staff-role-id" }],
          rowCount: 1,
          command: "SELECT",
          oid: 0,
          fields: [],
        });
      }
      return Promise.resolve({
        rows: [],
        rowCount: 0,
        command: "",
        oid: 0,
        fields: [],
      });
    },
  } as unknown as PoolClient;
  return { client, queries };
}

void test("seedCases SQL uses ON CONFLICT (id) DO UPDATE for content self-healing", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");

  const caseInsertRe =
    /INSERT INTO cases[\s\S]*?ON CONFLICT \(id\)\s+DO\s+(NOTHING|UPDATE)/g;
  const matches = [...source.matchAll(caseInsertRe)];
  assert.ok(
    matches.length >= 2,
    "expected at least 2 INSERT INTO cases blocks (loop + BMV)",
  );

  for (const m of matches) {
    assert.equal(
      m[1],
      "UPDATE",
      `every INSERT INTO cases must use DO UPDATE (was DO NOTHING) — guard against re-introducing CASE-DEV-002 DATA-STALE; matched at offset ${String(m.index)}`,
    );
  }
});

void test("seedCases DO UPDATE overwrites case_type_code and case_name (CASE-DEV-002 self-heal)", async () => {
  const steps = buildSeedSteps();
  const { client, queries } = createMockClient();

  const casesStep = steps.find(([label]) => label === "cases");
  assert.ok(casesStep, "expected 'cases' seed step to exist");
  await casesStep[1](client);

  const caseInserts = queries.filter((q) => /INSERT INTO cases/i.test(q.sql));
  assert.ok(
    caseInserts.length >= 2,
    "expected at least 2 INSERT INTO cases queries (loop CASE-DEV-001/002 + CASE-DEV-003 BMV)",
  );

  for (const q of caseInserts) {
    assert.match(
      q.sql,
      /ON CONFLICT \(id\)\s+DO UPDATE SET/i,
      `INSERT INTO cases must DO UPDATE on conflict: ${q.sql.slice(0, 80)}`,
    );
    assert.match(
      q.sql,
      /case_type_code\s*=\s*EXCLUDED\.case_type_code/i,
      `DO UPDATE SET must overwrite case_type_code (root cause of 70 NEW-3): ${q.sql.slice(0, 80)}`,
    );
    assert.match(
      q.sql,
      /case_name\s*=\s*EXCLUDED\.case_name/i,
      `DO UPDATE SET must overwrite case_name to keep title aligned with type: ${q.sql.slice(0, 80)}`,
    );
  }
});

void test("seedCases DO UPDATE preserves status / stage / business_phase (do not reset dev-edited state)", () => {
  const scriptPath = path.resolve(
    new URL(".", import.meta.url).pathname,
    "seedDevData.ts",
  );
  const source = fs.readFileSync(scriptPath, "utf8");

  const caseInsertBlocks = [
    ...source.matchAll(
      /INSERT INTO cases[\s\S]*?ON CONFLICT \(id\)\s+DO UPDATE SET[\s\S]*?(?=\s*`,)/g,
    ),
  ].map((m) => m[0]);

  assert.ok(
    caseInsertBlocks.length >= 2,
    "expected at least 2 INSERT INTO cases DO UPDATE blocks",
  );

  for (const block of caseInsertBlocks) {
    const updateClause = /DO UPDATE SET([\s\S]*)/.exec(block)?.[1] ?? "";
    assert.doesNotMatch(
      updateClause,
      /\bstatus\s*=\s*EXCLUDED\.status\b/,
      "DO UPDATE must not reset status (would clobber dev-edited state)",
    );
    assert.doesNotMatch(
      updateClause,
      /\bstage\s*=\s*EXCLUDED\.stage\b/,
      "DO UPDATE must not reset stage (would clobber dev-edited state)",
    );
    assert.doesNotMatch(
      updateClause,
      /\bbusiness_phase\s*=\s*EXCLUDED\.business_phase\b/,
      "DO UPDATE must not reset business_phase (would clobber dev-edited state)",
    );
  }
});
