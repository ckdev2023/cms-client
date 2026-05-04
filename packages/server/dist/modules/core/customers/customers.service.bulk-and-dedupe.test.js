import test from "node:test";
import assert from "node:assert/strict";
import { CustomersService } from "./customers.service";
function createCustomersService(
  pool,
  timelineService = {
    write: () => Promise.resolve(),
  },
) {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    },
    timelineService,
    { create: () => Promise.resolve({}) },
  );
}
function parseJsonObjectParam(params, index) {
  const value = params?.[index];
  if (typeof value !== "string") return {};
  const parsed = JSON.parse(value);
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed
    : {};
}
void test("CustomersService.checkDuplicates returns matched fields", async () => {
  const client = {
    query: () =>
      Promise.resolve({
        rows: [
          {
            id: "c-dup",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: {
              name_cn: "Alice",
              phone: "080-1234-5678",
              email: "alice@example.com",
            },
            contacts: [],
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
  const duplicates = await service.checkDuplicates(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000011",
      role: "staff",
    },
    {
      name: "Alice",
      phone: "08012345678",
      email: "ALICE@example.com",
    },
  );
  assert.equal(duplicates.length, 1);
  assert.deepEqual(duplicates[0]?.matchedFields, ["name", "phone", "email"]);
});
void test("CustomersService.bulk actions update customers and write timeline", async () => {
  const calls = [];
  const timelineWrites = [];
  const row = {
    id: "c1",
    org_id: "00000000-0000-4000-8000-000000000000",
    type: "individual",
    base_profile: { name_cn: "Alice", owner_user_id: "owner-1", group: "old" },
    contacts: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("id::text = any")) {
        return Promise.resolve({ rows: [row] });
      }
      if (sql.includes("update customers")) {
        return Promise.resolve({
          rows: [
            {
              ...row,
              base_profile: parseJsonObjectParam(params, 1),
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const service = createCustomersService(
    { connect: () => Promise.resolve(client) },
    {
      write: (_ctx, input) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
  );
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000011",
    role: "manager",
  };
  const ownerUpdated = await service.bulkAssignOwner(ctx, ["c1"], "owner-2");
  const groupUpdated = await service.bulkChangeGroup(ctx, ["c1"], "tokyo");
  assert.equal(ownerUpdated, 1);
  assert.equal(groupUpdated, 1);
  assert.equal(
    calls.filter((call) => call.sql.includes("update customers")).length,
    2,
  );
  assert.deepEqual(timelineWrites, [
    {
      entityType: "customer",
      entityId: "c1",
      action: "customer.owner_assigned",
      payload: {
        beforeOwnerUserId: "owner-1",
        afterOwnerUserId: "owner-2",
      },
    },
    {
      entityType: "customer",
      entityId: "c1",
      action: "customer.group_changed",
      payload: {
        beforeGroup: "old",
        afterGroup: "tokyo",
      },
    },
  ]);
});
//# sourceMappingURL=customers.service.bulk-and-dedupe.test.js.map
