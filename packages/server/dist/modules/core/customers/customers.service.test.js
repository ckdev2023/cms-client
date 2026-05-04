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
void test("CustomersService.create inserts row with generated customer number and writes timeline", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("coalesce(max(substring")) {
        return Promise.resolve({ rows: [{ max_seq: "7" }] });
      }
      if (sql.includes("insert into customers")) {
        const insertParams = params;
        const persistedProfile = JSON.parse(insertParams[2]);
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: persistedProfile,
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  const timelineWrites = [];
  const timelineService = {
    write: (_ctx, input) => {
      timelineWrites.push(input);
      return Promise.resolve();
    },
  };
  const service = createCustomersService(pool, timelineService);
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "staff",
  };
  const customer = await service.create(ctx, {
    type: "individual",
    baseProfile: { name_cn: "Alice" },
  });
  assert.equal(customer.id, "c1");
  assert.equal(customer.type, "individual");
  assert.match(String(customer.baseProfile.customerNumber), /^CUS-\d{6}-0008$/);
  const insertCall = calls.find((c) => c.sql.includes("insert into customers"));
  if (!insertCall) throw new Error("missing insert call");
  const insertParams = insertCall.params;
  assert.equal(insertParams[0], "00000000-0000-4000-8000-000000000000");
  assert.equal(insertParams[1], "individual");
  const persistedProfile = JSON.parse(insertParams[2]);
  assert.equal(persistedProfile.name_cn, "Alice");
  assert.match(String(persistedProfile.customerNumber), /^CUS-\d{6}-0008$/);
  assert.equal(insertParams[3], "[]");
  assert.equal(timelineWrites.length, 1);
  assert.deepEqual(timelineWrites[0], {
    entityType: "customer",
    entityId: "c1",
    action: "customer.created",
    payload: { type: "individual" },
  });
});
void test("CustomersService.create throws BadRequestException on insert failure", async () => {
  const client = {
    query: () => Promise.resolve({ rows: [] }),
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  const service = createCustomersService(pool);
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "staff",
  };
  await assert.rejects(
    async () => {
      await service.create(ctx, {
        type: "individual",
        baseProfile: { name_cn: "Alice" },
      });
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to create customer");
      return true;
    },
  );
});
void test("CustomersService.create validates individual baseProfile names", async () => {
  let called = false;
  const client = {
    query: () => {
      called = true;
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };
  const service = createCustomersService({
    connect: () => Promise.resolve(client),
  });
  await assert.rejects(
    () =>
      service.create(
        {
          orgId: "00000000-0000-4000-8000-000000000000",
          userId: "00000000-0000-4000-8000-000000000001",
          role: "staff",
        },
        { type: "individual", baseProfile: { nationality: "CN" } },
      ),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("name_cn"));
      return true;
    },
  );
  assert.equal(called, false);
});
void test("CustomersService.update merges baseProfile before validation", async () => {
  const calls = [];
  const client = {
    query: (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("id = $1") && !sql.includes("update customers")) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: { name_cn: "Alice" },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("update customers")) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: { name_cn: "Alice", nationality: "CN" },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-02T00:00:00.000Z",
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
  const updated = await service.update(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000001",
      role: "staff",
    },
    "c1",
    { baseProfile: { nationality: "CN" } },
  );
  assert.equal(updated.baseProfile.name_cn, "Alice");
  assert.equal(updated.baseProfile.nationality, "CN");
  const updateCall = calls.find((call) =>
    call.sql.includes("update customers"),
  );
  assert.deepEqual(
    updateCall?.params?.[2],
    JSON.stringify({ name_cn: "Alice", nationality: "CN" }),
  );
});
//# sourceMappingURL=customers.service.test.js.map
