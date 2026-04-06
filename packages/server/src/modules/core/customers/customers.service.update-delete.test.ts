import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { CustomersService } from "./customers.service";
import type { RequestContext } from "../tenancy/requestContext";

void test("CustomersService.update updates fields and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("select exists(select 1 from cases")) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      if (
        sql.includes("where id = $1") &&
        params?.[0] === "c1" &&
        !sql.includes("update customers")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: { name: "Old" },
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
              type: "corporation",
              base_profile: { name: "New" },
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

  const pool = { connect: () => Promise.resolve(client) };

  const timelineWrites: unknown[] = [];
  const timelineService = {
    write: (_ctx: unknown, input: unknown) => {
      timelineWrites.push(input);
      return Promise.resolve();
    },
  };

  const service = new CustomersService(
    pool as unknown as Pool,
    timelineService as never,
  );

  const ctx: RequestContext = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "staff",
  };

  const updated = await service.update(ctx, "c1", {
    type: "corporation",
    baseProfile: { name: "New" },
  });

  assert.equal(updated.type, "corporation");

  const updateCall = calls.find((c) => c.sql.includes("update customers"));
  assert.ok(updateCall);
  assert.deepEqual(updateCall.params, [
    "c1",
    "corporation",
    JSON.stringify({ name: "New" }),
    "[]",
  ]);

  assert.equal(timelineWrites.length, 1);
  const write = timelineWrites[0] as {
    entityType: string;
    action: string;
    payload: { before: { type: string }; after: { type: string } };
  };
  assert.equal(write.entityType, "customer");
  assert.equal(write.action, "customer.updated");
  assert.equal(write.payload.before.type, "individual");
  assert.equal(write.payload.after.type, "corporation");
});

void test("CustomersService.update throws NotFoundException and BadRequestException", async () => {
  const client = {
    query: (sql: string, params?: unknown[]) => {
      if (sql.includes("where id = $1") && sql.includes("limit 1")) {
        if (params?.[0] === "c2") {
          // Mock get: not found for id c2
          return Promise.resolve({ rows: [] });
        }
      }
      if (sql.includes("update customers")) {
        // Mock update: row count 0
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: { name: "Old" },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };

  const pool = { connect: () => Promise.resolve(client) };
  const service = new CustomersService(pool as unknown as Pool, {} as never);

  const ctx: RequestContext = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "staff",
  };

  // Test NotFoundException
  await assert.rejects(
    async () => {
      await service.update(ctx, "c2", { type: "corporation" });
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Customer not found or deleted");
      return true;
    },
  );

  // Test BadRequestException (failed to update customer)
  await assert.rejects(
    async () => {
      await service.update(ctx, "c1", { type: "corporation" });
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to update customer");
      return true;
    },
  );
});

void test("CustomersService.softDelete sets status=deleted and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("select exists(select 1 from cases")) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      if (
        sql.includes("where id = $1") &&
        params?.[0] === "c1" &&
        !sql.includes("update customers")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: { name: "Alice" },
              contacts: [],
              created_at: "2026-01-01T00:00:00.000Z",
              updated_at: "2026-01-01T00:00:00.000Z",
            },
          ],
        });
      }
      if (sql.includes("update customers")) {
        return Promise.resolve({
          rowCount: 1,
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: { name: "Alice", status: "deleted" },
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

  const pool = { connect: () => Promise.resolve(client) };

  const timelineWrites: unknown[] = [];
  const timelineService = {
    write: (_ctx: unknown, input: unknown) => {
      timelineWrites.push(input);
      return Promise.resolve();
    },
  };

  const service = new CustomersService(
    pool as unknown as Pool,
    timelineService as never,
  );

  const ctx: RequestContext = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  };

  await service.softDelete(ctx, "c1");

  const updateCall = calls.find((c) => c.sql.includes("update customers"));
  assert.ok(updateCall);
  assert.deepEqual(updateCall.params, [
    "c1",
    JSON.stringify({ name: "Alice", status: "deleted" }),
  ]);

  assert.equal(timelineWrites.length, 1);
  assert.deepEqual(timelineWrites[0], {
    entityType: "customer",
    entityId: "c1",
    action: "customer.deleted",
    payload: { status: "deleted" },
  });
});

void test("CustomersService.softDelete throws if cases exist", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("select exists(select 1 from cases")) {
        return Promise.resolve({ rows: [{ exists: true }] });
      }
      if (
        sql.includes("where id = $1") &&
        params?.[0] === "c1" &&
        !sql.includes("update customers")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "individual",
              base_profile: { name: "Alice" },
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

  const service = new CustomersService(pool as unknown as Pool, {} as never);

  const ctx: RequestContext = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  };

  await assert.rejects(
    async () => {
      await service.softDelete(ctx, "c1");
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Cannot delete customer with existing cases");
      return true;
    },
  );
});

void test("CustomersService.softDelete throws NotFoundException and BadRequestException", async () => {
  const client = {
    query: (sql: string, params?: unknown[]) => {
      if (sql.includes("where id = $1") && sql.includes("limit 1")) {
        if (params?.[0] === "c2") {
          // Mock get: not found for id c2
          return Promise.resolve({ rows: [] });
        }
      }
      if (sql.includes("select exists(select 1 from cases")) {
        return Promise.resolve({ rows: [{ exists: false }] });
      }
      if (sql.includes("update customers")) {
        // Mock update: row count 0
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: { name: "Alice" },
            contacts: [],
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
    },
    release: () => undefined,
  };

  const pool = { connect: () => Promise.resolve(client) };
  const service = new CustomersService(pool as unknown as Pool, {} as never);

  const ctx: RequestContext = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "manager",
  };

  // Test NotFoundException
  await assert.rejects(
    async () => {
      await service.softDelete(ctx, "c2");
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Customer not found or already deleted");
      return true;
    },
  );

  // Test BadRequestException (failed to soft delete customer)
  await assert.rejects(
    async () => {
      await service.softDelete(ctx, "c1");
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to soft delete customer");
      return true;
    },
  );
});