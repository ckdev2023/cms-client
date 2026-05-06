import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { UnprocessableEntityException } from "@nestjs/common";

import { RolesAdminService } from "./rolesAdmin.service";
import type { EffectivePermissionsService } from "./effective-permissions.service";
import type { TimelineService } from "../timeline/timeline.service";
import type { Pool, QueryResult, PoolClient } from "pg";
import type { PermissionCode } from "./permissions.codes";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const ROLE_ID = "00000000-0000-4000-8000-00000000000c";

function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "owner" as const };
}

function makeQueryFn(responses: Record<string, QueryResult>) {
  return (sql: string): Promise<QueryResult> => {
    if (sql.includes("SET LOCAL")) {
      return Promise.resolve({
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult);
    }
    for (const [key, value] of Object.entries(responses)) {
      if (sql.includes(key)) return Promise.resolve(value);
    }
    return Promise.resolve({ rows: [], rowCount: 0 } as unknown as QueryResult);
  };
}

function makePool(
  queryFn: (sql: string, params?: unknown[]) => Promise<QueryResult>,
): Pool {
  const mockClient = {
    query: queryFn,
    release: () => undefined,
  };
  return {
    connect: () => Promise.resolve(mockClient as unknown as PoolClient),
  } as unknown as Pool;
}

function stubTimeline(): TimelineService {
  return {
    write: () => Promise.resolve(),
  } as unknown as TimelineService;
}

function stubEffective(): EffectivePermissionsService {
  return {
    resolve: () => Promise.resolve(new Set()),
    invalidate: () => undefined,
    invalidateAll: () => undefined,
  } as unknown as EffectivePermissionsService;
}

void describe("RolesAdminService — createRole validation", () => {
  void test("rejects invalid permission codes", async () => {
    const pool = makePool(
      makeQueryFn({
        "INSERT INTO roles": {
          rows: [{ id: ROLE_ID }],
          rowCount: 1,
        } as unknown as QueryResult,
      }),
    );
    const svc = new RolesAdminService(pool, stubTimeline(), stubEffective());

    await assert.rejects(
      () =>
        svc.createRole(makeCtx(), {
          code: "test",
          name: "Test",
          permissions: ["invalid.permission" as PermissionCode],
        }),
      UnprocessableEntityException,
    );
  });

  void test("rejects duplicate permission codes", async () => {
    const pool = makePool(
      makeQueryFn({
        "INSERT INTO roles": {
          rows: [{ id: ROLE_ID }],
          rowCount: 1,
        } as unknown as QueryResult,
      }),
    );
    const svc = new RolesAdminService(pool, stubTimeline(), stubEffective());

    await assert.rejects(
      () =>
        svc.createRole(makeCtx(), {
          code: "test",
          name: "Test",
          permissions: [
            "case.view" as PermissionCode,
            "case.view" as PermissionCode,
          ],
        }),
      UnprocessableEntityException,
    );
  });
});

void describe("RolesAdminService — updateRole validation", () => {
  void test("rejects modification of system role", async () => {
    const queryFn = makeQueryFn({
      "FROM roles": {
        rows: [
          {
            id: ROLE_ID,
            org_id: ORG_ID,
            code: "owner",
            name: "Owner",
            description: null,
            is_system: true,
            created_by: null,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-01"),
            member_count: "2",
          },
        ],
        rowCount: 1,
      } as unknown as QueryResult,
      "FROM role_permissions": {
        rows: [{ permission: "case.view" }],
        rowCount: 1,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new RolesAdminService(pool, stubTimeline(), stubEffective());

    await assert.rejects(
      () => svc.updateRole(makeCtx(), ROLE_ID, { name: "New Name" }),
      (err: Error) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok(err.message.includes("ROLE_SYSTEM_CANNOT_MODIFY"));
        return true;
      },
    );
  });
});

void describe("RolesAdminService — deleteRole validation", () => {
  void test("rejects deletion of system role", async () => {
    const queryFn = makeQueryFn({
      "FROM roles": {
        rows: [
          {
            id: ROLE_ID,
            org_id: ORG_ID,
            code: "owner",
            name: "Owner",
            description: null,
            is_system: true,
            created_by: null,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-01"),
            member_count: "0",
          },
        ],
        rowCount: 1,
      } as unknown as QueryResult,
      "FROM role_permissions": {
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new RolesAdminService(pool, stubTimeline(), stubEffective());

    await assert.rejects(
      () => svc.deleteRole(makeCtx(), ROLE_ID),
      (err: Error) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok(err.message.includes("ROLE_SYSTEM_CANNOT_DELETE"));
        return true;
      },
    );
  });

  void test("rejects deletion when role has members", async () => {
    const queryFn = makeQueryFn({
      "FROM roles": {
        rows: [
          {
            id: ROLE_ID,
            org_id: ORG_ID,
            code: "custom",
            name: "Custom",
            description: null,
            is_system: false,
            created_by: USER_ID,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-01"),
            member_count: "3",
          },
        ],
        rowCount: 1,
      } as unknown as QueryResult,
      "FROM role_permissions": {
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new RolesAdminService(pool, stubTimeline(), stubEffective());

    await assert.rejects(
      () => svc.deleteRole(makeCtx(), ROLE_ID),
      (err: Error) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok(err.message.includes("ROLE_HAS_MEMBERS"));
        return true;
      },
    );
  });
});

void describe("RolesAdminService — setRolePermissions validation", () => {
  void test("rejects modification of system role permissions", async () => {
    const queryFn = makeQueryFn({
      "FROM roles": {
        rows: [
          {
            id: ROLE_ID,
            org_id: ORG_ID,
            code: "owner",
            name: "Owner",
            description: null,
            is_system: true,
            created_by: null,
            created_at: new Date("2026-01-01"),
            updated_at: new Date("2026-01-01"),
            member_count: "0",
          },
        ],
        rowCount: 1,
      } as unknown as QueryResult,
      "FROM role_permissions": {
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new RolesAdminService(pool, stubTimeline(), stubEffective());

    await assert.rejects(
      () =>
        svc.setRolePermissions(makeCtx(), ROLE_ID, {
          permissions: ["case.view"],
        }),
      (err: Error) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok(
          err.message.includes("ROLE_SYSTEM_CANNOT_MODIFY_PERMISSIONS"),
        );
        return true;
      },
    );
  });
});
