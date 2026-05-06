import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { UnauthorizedException } from "@nestjs/common";
import type { Pool, QueryResult } from "pg";

import { MePermissionsController } from "./mePermissions.controller";
import type { EffectivePermissionsService } from "./effective-permissions.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const ROLE_ID = "00000000-0000-4000-8000-00000000000c";

function makeReq(overrides?: Record<string, unknown>) {
  return {
    requestContext: {
      orgId: ORG_ID,
      userId: USER_ID,
      role: "owner" as const,
      ...overrides,
    },
  };
}

function stubEffectivePermissions(
  permissions: string[] = ["case.view", "case.edit"],
): EffectivePermissionsService {
  return {
    resolve: () => Promise.resolve(new Set(permissions)),
    invalidate: () => undefined,
    invalidateAll: () => undefined,
  } as unknown as EffectivePermissionsService;
}

function stubPool(role = "owner", roleId: string | null = ROLE_ID): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string) => {
          if (sql.includes("SET LOCAL")) {
            return Promise.resolve({ rows: [] });
          }
          return Promise.resolve({
            rows: [{ role_code: role, role_id: roleId }],
            rowCount: 1,
          } satisfies Partial<QueryResult> as QueryResult);
        },
        release: () => undefined,
      }),
  } as unknown as Pool;
}

// ── Missing request context ──

void describe("MePermissionsController — missing context", () => {
  const controller = new MePermissionsController(
    stubEffectivePermissions(),
    stubPool(),
  );

  void test("throws UnauthorizedException", async () => {
    await assert.rejects(
      () => controller.getPermissions({} as never),
      UnauthorizedException,
    );
  });
});

// ── Happy paths ──

void describe("MePermissionsController — happy paths", () => {
  void test("returns permissions, roleId, role, and ttl", async () => {
    const ctrl = new MePermissionsController(
      stubEffectivePermissions(["case.view", "case.edit", "group.view"]),
      stubPool("owner", ROLE_ID),
    );

    const result = await ctrl.getPermissions(makeReq() as never);

    assert.deepEqual(result.permissions, [
      "case.edit",
      "case.view",
      "group.view",
    ]);
    assert.equal(result.roleId, ROLE_ID);
    assert.equal(result.role, "owner");
    assert.equal(result.ttl, 60);
  });

  void test("returns sorted permissions", async () => {
    const ctrl = new MePermissionsController(
      stubEffectivePermissions(["user.view", "case.view", "customer.view"]),
      stubPool(),
    );

    const result = await ctrl.getPermissions(makeReq() as never);

    assert.deepEqual(result.permissions, [
      "case.view",
      "customer.view",
      "user.view",
    ]);
  });

  void test("returns null roleId when user has no role_id", async () => {
    const ctrl = new MePermissionsController(
      stubEffectivePermissions(["case.view"]),
      stubPool("staff", null),
    );

    const result = await ctrl.getPermissions(makeReq() as never);

    assert.equal(result.roleId, null);
    assert.equal(result.role, "staff");
  });
});
