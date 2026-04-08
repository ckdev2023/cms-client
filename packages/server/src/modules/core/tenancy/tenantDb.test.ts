import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { createTenantDb, createTenantDrizzleRepository } from "./tenantDb";

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
  assert.equal(
    calls[2].sql,
    "select set_config('app.actor_user_id', $1, true)",
  );
  assert.deepEqual(calls[2].params, ["00000000-0000-4000-8000-000000000001"]);
  assert.equal(calls[3].sql, "select 1");
  assert.equal(calls[4].sql, "commit");
});

void test("createTenantDrizzleRepository exposes tenant-scoped assertBelongsToOrg", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: unknown, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };

  type PoolLike = {
    connect: () => Promise<PoolClientLike>;
  };

  function toSqlText(sql: unknown): string {
    if (typeof sql === "string") {
      return sql.trim().replaceAll('"', "").replace(/\s+/g, " ");
    }
    if (
      sql &&
      typeof sql === "object" &&
      "text" in sql &&
      typeof (sql as { text?: unknown }).text === "string"
    ) {
      return (sql as { text: string }).text
        .trim()
        .replaceAll('"', "")
        .replace(/\s+/g, " ");
    }
    return String(sql).trim().replaceAll('"', "").replace(/\s+/g, " ");
  }

  function toParams(sql: unknown, params?: unknown[]): unknown[] | undefined {
    if (params) return params;
    if (
      sql &&
      typeof sql === "object" &&
      "values" in sql &&
      Array.isArray((sql as { values?: unknown[] }).values)
    ) {
      return (sql as { values: unknown[] }).values;
    }
    return undefined;
  }

  const client: PoolClientLike = {
    query: (sql: unknown, params?: unknown[]) => {
      const normalized = toSqlText(sql);
      calls.push({ sql: normalized, params: toParams(sql, params) });
      if (normalized.includes("select id from cases")) {
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool: PoolLike = {
    connect: () => Promise.resolve(client),
  };

  const repo = createTenantDrizzleRepository(
    pool as unknown as Pool,
    "00000000-0000-4000-8000-000000000000",
    "00000000-0000-4000-8000-000000000001",
    ["cases"],
  );

  await repo.transaction(async (session) => {
    await session.assertBelongsToOrg("cases", "case-1");
  });

  assert.equal(calls[0].sql, "begin");
  assert.equal(calls[1].sql, "select set_config('app.org_id', $1, true)");
  assert.equal(
    calls[2].sql,
    "select set_config('app.actor_user_id', $1, true)",
  );
  assert.ok(
    calls.some((call) =>
      call.sql.includes("select id from cases where id = $1"),
    ),
  );
  assert.equal(calls.at(-1)?.sql, "commit");
});

void test("createTenantDrizzleRepository rejects disallowed assert tables", async () => {
  const client = {
    query: () => Promise.resolve({ rows: [] }),
    release: () => undefined,
  };

  const pool = {
    connect: () => Promise.resolve(client),
  };

  const repo = createTenantDrizzleRepository(
    pool as unknown as Pool,
    "00000000-0000-4000-8000-000000000000",
    undefined,
    ["cases"],
  );

  await assert.rejects(
    () =>
      repo.query(async (session) => {
        await session.assertBelongsToOrg("users", "user-1");
      }),
    /disallowed table "users"/,
  );
});
