import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, type ExecutionContext } from "@nestjs/common";

import { IS_PUBLIC_KEY, REQUIRED_PERMISSIONS_KEY } from "./auth.decorators";
import { PermissionsGuard } from "./permissions.guard";
import type { EffectivePermissionsService } from "./effective-permissions.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";

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

function fakeEffectivePermissions(
  perms: Set<string>,
): EffectivePermissionsService {
  return {
    resolve: () => Promise.resolve(perms),
    invalidate: () => undefined,
    invalidateAll: () => undefined,
  } as unknown as EffectivePermissionsService;
}

// ── スキップ条件 ──

void describe("PermissionsGuard skip conditions", () => {
  void test("allows public routes", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: true,
      [REQUIRED_PERMISSIONS_KEY]: ["user.manage"],
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(new Set()),
    );
    const ctx = createExecutionContext({});

    const ok = await guard.canActivate(ctx);
    assert.equal(ok, true);
  });

  void test("allows routes without @RequirePermission", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: false,
      [REQUIRED_PERMISSIONS_KEY]: undefined,
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(new Set()),
    );
    const req = {
      requestContext: {
        orgId: ORG_ID,
        userId: USER_ID,
        role: "staff" as const,
      },
    };
    const ctx = createExecutionContext(req);

    const ok = await guard.canActivate(ctx);
    assert.equal(ok, true);
  });

  void test("allows routes with empty permissions array", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: false,
      [REQUIRED_PERMISSIONS_KEY]: [],
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(new Set()),
    );
    const req = {
      requestContext: {
        orgId: ORG_ID,
        userId: USER_ID,
        role: "staff" as const,
      },
    };
    const ctx = createExecutionContext(req);

    const ok = await guard.canActivate(ctx);
    assert.equal(ok, true);
  });
});

// ── 権限判定 ──

void describe("PermissionsGuard permission checks", () => {
  void test("allows when user has all required permissions", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: false,
      [REQUIRED_PERMISSIONS_KEY]: ["user.manage", "user.view"],
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(
        new Set(["user.manage", "user.view", "case.view"]),
      ),
    );
    const req = {
      requestContext: {
        orgId: ORG_ID,
        userId: USER_ID,
        role: "manager" as const,
      },
    };
    const ctx = createExecutionContext(req);

    const ok = await guard.canActivate(ctx);
    assert.equal(ok, true);
  });

  void test("rejects when user lacks one required permission", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: false,
      [REQUIRED_PERMISSIONS_KEY]: ["user.manage", "permission.override"],
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(new Set(["user.manage", "user.view"])),
    );
    const req = {
      requestContext: {
        orgId: ORG_ID,
        userId: USER_ID,
        role: "manager" as const,
      },
    };
    const ctx = createExecutionContext(req);

    await assert.rejects(() => guard.canActivate(ctx), ForbiddenException);
  });

  void test("rejects when user has no permissions at all", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: false,
      [REQUIRED_PERMISSIONS_KEY]: ["case.view"],
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(new Set()),
    );
    const req = {
      requestContext: {
        orgId: ORG_ID,
        userId: USER_ID,
        role: "viewer" as const,
      },
    };
    const ctx = createExecutionContext(req);

    await assert.rejects(() => guard.canActivate(ctx), ForbiddenException);
  });
});

// ── エラー条件 ──

void describe("PermissionsGuard error conditions", () => {
  void test("rejects when requestContext is missing", async () => {
    const reflector = new FakeReflector({
      [IS_PUBLIC_KEY]: false,
      [REQUIRED_PERMISSIONS_KEY]: ["case.view"],
    });
    const guard = new PermissionsGuard(
      reflector as never,
      fakeEffectivePermissions(new Set(["case.view"])),
    );
    const req = {};
    const ctx = createExecutionContext(req);

    await assert.rejects(() => guard.canActivate(ctx), ForbiddenException);
  });
});
