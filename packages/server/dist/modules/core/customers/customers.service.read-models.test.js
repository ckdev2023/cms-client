import test from "node:test";
import assert from "node:assert/strict";
import { CustomersService } from "./customers.service";
function makePermissionsService(overrides = {}) {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
    ...overrides,
  };
}
function createCustomersService(
  pool,
  timelineService = {
    write: () => Promise.resolve(),
  },
  permissionsOverrides = {},
) {
  return new CustomersService(
    pool,
    makePermissionsService(permissionsOverrides),
    timelineService,
    { create: () => Promise.resolve({}) },
  );
}
void test("CustomersService.get returns customer or null", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (
        sql.includes("where") &&
        sql.includes("id = $1") &&
        params?.[0] === "c1" &&
        !sql.includes("update customers")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "corporation",
              base_profile: {
                name: "Acme Japan",
                legalName: "Acme Japan株式会社",
                customerNumber: "CUS-001",
                furigana: "アクメジャパン",
                owner: { name: "Yamada Shota" },
                groupId: "tokyo",
                nationality: "JP",
              },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
              total_cases: 3,
              active_cases: 2,
              archived_cases: 1,
              case_names: ["在留資格認定", "更新許可"],
              last_case_created_date: "2026-01-03T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "viewer",
  };
  const c1 = await service.get(ctx, "c1");
  assert.ok(c1);
  assert.equal(c1.id, "c1");
  assert.equal(c1.displayName, "Acme Japan株式会社");
  assert.equal(c1.legalName, "Acme Japan株式会社");
  assert.equal(c1.totalCases, 3);
  assert.equal(c1.activeCases, 2);
  assert.equal(c1.archivedCases, 1);
  assert.deepEqual(c1.caseNames, ["在留資格認定", "更新許可"]);
  assert.equal(c1.lastCaseCreatedDate, "2026-01-03T00:00:00.000Z");
  const c2 = await service.get(ctx, "c2");
  assert.equal(c2, null);
  const getCall = calls.find((call) => call.sql.includes("select c.*"));
  assert.ok(getCall);
  assert.ok(getCall.sql.includes("as archived_cases"));
  assert.ok(
    getCall.sql.includes(
      "coalesce(c.base_profile->>'status', '') is distinct from 'deleted'",
    ),
  );
});
void test("CustomersService.list returns array", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("count(*)::text as count from customers c")) {
        return Promise.resolve({ rows: [{ count: "1" }] });
      }
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: {
              name: "Alice Tanaka",
              customerNumber: "CUS-001",
              owner: { name: "Yamada Shota" },
              groupId: "tokyo",
            },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            total_cases: 4,
            active_cases: 1,
            archived_cases: 3,
            case_names: ["案件A"],
            last_case_created_date: "2026-01-04T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  };
  const list = await service.list(ctx, { limit: 10 });
  assert.equal(list.items.length, 1);
  assert.equal(list.total, 1);
  assert.equal(list.items[0]?.id, "c1");
  assert.equal(list.items[0]?.displayName, "Alice Tanaka");
  assert.equal(list.items[0]?.owner.initials, "YS");
  assert.equal(list.items[0]?.totalCases, 4);
  assert.equal(list.items[0]?.activeCases, 1);
  const listCall = calls.find((call) =>
    call.sql.includes("limit $1 offset $2"),
  );
  assert.ok(listCall);
  assert.deepEqual(listCall.params, [10, 0]);
});
void test("CustomersService.list handles default parameters and empty counts", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("count(*)::text as count from customers c")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  };
  const list = await service.list(ctx);
  assert.equal(list.items.length, 0);
  assert.equal(list.total, 0);
  const listCall = calls.find((call) =>
    call.sql.includes("limit $1 offset $2"),
  );
  assert.ok(listCall);
  assert.deepEqual(listCall.params, [50, 0]);
});
void test("CustomersService.get returns null when not found", async () => {
  const client = {
    query: () => Promise.resolve({ rows: [] }),
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const result = await service.get(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "viewer",
    },
    "c-not-found",
  );
  assert.equal(result, null);
});
void test("CustomersService.get handles null contacts", async () => {
  const client = {
    query: () =>
      Promise.resolve({
        rows: [
          {
            id: "c-null-contacts",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: { name: "Test" },
            contacts: null,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const result = await service.get(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "viewer",
    },
    "c-null-contacts",
  );
  assert.ok(result);
  assert.equal(result.displayName, "Test");
  assert.equal(result.email, "");
  assert.deepEqual(result.caseNames, []);
});
void test("CustomersService.list handles items and count", async () => {
  const client = {
    query: (sql) => {
      if (sql.includes("count(*)::text as count from customers c")) {
        return Promise.resolve({ rows: [{ count: "10" }] });
      }
      return Promise.resolve({
        rows: [
          {
            id: "c-list-1",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: { name: "Test" },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const list = await service.list(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "manager",
    },
    { page: 2, limit: 10 },
  );
  assert.equal(list.total, 10);
  assert.equal(list.items.length, 1);
});
void test("CustomersService.get returns null when permission denies access", async () => {
  const client = {
    query: () =>
      Promise.resolve({
        rows: [
          {
            id: "c-denied",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: { name: "Hidden Customer" },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    release: () => undefined,
  };
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) },
    { write: () => Promise.resolve() },
    { canAccessCustomer: () => false },
  );
  const result = await service.get(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "viewer",
    },
    "c-denied",
  );
  assert.equal(result, null);
});
void test("CustomersService.list applies group scope and maps aggregates", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("count(*)::text as count from customers c")) {
        return Promise.resolve({ rows: [{ count: "1" }] });
      }
      return Promise.resolve({
        rows: [
          {
            id: "c-group-1",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: {
              name: "Group Customer",
              owner: { name: "Ito Ken" },
              groupId: "tokyo",
            },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
            total_cases: 5,
            active_cases: 2,
            archived_cases: 3,
            case_names: ["案件A", "案件B"],
            last_case_created_date: "2026-01-05T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  const list = await service.list(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "viewer",
      groupId: "tokyo",
    },
    { scope: "group", limit: 10 },
  );
  assert.equal(list.total, 1);
  assert.equal(list.items[0]?.group, "tokyo");
  assert.equal(list.items[0]?.totalCases, 5);
  assert.equal(list.items[0]?.activeCases, 2);
  const countCall = calls.find((call) =>
    call.sql.includes("count(*)::text as count from customers c"),
  );
  assert.ok(countCall);
  assert.ok(
    countCall.sql.includes("groupId") || countCall.sql.includes("group_id"),
  );
  assert.deepEqual(countCall.params, ["tokyo"]);
  const listCall = calls.find((call) =>
    call.sql.includes("limit $2 offset $3"),
  );
  assert.ok(listCall);
  assert.deepEqual(listCall.params, ["tokyo", 10, 0]);
});
void test("CustomersService.list applies keyword and owner-scope filters", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("count(*)::text as count from customers c")) {
        return Promise.resolve({ rows: [{ count: "0" }] });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  await service.list(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000011",
      role: "viewer",
    },
    {
      keyword: "alice",
      owner: "owner-1",
      group: "tokyo",
      phone: "080-1234-5678",
      email: "alice@example.com",
      activeCases: "yes",
      limit: 20,
    },
  );
  const countCall = calls.find((call) =>
    call.sql.includes("count(*)::text as count from customers c"),
  );
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("owner_user_id"));
  assert.ok(countCall.sql.includes("collaborator_user_ids"));
  assert.ok(countCall.sql.includes("regexp_replace"));
  assert.ok(countCall.sql.includes("from cases ca"));
  assert.deepEqual(countCall.params?.slice(0, 6), [
    "00000000-0000-4000-8000-000000000011",
    "%alice%",
    "%08012345678%",
    "%alice@example.com%",
    "tokyo",
    "owner-1",
  ]);
});
//# sourceMappingURL=customers.service.read-models.test.js.map
