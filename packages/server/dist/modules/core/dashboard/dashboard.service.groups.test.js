import assert from "node:assert/strict";
import test from "node:test";
import { DashboardService } from "./dashboard.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
function makeCtx(role = "viewer") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function isTxSql(sql) {
  return /^(begin|commit|rollback|select set_config)/i.test(sql.trim());
}
function makePool(queryFn) {
  return {
    connect: () =>
      Promise.resolve({
        query: (sql, params) =>
          isTxSql(sql)
            ? Promise.resolve({ rows: [], rowCount: 0 })
            : queryFn(sql, params),
        release: () => undefined,
      }),
  };
}
void test("listVisibleGroups viewer returns only own active groups with isPrimary", async () => {
  const service = new DashboardService(
    makePool((sql) => {
      if (
        sql.includes("user_group_memberships") &&
        sql.includes("g.active_flag")
      ) {
        return Promise.resolve({
          rows: [
            { id: "g-1", name: "Tokyo 1", is_primary_group: true },
            { id: "g-2", name: "Tokyo 2", is_primary_group: false },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  );
  const result = await service.listVisibleGroups(makeCtx("viewer"));
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    id: "g-1",
    name: "Tokyo 1",
    isPrimary: true,
    isMember: true,
  });
  assert.deepEqual(result[1], {
    id: "g-2",
    name: "Tokyo 2",
    isPrimary: false,
    isMember: true,
  });
});
void test("listVisibleGroups staff returns only own active groups", async () => {
  const service = new DashboardService(
    makePool((sql) => {
      if (
        sql.includes("user_group_memberships") &&
        sql.includes("g.active_flag")
      ) {
        return Promise.resolve({
          rows: [{ id: "g-1", name: "Tokyo 1", is_primary_group: true }],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  );
  const result = await service.listVisibleGroups(makeCtx("staff"));
  assert.equal(result.length, 1);
  assert.equal(result[0]?.isMember, true);
});
void test("listVisibleGroups manager sees own groups plus other org active groups", async () => {
  const service = new DashboardService(
    makePool((sql) => {
      if (
        sql.includes("user_group_memberships") &&
        sql.includes("g.active_flag")
      ) {
        return Promise.resolve({
          rows: [{ id: "g-1", name: "Tokyo 1", is_primary_group: true }],
        });
      }
      if (
        sql.includes("from groups g") &&
        sql.includes("g.active_flag = true") &&
        !sql.includes("user_group_memberships")
      ) {
        return Promise.resolve({
          rows: [
            { id: "g-1", name: "Tokyo 1" },
            { id: "g-3", name: "Osaka 1" },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  );
  const result = await service.listVisibleGroups(makeCtx("manager"));
  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    id: "g-1",
    name: "Tokyo 1",
    isPrimary: true,
    isMember: true,
  });
  assert.deepEqual(result[1], {
    id: "g-3",
    name: "Osaka 1",
    isPrimary: false,
    isMember: false,
  });
});
void test("listVisibleGroups owner sees own groups plus other org active groups", async () => {
  const service = new DashboardService(
    makePool((sql) => {
      if (
        sql.includes("user_group_memberships") &&
        sql.includes("g.active_flag")
      ) {
        return Promise.resolve({ rows: [] });
      }
      if (
        sql.includes("from groups g") &&
        sql.includes("g.active_flag = true") &&
        !sql.includes("user_group_memberships")
      ) {
        return Promise.resolve({
          rows: [
            { id: "g-1", name: "Tokyo 1" },
            { id: "g-2", name: "Tokyo 2" },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    }),
  );
  const result = await service.listVisibleGroups(makeCtx("owner"));
  assert.equal(result.length, 2);
  for (const g of result) {
    assert.equal(g.isPrimary, false);
    assert.equal(g.isMember, false);
  }
});
void test("listVisibleGroups viewer with no memberships returns empty", async () => {
  const service = new DashboardService(
    makePool(() => Promise.resolve({ rows: [] })),
  );
  const result = await service.listVisibleGroups(makeCtx("viewer"));
  assert.deepEqual(result, []);
});
void test("listVisibleGroups manager with no memberships and no org groups returns empty", async () => {
  const service = new DashboardService(
    makePool(() => Promise.resolve({ rows: [] })),
  );
  const result = await service.listVisibleGroups(makeCtx("manager"));
  assert.deepEqual(result, []);
});
//# sourceMappingURL=dashboard.service.groups.test.js.map
