import { test, describe, mock } from "node:test";
import assert from "node:assert/strict";
import type { Pool, QueryResult, QueryResultRow } from "pg";

import { EffectivePermissionsService } from "./effective-permissions.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-000000000002";
const ROLE_ID = "00000000-0000-4000-8000-000000000099";

type RowRouter = (sql: string, params: unknown[]) => { rows: unknown[] };

function createTestPool(router: RowRouter): Pool {
  const client = {
    query: (sql: string, params: unknown[] = []) => {
      const result = router(sql, params);
      return Promise.resolve(result as QueryResult<QueryResultRow>);
    },
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  return pool as unknown as Pool;
}

function createService(router: RowRouter): EffectivePermissionsService {
  return new EffectivePermissionsService(createTestPool(router));
}

// ── resolve: role_id ルート ──

void describe("EffectivePermissionsService.resolve (role_id path)", () => {
  void test("returns role permissions from DB when role_id is set", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [{ role_code: "staff", role_id: ROLE_ID }] };
      }
      if (sql.includes("SELECT permission FROM role_permissions")) {
        return {
          rows: [{ permission: "case.view" }, { permission: "case.edit" }],
        };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.ok(perms.has("case.view"));
    assert.ok(perms.has("case.edit"));
    assert.equal(perms.size, 2);
  });

  void test("returns empty set when user not found", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.equal(perms.size, 0);
  });
});

// ── resolve: fallback ルート ──

void describe("EffectivePermissionsService.resolve (fallback path)", () => {
  void test("uses getSystemRolePermissions when role_id is null", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.ok(perms.has("case.view"));
    assert.ok(perms.has("customer.view"));
    assert.ok(perms.has("group.view"));
    assert.ok(perms.has("user.view"));
    assert.equal(perms.size, 4);
  });
});

// ── resolve: 覆盖合併 ──

void describe("EffectivePermissionsService.resolve (override merge)", () => {
  void test("grant override adds permission not in role", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return {
          rows: [{ permission: "case.export", effect: "grant" }],
        };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.ok(perms.has("case.export"));
    assert.ok(perms.has("case.view"));
  });

  void test("deny override removes permission from role", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [{ role_code: "staff", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return {
          rows: [{ permission: "case.export", effect: "deny" }],
        };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.ok(!perms.has("case.export"));
    assert.ok(perms.has("case.view"));
  });

  void test("deny takes priority over grant for same permission", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return {
          rows: [
            { permission: "case.export", effect: "grant" },
            { permission: "case.export", effect: "deny" },
          ],
        };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.ok(!perms.has("case.export"));
  });

  void test("multiple overrides apply correctly", async () => {
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        return { rows: [{ role_code: "staff", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return {
          rows: [
            { permission: "case.export", effect: "deny" },
            { permission: "permission.override", effect: "grant" },
          ],
        };
      }
      return { rows: [] };
    });

    const perms = await svc.resolve(ORG_ID, USER_ID);
    assert.ok(!perms.has("case.export"));
    assert.ok(perms.has("permission.override"));
    assert.ok(perms.has("case.view"));
  });
});

// ── キャッシュ ──

void describe("EffectivePermissionsService caching", () => {
  void test("second call uses cache (no extra DB query)", async () => {
    let queryCount = 0;
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        queryCount++;
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    const first = await svc.resolve(ORG_ID, USER_ID);
    const second = await svc.resolve(ORG_ID, USER_ID);

    assert.equal(queryCount, 1);
    assert.deepEqual(first, second);
  });

  void test("invalidate forces fresh DB query", async () => {
    let queryCount = 0;
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        queryCount++;
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await svc.resolve(ORG_ID, USER_ID);
    assert.equal(queryCount, 1);

    svc.invalidate(USER_ID);
    await svc.resolve(ORG_ID, USER_ID);
    assert.equal(queryCount, 2);
  });

  void test("invalidateAll clears all cached entries", async () => {
    let queryCount = 0;
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        queryCount++;
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await svc.resolve(ORG_ID, USER_ID);
    svc.invalidateAll();
    await svc.resolve(ORG_ID, USER_ID);
    assert.equal(queryCount, 2);
  });

  void test("cache expires after TTL", async () => {
    let queryCount = 0;
    const svc = createService((sql) => {
      if (sql.includes("FROM users u")) {
        queryCount++;
        return { rows: [{ role_code: "viewer", role_id: null }] };
      }
      if (sql.includes("FROM user_permission_overrides")) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    await svc.resolve(ORG_ID, USER_ID);
    assert.equal(queryCount, 1);

    const original = Date.now;
    mock.fn(() => original() + 61_000);
    const mockDateNow = mock.fn(() => original() + 61_000);
    Date.now = mockDateNow;
    try {
      await svc.resolve(ORG_ID, USER_ID);
      assert.equal(queryCount, 2);
    } finally {
      Date.now = original;
    }
  });
});
