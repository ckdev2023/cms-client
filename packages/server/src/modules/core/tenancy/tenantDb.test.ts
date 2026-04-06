import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { createTenantDb } from "./tenantDb";

void test("createTenantDb sets org_id in transaction", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };

  type PoolLike = {
    connect: () => Promise<PoolClientLike>;
  };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = {
    connect: () => Promise.resolve(client),
  };

  const db = createTenantDb(
    pool as unknown as Pool,
    "00000000-0000-4000-8000-000000000000",
  );
  await db.query("select 1", []);

  assert.equal(calls[0].sql, "begin");
  assert.equal(calls[1].sql, "select set_config('app.org_id', $1, true)");
  assert.deepEqual(calls[1].params, ["00000000-0000-4000-8000-000000000000"]);
  assert.equal(calls[2].sql, "select 1");
  assert.equal(calls[3].sql, "commit");
});

void test("createTenantDb sets actor_user_id when provided", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };

  type PoolLike = {
    connect: () => Promise<PoolClientLike>;
  };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = {
    connect: () => Promise.resolve(client),
  };

  const db = createTenantDb(
    pool as unknown as Pool,
    "00000000-0000-4000-8000-000000000000",
    "00000000-0000-4000-8000-000000000001",
  );
  await db.query("select 1", []);

  assert.equal(calls[0].sql, "begin");
  assert.equal(calls[1].sql, "select set_config('app.org_id', $1, true)");
  assert.deepEqual(calls[1].params, ["00000000-0000-4000-8000-000000000000"]);
  assert.equal(calls[2].sql, "select set_config('app.actor_user_id', $1, true)");
  assert.deepEqual(calls[2].params, ["00000000-0000-4000-8000-000000000001"]);
  assert.equal(calls[3].sql, "select 1");
  assert.equal(calls[4].sql, "commit");
});
