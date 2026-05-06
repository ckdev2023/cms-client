import test from "node:test";
import assert from "node:assert/strict";

import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from "@nestjs/common";
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

const TEST_ROLE_ID = "00000000-0000-4000-8000-0000000000aa";

function createPoolStub(
  userRow: {
    id: string;
    role: string;
    role_id?: string | null;
    status: string;
  } | null,
): Pool {
  const effectiveRoleId =
    userRow?.role_id !== undefined ? userRow.role_id : TEST_ROLE_ID;
  const userRowForQuery = userRow
    ? { id: userRow.id, role_id: effectiveRoleId, status: userRow.status }
    : null;

  const client = {
    query: (sql: string, params?: unknown[]) => {
      void params;
      if (sql.includes("select id, role_id, status from users")) {
        return Promise.resolve({
          rows: userRowForQuery ? [userRowForQuery] : [],
        });
      }
      if (sql.includes("select code from roles")) {
        return Promise.resolve({
          rows: effectiveRoleId && userRow ? [{ code: userRow.role }] : [],
        });
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
    requestContext?: {
      orgId: string;
      userId: string;
      role: "owner" | "manager" | "staff" | "viewer";
    };
  } = {
    requestAuthInput: { orgId, userId },
  };
  const ctx = createExecutionContext(req);

  const ok = await guard.canActivate(ctx);
  assert.equal(ok, true);
  assert.deepEqual(req.requestContext, { orgId, userId, role: "staff" });
});

void test("AuthGuard keeps groupId in requestContext when provided", async () => {
  const orgId = "00000000-0000-4000-8000-000000000000";
  const userId = "00000000-0000-4000-8000-000000000001";

  const reflector = new FakeReflector({
    [IS_PUBLIC_KEY]: false,
    [REQUIRED_ROLES_KEY]: ["viewer"],
  });
  const pool = createPoolStub({ id: userId, role: "staff", status: "active" });
  const guard = new AuthGuard(reflector as never, pool);

  const req: {
    requestAuthInput?: { orgId: string; userId: string; groupId?: string };
    requestContext?: {
      orgId: string;
      userId: string;
      role: "owner" | "manager" | "staff" | "viewer";
      groupId?: string;
    };
  } = {
    requestAuthInput: { orgId, userId, groupId: "tokyo" },
  };
  const ctx = createExecutionContext(req);

  const ok = await guard.canActivate(ctx);
  assert.equal(ok, true);
  assert.deepEqual(req.requestContext, {
    orgId,
    userId,
    role: "staff",
    groupId: "tokyo",
  });
});

void test("AuthGuard attaches requestContext on public routes when admin auth is present", async () => {
  const orgId = "00000000-0000-4000-8000-000000000000";
  const userId = "00000000-0000-4000-8000-000000000001";

  const reflector = new FakeReflector({
    [IS_PUBLIC_KEY]: true,
    [REQUIRED_ROLES_KEY]: [],
  });
  const pool = createPoolStub({ id: userId, role: "staff", status: "active" });
  const guard = new AuthGuard(reflector as never, pool);

  const req: {
    requestAuthInput?: { orgId: string; userId: string };
    requestContext?: {
      orgId: string;
      userId: string;
      role: "owner" | "manager" | "staff" | "viewer";
    };
  } = {
    requestAuthInput: { orgId, userId },
  };
  const ctx = createExecutionContext(req);

  const ok = await guard.canActivate(ctx);
  assert.equal(ok, true);
  assert.deepEqual(req.requestContext, { orgId, userId, role: "staff" });
});
