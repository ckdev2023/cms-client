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

type MockPoolOptions = {
  storageRootExists?: boolean;
};

function makeMockPool(
  calls: { sql: string; params?: unknown[] }[],
  opts: MockPoolOptions = {},
) {
  return makePoolWithClient((sql, params) => {
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
    if (sql.includes("insert into groups")) {
      return Promise.resolve({
        rows: [{ id: "00000000-0000-4000-8000-000000000020" }],
      });
    }
    if (sql.includes("insert into user_group_memberships")) {
      return Promise.resolve({ rows: [] });
    }
    if (sql.includes("update organizations") && sql.includes("storageRoot")) {
      return Promise.resolve({ rows: opts.storageRootExists ? [] : [{}] });
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });
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

void test("bootstrapLocalAdmin upserts org, user, group, membership, storageRoot", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makeMockPool(calls);

  const result = await bootstrapLocalAdmin(
    pool,
    readLocalAdminBootstrapInput({}),
  );

  assert.equal(result.orgId, "00000000-0000-4000-8000-000000000010");
  assert.equal(result.userId, "00000000-0000-4000-8000-000000000011");
  assert.equal(result.email, "admin@local.test");
  assert.equal(result.role, "owner");

  const orgInsert = calls.find((c) =>
    c.sql.includes("insert into organizations"),
  );
  assert.ok(orgInsert);
  assert.deepEqual(orgInsert.params, [
    "00000000-0000-4000-8000-000000000010",
    "Local Demo Office",
  ]);

  const userInsert = calls.find((c) => c.sql.includes("insert into users"));
  assert.ok(userInsert);
  assert.ok(userInsert.params);
  assert.equal(userInsert.params[0], "00000000-0000-4000-8000-000000000011");
  assert.equal(userInsert.params[1], "00000000-0000-4000-8000-000000000010");
  assert.equal(userInsert.params[2], "Local Admin");
  assert.equal(userInsert.params[3], "admin@local.test");
  assert.match(String(userInsert.params[4]), /^scrypt\$/);
  assert.equal(userInsert.params[5], "owner");

  const groupInsert = calls.find((c) => c.sql.includes("insert into groups"));
  assert.ok(groupInsert, "should insert into groups");
  assert.deepEqual(groupInsert.params, [
    "00000000-0000-4000-8000-000000000020",
    "00000000-0000-4000-8000-000000000010",
    "Local Default Group",
  ]);

  const membershipInsert = calls.find((c) =>
    c.sql.includes("insert into user_group_memberships"),
  );
  assert.ok(membershipInsert, "should insert into user_group_memberships");
  assert.deepEqual(membershipInsert.params, [
    "00000000-0000-4000-8000-000000000011",
    "00000000-0000-4000-8000-000000000020",
  ]);

  const storageUpdate = calls.find(
    (c) =>
      c.sql.includes("update organizations") && c.sql.includes("storageRoot"),
  );
  assert.ok(storageUpdate, "should update organizations.settings.storageRoot");
  assert.ok(storageUpdate.params);
  assert.equal(storageUpdate.params[0], "00000000-0000-4000-8000-000000000010");
  assert.equal(
    storageUpdate.params[1],
    "/data/cms/00000000-0000-4000-8000-000000000010/files",
  );

  assert.equal(calls[0]?.sql, "BEGIN");
  assert.equal(calls.at(-1)?.sql, "COMMIT");

  const sqlOrder = calls
    .map((c) => c.sql)
    .filter((s) => s !== "BEGIN" && s !== "COMMIT");
  assert.ok(sqlOrder[0]?.includes("insert into organizations"));
  assert.ok(sqlOrder[1]?.includes("insert into users"));
  assert.ok(sqlOrder[2]?.includes("insert into groups"));
  assert.ok(sqlOrder[3]?.includes("insert into user_group_memberships"));
  assert.ok(sqlOrder[4]?.includes("update organizations"));
});

void test("bootstrapLocalAdmin is idempotent (second run same result)", async () => {
  const calls1: { sql: string; params?: unknown[] }[] = [];
  const pool1 = makeMockPool(calls1);
  const input = readLocalAdminBootstrapInput({});

  const r1 = await bootstrapLocalAdmin(pool1, input);

  const calls2: { sql: string; params?: unknown[] }[] = [];
  const pool2 = makeMockPool(calls2);

  const r2 = await bootstrapLocalAdmin(pool2, input);

  assert.deepEqual(r1, r2);
  assert.equal(calls1.length, calls2.length);
});

void test("bootstrapLocalAdmin does not overwrite existing storageRoot", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makeMockPool(calls, { storageRootExists: true });

  await bootstrapLocalAdmin(pool, readLocalAdminBootstrapInput({}));

  const storageUpdate = calls.find(
    (c) =>
      c.sql.includes("update organizations") && c.sql.includes("storageRoot"),
  );
  assert.ok(storageUpdate, "SQL should still be issued (WHERE clause guards)");
  assert.ok(
    storageUpdate.sql.includes("settings->'storageRoot'->>'rootPath' is null"),
    "SQL WHERE clause guards against overwrite",
  );
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

void test("bootstrapLocalAdmin rolls back when group upsert fails", async () => {
  const calls: string[] = [];
  const pool = makePoolWithClient((sql) => {
    calls.push(sql);
    if (sql === "BEGIN" || sql === "ROLLBACK") {
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
    if (sql.includes("insert into groups")) {
      return Promise.reject(new Error("group insert failed"));
    }
    throw new Error(`Unexpected SQL: ${sql}`);
  });

  await assert.rejects(
    () => bootstrapLocalAdmin(pool, readLocalAdminBootstrapInput({})),
    /group insert failed/,
  );
  assert.equal(calls[0], "BEGIN");
  assert.equal(calls.at(-1), "ROLLBACK");
  assert.equal(calls.includes("COMMIT"), false);
});
