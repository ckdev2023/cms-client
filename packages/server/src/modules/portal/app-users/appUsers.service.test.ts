import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { AppUsersService } from "./appUsers.service";

// ── Test helpers ──

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_ROW = {
  id: "au-1",
  preferred_language: "ja",
  name: "Taro",
  email: "taro@example.com",
  phone: "+81-90-0000-0000",
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// ── create ──

void test("AppUsersService.create inserts row and returns AppUser", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({ rows: [SAMPLE_ROW] });
  });
  const svc = new AppUsersService(pool);

  const result = await svc.create({ name: "Taro", preferredLanguage: "ja" });
  assert.equal(result.id, "au-1");
  assert.equal(result.name, "Taro");
  assert.equal(result.preferredLanguage, "ja");

  const insertCall = calls.find((c) => c.sql.includes("insert into app_users"));
  assert.ok(insertCall);
  assert.deepEqual(insertCall.params, ["Taro", "ja", null, null]);
});

void test("AppUsersService.create defaults preferredLanguage to en", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({
      rows: [{ ...SAMPLE_ROW, preferred_language: "en" }],
    });
  });
  const svc = new AppUsersService(pool);

  await svc.create({ name: "Bob" });
  const insertCall = calls.find((c) => c.sql.includes("insert into app_users"));
  assert.ok(insertCall);
  assert.equal(insertCall.params?.[1], "en");
});

void test("AppUsersService.create throws on empty result", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new AppUsersService(pool);

  await assert.rejects(
    () => svc.create({ name: "Fail" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to create app user");
      return true;
    },
  );
});

// ── get ──

void test("AppUsersService.get returns AppUser when found", async () => {
  const pool = makePool((sql, params) => {
    if (params?.[0] === "au-1") {
      return Promise.resolve({ rows: [SAMPLE_ROW] });
    }
    return Promise.resolve({ rows: [] });
  });
  const svc = new AppUsersService(pool);

  const result = await svc.get("au-1");
  assert.ok(result);
  assert.equal(result.id, "au-1");
  assert.equal(result.email, "taro@example.com");
});

void test("AppUsersService.get returns null when not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new AppUsersService(pool);

  const result = await svc.get("not-found");
  assert.equal(result, null);
});

// ── update ──

void test("AppUsersService.update updates and returns AppUser", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({
      rows: [{ ...SAMPLE_ROW, name: "Taro Updated" }],
    });
  });
  const svc = new AppUsersService(pool);

  const result = await svc.update("au-1", "au-1", { name: "Taro Updated" });
  assert.equal(result.name, "Taro Updated");

  const updateCall = calls.find((c) => c.sql.includes("update app_users"));
  assert.ok(updateCall);
  assert.ok(updateCall.params?.includes("Taro Updated"));
  assert.ok(updateCall.params?.includes("au-1"));
});

void test("AppUsersService.update rejects when callerId != id", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new AppUsersService(pool);

  await assert.rejects(
    () => svc.update("au-1", "au-other", { name: "Hack" }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Can only update own profile");
      return true;
    },
  );
});

void test("AppUsersService.update with no fields returns current user", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_ROW] }));
  const svc = new AppUsersService(pool);

  const result = await svc.update("au-1", "au-1", {});
  assert.equal(result.id, "au-1");
  assert.equal(result.name, "Taro");
});

void test("AppUsersService.update with no fields throws if user not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new AppUsersService(pool);

  await assert.rejects(
    () => svc.update("au-1", "au-1", {}),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "App user not found");
      return true;
    },
  );
});

void test("AppUsersService.update with multiple fields", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({ rows: [SAMPLE_ROW] });
  });
  const svc = new AppUsersService(pool);

  await svc.update("au-1", "au-1", {
    name: "NewName",
    preferredLanguage: "zh",
    email: "new@example.com",
    phone: null,
  });
  const updateCall = calls.find((c) => c.sql.includes("update app_users"));
  assert.ok(updateCall);
  assert.equal(updateCall.params?.length, 5); // 4 fields + id
});
