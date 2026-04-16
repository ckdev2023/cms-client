import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  bootstrapLocalAdmin,
  readLocalAdminBootstrapInput,
} from "./localAdminBootstrap";

type QueryResultRow = { rows: unknown[] };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResultRow>;

function makePoolWithClient(qf: QueryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: qf,
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function buildDbUrl(
  username: string,
  password: string,
  host: string,
  port: string,
  dbName: string,
) {
  const url = new URL(`postgres://${host}:${port}/${dbName}`);
  url.username = username;
  url.password = password;
  return url.toString();
}

void test("readLocalAdminBootstrapInput uses local defaults", () => {
  const input = readLocalAdminBootstrapInput({});
  const expectedDbUrl = buildDbUrl("cms", "cms", "localhost", "5433", "cms");

  assert.equal(input.dbUrl, expectedDbUrl);
  assert.equal(input.orgId, "00000000-0000-4000-8000-000000000010");
  assert.equal(input.userId, "00000000-0000-4000-8000-000000000011");
  assert.equal(input.orgName, "Local Demo Office");
  assert.equal(input.userName, "Local Admin");
  assert.equal(input.email, "admin@local.test");
  assert.equal(input.password, ["Admin", "123", "!"].join(""));
  assert.equal(input.role, "owner");
});

void test("readLocalAdminBootstrapInput normalizes env overrides", () => {
  const overridePassword = ["Manager", "Pass", "123!"].join("");
  const overrideDbUrl = buildDbUrl(
    "local-user",
    "local-pass",
    "localhost",
    "5544",
    "demo",
  );
  const input = readLocalAdminBootstrapInput({
    DB_URL: overrideDbUrl,
    ADMIN_INIT_EMAIL: " Admin@Example.com ",
    ADMIN_INIT_ROLE: "manager",
    ADMIN_INIT_PASSWORD: `  ${overridePassword}  `,
  });

  assert.equal(input.dbUrl, overrideDbUrl);
  assert.equal(input.email, "admin@example.com");
  assert.equal(input.password, overridePassword);
  assert.equal(input.role, "manager");
});

void test("readLocalAdminBootstrapInput rejects invalid role", () => {
  assert.throws(
    () => readLocalAdminBootstrapInput({ ADMIN_INIT_ROLE: "super-admin" }),
    /Invalid ADMIN_INIT_ROLE/,
  );
});

void test("bootstrapLocalAdmin upserts organization and admin user", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePoolWithClient((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql === "BEGIN" || sql === "COMMIT" || sql === "ROLLBACK") {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes("insert into organizations")) {
      return Promise.resolve({
        rows: [
          {
            id: "00000000-0000-4000-8000-000000000010",
            name: "Local Demo Office",
          },
        ],
      });
    }
    if (sql.includes("insert into users")) {
      return Promise.resolve({
        rows: [
          {
            id: "00000000-0000-4000-8000-000000000011",
            org_id: "00000000-0000-4000-8000-000000000010",
            name: "Local Admin",
            email: "admin@local.test",
            role: "owner",
          },
        ],
      });
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  const result = await bootstrapLocalAdmin(
    pool,
    readLocalAdminBootstrapInput({}),
  );

  assert.equal(result.orgId, "00000000-0000-4000-8000-000000000010");
  assert.equal(result.userId, "00000000-0000-4000-8000-000000000011");
  assert.equal(result.email, "admin@local.test");
  assert.equal(result.role, "owner");

  const orgInsert = calls.find((call) =>
    call.sql.includes("insert into organizations"),
  );
  assert.ok(orgInsert);
  const orgParams = orgInsert.params;
  assert.ok(orgParams);
  assert.deepEqual(orgParams, [
    "00000000-0000-4000-8000-000000000010",
    "Local Demo Office",
  ]);

  const userInsert = calls.find((call) =>
    call.sql.includes("insert into users"),
  );
  assert.ok(userInsert);
  const userParams = userInsert.params;
  assert.ok(userParams);
  assert.equal(userParams[0], "00000000-0000-4000-8000-000000000011");
  assert.equal(userParams[1], "00000000-0000-4000-8000-000000000010");
  assert.equal(userParams[2], "Local Admin");
  assert.equal(userParams[3], "admin@local.test");
  assert.match(String(userParams[4]), /^scrypt\$/);
  assert.equal(userParams[5], "owner");

  assert.equal(calls[0]?.sql, "BEGIN");
  assert.equal(calls.at(-1)?.sql, "COMMIT");
});

void test("bootstrapLocalAdmin rolls back when user upsert fails", async () => {
  const calls: string[] = [];
  const pool = makePoolWithClient((sql) => {
    calls.push(sql);
    if (sql === "BEGIN" || sql === "ROLLBACK") {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes("insert into organizations")) {
      return Promise.resolve({
        rows: [{ id: "org-1", name: "Local Demo Office" }],
      });
    }
    if (sql.includes("insert into users")) {
      return Promise.reject(new Error("boom"));
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  await assert.rejects(
    () => bootstrapLocalAdmin(pool, readLocalAdminBootstrapInput({})),
    /boom/,
  );
  assert.equal(calls[0], "BEGIN");
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.equal(calls.includes("COMMIT"), false);
});
