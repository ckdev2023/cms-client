import test from "node:test";
import assert from "node:assert/strict";
import type { PoolClient, QueryResult } from "pg";

import { DEV_USER_SEEDS, seedDevUsers } from "./seedDevUsers";

type QueryCall = { sql: string; params?: unknown[] };

function createMockClient(userCount = 1): {
  client: PoolClient;
  queries: QueryCall[];
} {
  const queries: QueryCall[] = [];
  const client = {
    query: (sql: string, params?: unknown[]): Promise<QueryResult> => {
      queries.push({ sql, params });
      if (/SELECT count\(\*\).*FROM users/i.test(sql)) {
        return Promise.resolve({
          rows: [{ cnt: String(userCount) }],
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

void test("seedDevUsers inserts 7 users when org has only 1 user", async () => {
  const { client, queries } = createMockClient(1);
  await seedDevUsers(client);

  const inserts = queries.filter((q) => /INSERT INTO users/i.test(q.sql));
  assert.equal(inserts.length, 7, "must insert exactly 7 fixture users");

  for (const q of inserts) {
    assert.ok(
      /ON CONFLICT.*DO NOTHING/i.test(q.sql),
      "every INSERT must use ON CONFLICT for idempotency",
    );
    assert.ok(q.params && q.params.length > 0, "INSERT must be parameterized");
  }
});

void test("seedDevUsers skips when org already has >1 user (idempotent)", async () => {
  const { client, queries } = createMockClient(8);
  await seedDevUsers(client);

  const inserts = queries.filter((q) => /INSERT INTO users/i.test(q.sql));
  assert.equal(inserts.length, 0, "must skip all inserts when users exist");
});

void test("seedDevUsers produces identical side effects on two consecutive calls", async () => {
  const { client: client1, queries: queries1 } = createMockClient(1);
  await seedDevUsers(client1);

  const { client: client2, queries: queries2 } = createMockClient(1);
  await seedDevUsers(client2);

  const inserts1 = queries1.filter((q) => /INSERT INTO users/i.test(q.sql));
  const inserts2 = queries2.filter((q) => /INSERT INTO users/i.test(q.sql));

  assert.equal(inserts1.length, inserts2.length, "same number of INSERTs");
  for (let i = 0; i < inserts1.length; i++) {
    const idx = String(i);
    assert.equal(
      inserts1[i].sql,
      inserts2[i].sql,
      `SQL must match at index ${idx}`,
    );
    const params1 = inserts1[i].params ?? [];
    const params2 = inserts2[i].params ?? [];
    assert.equal(
      params1.length,
      params2.length,
      `param count must match at index ${idx}`,
    );
    assert.equal(
      params1[0],
      params2[0],
      `user id must be deterministic at index ${idx}`,
    );
    assert.equal(
      params1[2],
      params2[2],
      `user name must be deterministic at index ${idx}`,
    );
    assert.equal(
      params1[3],
      params2[3],
      `user email must be deterministic at index ${idx}`,
    );
  }
});

void test("seedDevUsers uses c000 namespace UUIDs", () => {
  for (const user of DEV_USER_SEEDS) {
    assert.match(
      user.id,
      /^00000000-0000-4000-c000-/,
      `${user.name} must use c000 namespace`,
    );
  }
});

void test("DEV_USER_SEEDS has exactly 7 entries", () => {
  assert.equal(DEV_USER_SEEDS.length, 7);
});

void test("DEV_USER_SEEDS IDs are valid UUIDs", () => {
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89abc][0-9a-f]{3}-[0-9a-f]{12}$/;
  for (const user of DEV_USER_SEEDS) {
    assert.ok(
      uuidRe.test(user.id),
      `Invalid UUID for ${user.name}: ${user.id}`,
    );
  }
});

void test("seedDevUsers resolves staff role_id", async () => {
  const { client, queries } = createMockClient(1);
  await seedDevUsers(client);

  const roleQuery = queries.find((q) => /SELECT id FROM roles/i.test(q.sql));
  assert.ok(roleQuery, "must query for staff role_id");
  const matchedInParams = roleQuery.params?.includes("staff") ?? false;
  const matchedInSql = roleQuery.sql.includes("'staff'");
  assert.ok(matchedInParams || matchedInSql, "must look up 'staff' role code");
});

void test("seedDevUsers throws when staff role not found", async () => {
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
      return Promise.resolve({
        rows: [],
        rowCount: 0,
        command: "",
        oid: 0,
        fields: [],
      });
    },
  } as unknown as PoolClient;

  await assert.rejects(
    () => seedDevUsers(client),
    /System role "staff" not found/,
  );
});
