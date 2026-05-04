import test from "node:test";
import assert from "node:assert/strict";
import { createTenantDb, createTenantDrizzleRepository } from "./tenantDb";
void test("createTenantDb sets org_id in transaction", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = {
    connect: () => Promise.resolve(client),
  };
  const db = createTenantDb(pool, "00000000-0000-4000-8000-000000000000");
  await db.query("select 1", []);
  assert.equal(calls[0].sql, "begin");
  assert.equal(calls[1].sql, "select set_config('app.org_id', $1, true)");
  assert.deepEqual(calls[1].params, ["00000000-0000-4000-8000-000000000000"]);
  assert.equal(calls[2].sql, "select 1");
  assert.equal(calls[3].sql, "commit");
});
void test("createTenantDb sets actor_user_id when provided", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = {
    connect: () => Promise.resolve(client),
  };
  const db = createTenantDb(
    pool,
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
  const calls = [];
  function toSqlText(sql) {
    if (typeof sql === "string") {
      return sql.trim().replaceAll('"', "").replace(/\s+/g, " ");
    }
    if (
      sql &&
      typeof sql === "object" &&
      "text" in sql &&
      typeof sql.text === "string"
    ) {
      return sql.text.trim().replaceAll('"', "").replace(/\s+/g, " ");
    }
    return String(sql).trim().replaceAll('"', "").replace(/\s+/g, " ");
  }
  function toParams(sql, params) {
    if (params) return params;
    if (
      sql &&
      typeof sql === "object" &&
      "values" in sql &&
      Array.isArray(sql.values)
    ) {
      return sql.values;
    }
    return undefined;
  }
  const client = {
    query: (sql, params) => {
      const normalized = toSqlText(sql);
      calls.push({ sql: normalized, params: toParams(sql, params) });
      if (normalized.includes("select id from cases")) {
        return Promise.resolve({ rows: [{ id: "case-1" }] });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = {
    connect: () => Promise.resolve(client),
  };
  const repo = createTenantDrizzleRepository(
    pool,
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
    pool,
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
//# sourceMappingURL=tenantDb.test.js.map
