import test from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY } from "./auth.decorators";
class FakeReflector {
  values;
  constructor(values) {
    this.values = values;
  }
  getAllAndOverride(metadataKey) {
    return this.values[metadataKey];
  }
}
function createExecutionContext(req) {
  return {
    switchToHttp: () => ({
      getRequest: () => req,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}
function createPoolStub(userRow) {
  const client = {
    query: (sql, params) => {
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
  return pool;
}
void test("AuthGuard rejects missing auth context", async () => {
  const reflector = new FakeReflector({
    [IS_PUBLIC_KEY]: false,
    [REQUIRED_ROLES_KEY]: [],
  });
  const guard = new AuthGuard(reflector, createPoolStub(null));
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
  const guard = new AuthGuard(reflector, pool);
  const req = {
    requestAuthInput: { orgId, userId },
    requestContext: { orgId, userId, role: "owner" },
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
  const guard = new AuthGuard(reflector, pool);
  const req = {
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
  const guard = new AuthGuard(reflector, pool);
  const req = {
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
  const guard = new AuthGuard(reflector, pool);
  const req = {
    requestAuthInput: { orgId, userId },
  };
  const ctx = createExecutionContext(req);
  const ok = await guard.canActivate(ctx);
  assert.equal(ok, true);
  assert.deepEqual(req.requestContext, { orgId, userId, role: "staff" });
});
//# sourceMappingURL=auth.guard.test.js.map
