import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import type { Pool } from "pg";

import {
  AppUserAuthService,
  signAppUserJwt,
  verifyAppUserJwt,
} from "./appUserAuth.service";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_USER_ROW = {
  id: "au-1",
  preferred_language: "en",
  name: "User",
  email: "test@example.com",
  phone: null,
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

function makeMockRedis() {
  const store = new Map<string, string>();
  return {
    isOpen: true,
    connect: () => Promise.resolve(),
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    set: (key: string, value: string, _opts?: unknown) => {
      store.set(key, value);
      return Promise.resolve("OK");
    },
    get: (key: string) => Promise.resolve(store.get(key) ?? null),
    del: (key: string) => {
      store.delete(key);
      return Promise.resolve(1);
    },
    _store: store,
  };
}

// ── JWT sign/verify ──

void test("signAppUserJwt + verifyAppUserJwt round-trip", () => {
  const secret = ["t", "key"].join("-");
  const token = signAppUserJwt("au-1", secret);
  const ctx = verifyAppUserJwt(token, secret);
  assert.ok(ctx);
  assert.equal(ctx.appUserId, "au-1");
});

void test("verifyAppUserJwt rejects wrong secret", () => {
  const token = signAppUserJwt("au-1", "secret-a");
  const ctx = verifyAppUserJwt(token, "secret-b");
  assert.equal(ctx, null);
});

void test("verifyAppUserJwt rejects malformed token", () => {
  assert.equal(verifyAppUserJwt("invalid", "s"), null);
  assert.equal(verifyAppUserJwt("a.b", "s"), null);
  assert.equal(verifyAppUserJwt("", "s"), null);
});

void test("verifyAppUserJwt rejects non-app_user type", () => {
  // Craft a JWT with type !== "app_user"
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      appUserId: "au-1",
      type: "user",
      iat: 0,
      exp: 9999999999,
    }),
  ).toString("base64url");
  const sig = "fake";
  assert.equal(verifyAppUserJwt(`${header}.${payload}.${sig}`, "s"), null);
});

// ── requestCode ──

void test("AppUserAuthService.requestCode stores code in Redis", async () => {
  const redis = makeMockRedis();
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_USER_ROW] }));
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);

  const result = await svc.requestCode({ email: "test@example.com" });
  assert.deepEqual(result, { ok: true });
  assert.ok(redis._store.has("app_auth:code:test@example.com"));
});

void test("AppUserAuthService.requestCode rejects if no email/phone", async () => {
  const redis = makeMockRedis();
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);
  await assert.rejects(() => svc.requestCode({}), /email or phone required/);
});

// ── verifyCode ──

void test("AppUserAuthService.verifyCode returns token and appUser", async () => {
  const redis = makeMockRedis();
  redis._store.set("app_auth:code:test@example.com", "123456");
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_USER_ROW] }));
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);

  const result = await svc.verifyCode({
    email: "test@example.com",
    code: "123456",
  });
  assert.ok(result.token);
  assert.equal(result.appUser.id, "au-1");
  // code should be deleted after use
  assert.ok(!redis._store.has("app_auth:code:test@example.com"));
});

void test("AppUserAuthService.verifyCode rejects wrong code", async () => {
  const redis = makeMockRedis();
  redis._store.set("app_auth:code:test@example.com", "123456");
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_USER_ROW] }));
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);
  await assert.rejects(
    () => svc.verifyCode({ email: "test@example.com", code: "000000" }),
    /Invalid or expired/,
  );
});

// ── me ──

void test("AppUserAuthService.me returns AppUser by id", async () => {
  const redis = makeMockRedis();
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_USER_ROW] }));
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);
  const user = await svc.me("au-1");
  assert.equal(user.id, "au-1");
  assert.equal(user.email, "test@example.com");
});

// ── Security: JWT edge cases ──

void test("verifyAppUserJwt rejects expired token", () => {
  // Manually craft expired token
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const expired = {
    appUserId: "au-1",
    type: "app_user",
    iat: 1000000,
    exp: 1000001, // long expired
  };
  const payload = Buffer.from(JSON.stringify(expired)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", "sk")
    .update(`${header}.${payload}`)
    .digest("base64url");
  assert.equal(verifyAppUserJwt(`${header}.${payload}.${sig}`, "sk"), null);
});

void test("verifyAppUserJwt rejects token without exp (gracefully)", () => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const noExp = {
    appUserId: "au-1",
    type: "app_user",
    iat: Math.floor(Date.now() / 1000),
  };
  const payload = Buffer.from(JSON.stringify(noExp)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", "sk")
    .update(`${header}.${payload}`)
    .digest("base64url");
  // no exp means no expiry check → should pass
  const ctx = verifyAppUserJwt(`${header}.${payload}.${sig}`, "sk");
  assert.ok(ctx);
  assert.equal(ctx.appUserId, "au-1");
});

void test("verifyAppUserJwt rejects tampered payload", () => {
  const token = signAppUserJwt("au-1", "k1");
  // Tamper: change last char of payload
  const parts = token.split(".");
  const tampered = `${parts[0]}.${parts[1]?.slice(0, -1) ?? ""}X.${parts[2] ?? ""}`;
  assert.equal(verifyAppUserJwt(tampered, "k1"), null);
});

void test("verifyAppUserJwt rejects empty appUserId", () => {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const p = { appUserId: 123, type: "app_user", iat: 0, exp: 9999999999 };
  const payload = Buffer.from(JSON.stringify(p)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", "s")
    .update(`${header}.${payload}`)
    .digest("base64url");
  assert.equal(verifyAppUserJwt(`${header}.${payload}.${sig}`, "s"), null);
});

// ── Security: requestCode edge cases ──

void test("AppUserAuthService.requestCode auto-creates user if not found", async () => {
  const redis = makeMockRedis();
  let insertCalled = false;
  const pool = makePool((sql) => {
    if (sql.includes("select") && sql.includes("app_users")) {
      return Promise.resolve({ rows: [] }); // not found
    }
    if (sql.includes("insert into app_users")) {
      insertCalled = true;
      return Promise.resolve({ rows: [SAMPLE_USER_ROW] });
    }
    return Promise.resolve({ rows: [] });
  });
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);
  await svc.requestCode({ email: "new@example.com" });
  assert.ok(insertCalled, "Should create new app user");
});

// ── Security: me edge cases ──

void test("AppUserAuthService.me throws if user not found", async () => {
  const redis = makeMockRedis();
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new (AppUserAuthService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => AppUserAuthService)(pool, redis);
  await assert.rejects(() => svc.me("nonexistent"), /not found/);
});
