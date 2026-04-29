import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  SERVER_CRITICAL_COLUMNS,
  assertCriticalSchemaColumns,
} from "./assertSchemaColumnsLib";

type ColumnRow = { table_name: string; column_name: string };
type QueryArgs = { sql: string; params?: unknown[] };

function makePool(rows: ColumnRow[]): { pool: Pool; calls: QueryArgs[] } {
  const calls: QueryArgs[] = [];
  const pool = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      return Promise.resolve({ rows });
    },
  } as unknown as Pool;
  return { pool, calls };
}

void test("assertCriticalSchemaColumns is silent when all default critical columns exist", async () => {
  const rows = SERVER_CRITICAL_COLUMNS.map((c) => ({
    table_name: c.table,
    column_name: c.column,
  }));
  const { pool, calls } = makePool(rows);
  await assertCriticalSchemaColumns(pool);

  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /information_schema\.columns/i);
  const params = calls[0].params as string[][];
  assert.ok(Array.isArray(params));
  assert.deepEqual(
    [...params[0]].sort(),
    [...new Set(SERVER_CRITICAL_COLUMNS.map((c) => c.table))].sort(),
  );
});

void test("assertCriticalSchemaColumns throws fail-fast hint when a critical column is missing", async () => {
  const [head, ...rest] = SERVER_CRITICAL_COLUMNS;
  const rows = rest.map((c) => ({
    table_name: c.table,
    column_name: c.column,
  }));
  const { pool } = makePool(rows);

  await assert.rejects(
    () => assertCriticalSchemaColumns(pool),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, new RegExp(`${head.table}\\.${head.column}`));
      assert.match(err.message, /npm run db:migrate/);
      return true;
    },
  );
});

void test("assertCriticalSchemaColumns lists every missing column when several drift at once", async () => {
  const { pool } = makePool([]);
  const required = [
    { table: "customers", column: "base_profile" },
    { table: "users", column: "name" },
  ];

  await assert.rejects(
    () => assertCriticalSchemaColumns(pool, required),
    (err) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /customers\.base_profile/);
      assert.match(err.message, /users\.name/);
      return true;
    },
  );
});

void test("assertCriticalSchemaColumns is a noop when required list is empty", async () => {
  const { pool, calls } = makePool([]);
  await assertCriticalSchemaColumns(pool, []);
  assert.equal(calls.length, 0);
});
