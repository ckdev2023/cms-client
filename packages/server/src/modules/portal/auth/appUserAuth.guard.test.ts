import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { AppUserAuthGuard } from "./appUserAuth.guard";
import { signAppUserJwt } from "./appUserAuth.service";

// Set env for tests
const TEST_KEY = ["test", "gd", "k"].join("-");
process.env.AUTH_JWT_SECRET = TEST_KEY;

type MockHeaders = Record<string, string>;

function makeContext(headers: MockHeaders) {
  const req = {
    headers,
    appUserContext: undefined as unknown,
  };
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    _req: req,
  };
}

// ── Valid token sets appUserContext ──

void test("AppUserAuthGuard sets appUserContext for valid token", () => {
  const guard = new AppUserAuthGuard();
  const token = signAppUserJwt("au-1", TEST_KEY);
  const ctx = makeContext({ authorization: `Bearer ${token}` });
  const result = guard.canActivate(ctx as never);
  assert.equal(result, true);
  assert.ok(ctx._req.appUserContext);
  assert.equal(
    (ctx._req.appUserContext as { appUserId: string }).appUserId,
    "au-1",
  );
});

// ── Missing token throws ──

void test("AppUserAuthGuard throws for missing authorization", () => {
  const guard = new AppUserAuthGuard();
  const ctx = makeContext({});
  assert.throws(() => guard.canActivate(ctx as never), /Missing authorization/);
});

// ── Invalid token throws ──

void test("AppUserAuthGuard throws for invalid token", () => {
  const guard = new AppUserAuthGuard();
  const ctx = makeContext({ authorization: "Bearer invalid-token" });
  assert.throws(
    () => guard.canActivate(ctx as never),
    /Invalid or expired token/,
  );
});

// ── Wrong secret throws ──

void test("AppUserAuthGuard throws for token with wrong secret", () => {
  const guard = new AppUserAuthGuard();
  const token = signAppUserJwt("au-1", "bad-k");
  const ctx = makeContext({ authorization: `Bearer ${token}` });
  assert.throws(
    () => guard.canActivate(ctx as never),
    /Invalid or expired token/,
  );
});

// ── Distinguishes AppUser token from backend User token ──

void test("AppUserAuthGuard rejects backend User JWT (type=user)", () => {
  const guard = new AppUserAuthGuard();
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      orgId: "org-1",
      userId: "user-1",
      type: "user",
      iat: now,
      exp: now + 3600,
    }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", TEST_KEY)
    .update(`${header}.${payload}`)
    .digest("base64url");
  const token = `${header}.${payload}.${sig}`;

  const ctx = makeContext({ authorization: `Bearer ${token}` });
  assert.throws(
    () => guard.canActivate(ctx as never),
    /Invalid or expired token/,
  );
});
