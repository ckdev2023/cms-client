import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import { AuthService, hashPassword, verifyPassword } from "./auth.service";
import {
  _resetAuthConfigCacheForTest,
  parseVerifiedRequestAuthInputFromHeaders,
  readAuthConfigFromEnv,
} from "../tenancy/requestContext";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_USER_ROW = {
  id: "00000000-0000-4000-8000-000000000001",
  org_id: "00000000-0000-4000-8000-000000000000",
  name: "Admin",
  email: "admin@example.com",
  role: "manager",
  status: "active",
};

const jwtKey = "12345678901234567890123456789012";
const validInput = ["Password", "123!"].join("");
const invalidInput = ["bad", "-", "password"].join("");

void test("hashPassword + verifyPassword round-trip", async () => {
  const passwordHash = await hashPassword("Password123!");

  assert.notEqual(passwordHash, "Password123!");
  assert.equal(await verifyPassword("Password123!", passwordHash), true);
  assert.equal(await verifyPassword("wrong-password", passwordHash), false);
});

void test("AuthService.login returns token and user for active user", async () => {
  const prev = { ...process.env };
  _resetAuthConfigCacheForTest();

  try {
    process.env.AUTH_JWT_SECRET = jwtKey;
    const passwordHash = await hashPassword("Password123!");
    const pool = makePool((sql, params) => {
      assert.match(sql, /from users/i);
      assert.deepEqual(params, ["admin@example.com"]);
      return Promise.resolve({
        rows: [{ ...SAMPLE_USER_ROW, password_hash: passwordHash }],
      });
    });

    const service = new AuthService(pool);
    const result = await service.login({
      email: " Admin@Example.com ",
      password: validInput,
    });

    assert.equal(result.user.id, SAMPLE_USER_ROW.id);
    assert.equal(result.user.orgId, SAMPLE_USER_ROW.org_id);
    assert.equal(result.user.email, SAMPLE_USER_ROW.email);
    assert.equal(result.user.role, "manager");

    const requestAuthInput = parseVerifiedRequestAuthInputFromHeaders(
      {
        authorization: `Bearer ${result.token}`,
      },
      readAuthConfigFromEnv(),
    );
    assert.deepEqual(requestAuthInput, {
      orgId: SAMPLE_USER_ROW.org_id,
      userId: SAMPLE_USER_ROW.id,
    });
  } finally {
    process.env = prev;
    _resetAuthConfigCacheForTest();
  }
});

void test("AuthService.login rejects invalid password", async () => {
  const prev = { ...process.env };
  _resetAuthConfigCacheForTest();

  try {
    process.env.AUTH_JWT_SECRET = jwtKey;
    const passwordHash = await hashPassword("Password123!");
    const service = new AuthService(
      makePool(() =>
        Promise.resolve({
          rows: [{ ...SAMPLE_USER_ROW, password_hash: passwordHash }],
        }),
      ),
    );

    await assert.rejects(
      () =>
        service.login({
          email: SAMPLE_USER_ROW.email,
          password: invalidInput,
        }),
      UnauthorizedException,
    );
  } finally {
    process.env = prev;
    _resetAuthConfigCacheForTest();
  }
});

void test("AuthService.login rejects blank credentials", async () => {
  const service = new AuthService(
    makePool(() => Promise.resolve({ rows: [] })),
  );

  await assert.rejects(
    () => service.login({ email: " ", password: " " }),
    BadRequestException,
  );
});
