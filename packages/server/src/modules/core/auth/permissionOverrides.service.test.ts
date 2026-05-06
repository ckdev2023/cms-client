import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { UnprocessableEntityException } from "@nestjs/common";

import { PermissionOverridesService } from "./permissionOverrides.service";
import type { EffectivePermissionsService } from "./effective-permissions.service";
import type { TimelineService } from "../timeline/timeline.service";
import type { Pool, QueryResult, PoolClient } from "pg";
import type { PermissionCode } from "./permissions.codes";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const TARGET_USER_ID = "00000000-0000-4000-8000-00000000000b";

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

void describe("PermissionOverridesService — setOverrides validation", () => {
  void test("rejects invalid permission code", async () => {
    const queryFn = makeQueryFn({
      "FROM users": {
        rows: [{ id: TARGET_USER_ID }],
        rowCount: 1,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new PermissionOverridesService(
      pool,
      stubTimeline(),
      stubEffective(),
    );

    await assert.rejects(
      () =>
        svc.setOverrides(makeCtx(), TARGET_USER_ID, {
          overrides: [
            {
              permission: "invalid.code" as PermissionCode,
              effect: "deny",
              reason: "test reason here",
            },
          ],
        }),
      UnprocessableEntityException,
    );
  });

  void test("rejects invalid effect", async () => {
    const queryFn = makeQueryFn({
      "FROM users": {
        rows: [{ id: TARGET_USER_ID }],
        rowCount: 1,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new PermissionOverridesService(
      pool,
      stubTimeline(),
      stubEffective(),
    );

    await assert.rejects(
      () =>
        svc.setOverrides(makeCtx(), TARGET_USER_ID, {
          overrides: [
            {
              permission: "case.view" as PermissionCode,
              effect: "revoke" as "grant",
              reason: "test reason here",
            },
          ],
        }),
      UnprocessableEntityException,
    );
  });

  void test("rejects reason shorter than 5 characters", async () => {
    const queryFn = makeQueryFn({
      "FROM users": {
        rows: [{ id: TARGET_USER_ID }],
        rowCount: 1,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new PermissionOverridesService(
      pool,
      stubTimeline(),
      stubEffective(),
    );

    await assert.rejects(
      () =>
        svc.setOverrides(makeCtx(), TARGET_USER_ID, {
          overrides: [
            {
              permission: "case.view" as PermissionCode,
              effect: "deny",
              reason: "abc",
            },
          ],
        }),
      UnprocessableEntityException,
    );
  });

  void test("rejects duplicate permission codes", async () => {
    const queryFn = makeQueryFn({
      "FROM users": {
        rows: [{ id: TARGET_USER_ID }],
        rowCount: 1,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new PermissionOverridesService(
      pool,
      stubTimeline(),
      stubEffective(),
    );

    await assert.rejects(
      () =>
        svc.setOverrides(makeCtx(), TARGET_USER_ID, {
          overrides: [
            {
              permission: "case.view" as PermissionCode,
              effect: "deny",
              reason: "reason one here",
            },
            {
              permission: "case.view" as PermissionCode,
              effect: "grant",
              reason: "reason two here",
            },
          ],
        }),
      UnprocessableEntityException,
    );
  });

  void test("rejects when user not in org", async () => {
    const queryFn = makeQueryFn({
      "FROM users": {
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new PermissionOverridesService(
      pool,
      stubTimeline(),
      stubEffective(),
    );

    await assert.rejects(
      () =>
        svc.setOverrides(makeCtx(), TARGET_USER_ID, {
          overrides: [
            {
              permission: "case.view" as PermissionCode,
              effect: "deny",
              reason: "reason text here",
            },
          ],
        }),
      (err: Error) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok(err.message.includes("USER_NOT_FOUND"));
        return true;
      },
    );
  });
});

void describe("PermissionOverridesService — deleteOverride validation", () => {
  void test("rejects when user not in org", async () => {
    const queryFn = makeQueryFn({
      "FROM users": {
        rows: [],
        rowCount: 0,
      } as unknown as QueryResult,
    });
    const pool = makePool(queryFn);
    const svc = new PermissionOverridesService(
      pool,
      stubTimeline(),
      stubEffective(),
    );

    await assert.rejects(
      () => svc.deleteOverride(makeCtx(), TARGET_USER_ID, "case.view"),
      (err: Error) => {
        assert.ok(err instanceof UnprocessableEntityException);
        assert.ok(err.message.includes("USER_NOT_FOUND"));
        return true;
      },
    );
  });
});
