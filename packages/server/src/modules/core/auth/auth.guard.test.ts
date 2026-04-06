import test from "node:test";
import assert from "node:assert/strict";

import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import type { Pool } from "pg";

import { AuthGuard } from "./auth.guard";
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from "./auth.decorators";

class FakeReflector {
  constructor(private readonly values: Record<string, unknown>) {}

  getAllAndOverride(metadataKey: string): unknown {
    return this.values[metadataKey];
  }
}

function createExecutionContext(req: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function createPoolStub(userRow: { id: string; role: string; status: string } | null): Pool {
  const client = {
    query: (sql: string, params?: unknown[]) => {
      void params;
      if (sql.includes("select id, role, status from users")) {
        return Promise.resolve({ rows: userRow ? [userRow] : [] });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const pool = {
    connect: () => Promise.resolve(client),
  };

  return pool as unknown as Pool;
}

void test("AuthGuard rejects missing auth context", async () => {
  const reflector = new FakeReflector({
    [IS_PUBLIC_KEY]: false,
    [REQUIRED_ROLES_KEY]: [],
  });
  const guard = new AuthGuard(reflector as never, createPoolStub(null));
  const ctx = createExecutionContext({});

  await assert.rejects(() => guard.canActivate(ctx), UnauthorizedException);
});

void test("AuthGuard sets requestContext from DB role and enforces RBAC", async () => {
  const orgId = "00000000-0000-4000-8000-000000000000";
  const userId = "00000000-0000-4000-8000-000000000001";

  const reflector = new FakeReflector({
    [IS_PUBLIC_KEY]: false,
    [REQUIRED_ROLES_KEY]: ["manager"],
  });
  const pool = createPoolStub({ id: userId, role: "viewer", status: "active" });
  const guard = new AuthGuard(reflector as never, pool);

  const req = {
    requestAuthInput: { orgId, userId },
    requestContext: { orgId, userId, role: "owner" as const },
  };
  const ctx = createExecutionContext(req);

  await assert.rejects(() => guard.canActivate(ctx), ForbiddenException);
  assert.equal(req.requestContext.role, "viewer");
});

void test("AuthGuard accepts requestAuthInput and attaches verified requestContext", async () => {
  const orgId = "00000000-0000-4000-8000-000000000000";
  const userId = "00000000-0000-4000-8000-000000000001";

  const reflector = new FakeReflector({
    [IS_PUBLIC_KEY]: false,
    [REQUIRED_ROLES_KEY]: ["viewer"],
  });
  const pool = createPoolStub({ id: userId, role: "staff", status: "active" });
  const guard = new AuthGuard(reflector as never, pool);

  const req: {
    requestAuthInput?: { orgId: string; userId: string };
    requestContext?: { orgId: string; userId: string; role: "owner" | "manager" | "staff" | "viewer" };
  } = {
    requestAuthInput: { orgId, userId },
  };
  const ctx = createExecutionContext(req);

  const ok = await guard.canActivate(ctx);
  assert.equal(ok, true);
  assert.deepEqual(req.requestContext, { orgId, userId, role: "staff" });
});
