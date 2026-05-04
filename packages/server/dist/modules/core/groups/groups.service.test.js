import test from "node:test";
import assert from "node:assert/strict";
import { GroupsService } from "./groups.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const GROUP_ID_1 = "00000000-0000-4000-8000-a00000000001";
function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "manager" };
}
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function makeTimelineService(calls = []) {
  return {
    write(_ctx, input) {
      calls.push(input);
      return Promise.resolve();
    },
  };
}
function detailRow(overrides = {}) {
  return {
    id: GROUP_ID_1,
    org_id: ORG_ID,
    group_no: "GRP-001",
    name: "Alpha",
    description: null,
    active_flag: true,
    created_by: USER_ID,
    created_at: "2026-04-28T00:00:00Z",
    updated_by: USER_ID,
    updated_at: "2026-04-28T00:00:00Z",
    ...overrides,
  };
}
// ── listGroups ──────────────────────────────────────────────────
function summaryRow(overrides = {}) {
  return {
    id: GROUP_ID_1,
    org_id: ORG_ID,
    group_no: "GRP-001",
    name: "Alpha",
    description: null,
    active_flag: true,
    created_at: "2026-04-28T00:00:00Z",
    active_case_count: "3",
    member_count: "2",
    ...overrides,
  };
}
const GROUP_ID_2 = "00000000-0000-4000-8000-a00000000002";
void test("listGroups returns items with correct aggregated counts", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups")) {
      return Promise.resolve({
        rows: [
          summaryRow(),
          summaryRow({
            id: GROUP_ID_2,
            group_no: "GRP-002",
            name: "Beta",
            active_case_count: "0",
            member_count: "5",
          }),
        ],
        rowCount: 2,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.listGroups(makeCtx());
  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
  const first = result.items[0];
  assert.equal(first.id, GROUP_ID_1);
  assert.equal(first.name, "Alpha");
  assert.equal(first.activeCaseCount, 3);
  assert.equal(first.memberCount, 2);
  assert.equal(first.activeFlag, true);
  assert.equal(first.groupNo, "GRP-001");
  const second = result.items[1];
  assert.equal(second.id, GROUP_ID_2);
  assert.equal(second.activeCaseCount, 0);
  assert.equal(second.memberCount, 5);
});
void test("listGroups returns empty list when no groups exist", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.listGroups(makeCtx());
  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});
void test("listGroups status=active filters by active_flag=true", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("FROM groups")) {
      return Promise.resolve({
        rows: [summaryRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.listGroups(makeCtx(), { status: "active" });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].activeFlag, true);
  const listCall = calls.find((c) => c.sql.includes("FROM groups"));
  assert.ok(listCall);
  assert.ok(listCall.sql.includes("active_flag"));
  assert.deepEqual(listCall.params, [true]);
});
void test("listGroups status=disabled filters by active_flag=false", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("FROM groups")) {
      return Promise.resolve({
        rows: [summaryRow({ active_flag: false })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.listGroups(makeCtx(), { status: "disabled" });
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].activeFlag, false);
  const listCall = calls.find((c) => c.sql.includes("FROM groups"));
  assert.ok(listCall);
  assert.deepEqual(listCall.params, [false]);
});
void test("listGroups without status returns all groups (no WHERE)", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("FROM groups")) {
      return Promise.resolve({
        rows: [
          summaryRow(),
          summaryRow({ id: GROUP_ID_2, active_flag: false }),
        ],
        rowCount: 2,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.listGroups(makeCtx());
  assert.equal(result.total, 2);
  const listCall = calls.find((c) => c.sql.includes("FROM groups"));
  assert.ok(listCall);
  assert.deepEqual(listCall.params, []);
});
void test("listGroups parses string counts to numbers", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups")) {
      return Promise.resolve({
        rows: [summaryRow({ active_case_count: "42", member_count: "7" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const result = await service.listGroups(makeCtx());
  const item = result.items[0];
  assert.strictEqual(item.activeCaseCount, 42);
  assert.strictEqual(item.memberCount, 7);
  assert.strictEqual(typeof item.activeCaseCount, "number");
  assert.strictEqual(typeof item.memberCount, "number");
});
// ── getGroupDetail ──────────────────────────────────────────────
function memberRow(overrides = {}) {
  return {
    id: "mem-1",
    user_id: USER_ID,
    is_primary_group: true,
    active_flag: true,
    joined_at: "2026-01-15T00:00:00Z",
    user_name: "Tanaka",
    user_email: "tanaka@example.com",
    user_role: "staff",
    ...overrides,
  };
}
void test("getGroupDetail returns full detail with members and references", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups g WHERE")) {
      return Promise.resolve({ rows: [detailRow()], rowCount: 1 });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({ rows: [memberRow()], rowCount: 1 });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "5", case_count: "8" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const detail = await service.getGroupDetail(makeCtx(), GROUP_ID_1);
  assert.ok(detail);
  assert.equal(detail.id, GROUP_ID_1);
  assert.equal(detail.name, "Alpha");
  assert.equal(detail.activeFlag, true);
  assert.equal(detail.groupNo, "GRP-001");
  assert.equal(detail.createdBy, USER_ID);
  assert.equal(detail.members.length, 1);
  assert.equal(detail.members[0].userId, USER_ID);
  assert.equal(detail.members[0].userName, "Tanaka");
  assert.equal(detail.members[0].isPrimaryGroup, true);
  assert.equal(detail.references.customerCount, 5);
  assert.equal(detail.references.caseCount, 8);
});
void test("getGroupDetail returns null for non-existent group", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups g WHERE")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const detail = await service.getGroupDetail(makeCtx(), "non-existent-id");
  assert.equal(detail, null);
});
void test("getGroupDetail returns detail with empty members and zero references", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups g WHERE")) {
      return Promise.resolve({
        rows: [detailRow({ active_flag: false })],
        rowCount: 1,
      });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "0", case_count: "0" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const detail = await service.getGroupDetail(makeCtx(), GROUP_ID_1);
  assert.ok(detail);
  assert.equal(detail.activeFlag, false);
  assert.deepEqual(detail.members, []);
  assert.equal(detail.references.customerCount, 0);
  assert.equal(detail.references.caseCount, 0);
});
void test("getGroupDetail reads disabled group successfully", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups g WHERE")) {
      return Promise.resolve({
        rows: [detailRow({ active_flag: false, description: "archived" })],
        rowCount: 1,
      });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "2", case_count: "3" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const detail = await service.getGroupDetail(makeCtx(), GROUP_ID_1);
  assert.ok(detail);
  assert.equal(detail.activeFlag, false);
  assert.equal(detail.description, "archived");
  assert.equal(detail.references.customerCount, 2);
  assert.equal(detail.references.caseCount, 3);
});
void test("getGroupDetail returns multiple members", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM groups g WHERE")) {
      return Promise.resolve({ rows: [detailRow()], rowCount: 1 });
    }
    if (sql.includes("user_group_memberships")) {
      return Promise.resolve({
        rows: [
          memberRow(),
          memberRow({
            id: "mem-2",
            user_id: "00000000-0000-4000-8000-000000000099",
            user_name: "Suzuki",
            is_primary_group: false,
          }),
        ],
        rowCount: 2,
      });
    }
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "0", case_count: "0" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const detail = await service.getGroupDetail(makeCtx(), GROUP_ID_1);
  assert.ok(detail);
  assert.equal(detail.members.length, 2);
  assert.equal(detail.members[0].userName, "Tanaka");
  assert.equal(detail.members[1].userName, "Suzuki");
  assert.equal(detail.members[1].isPrimaryGroup, false);
});
// ── countReferences ─────────────────────────────────────────────
void test("countReferences returns zero when no cases reference group", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "0", case_count: "0" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const refs = await service.countReferences(makeCtx(), GROUP_ID_1);
  assert.equal(refs.customerCount, 0);
  assert.equal(refs.caseCount, 0);
});
void test("countReferences returns correct counts", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({
        rows: [{ customer_count: "3", case_count: "10" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const refs = await service.countReferences(makeCtx(), GROUP_ID_1);
  assert.equal(refs.customerCount, 3);
  assert.equal(refs.caseCount, 10);
});
void test("countReferences handles empty result set gracefully", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("FROM cases c") && sql.includes("group_id")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new GroupsService(pool, makeTimelineService([]));
  const refs = await service.countReferences(makeCtx(), GROUP_ID_1);
  assert.equal(refs.customerCount, 0);
  assert.equal(refs.caseCount, 0);
});
//# sourceMappingURL=groups.service.test.js.map
