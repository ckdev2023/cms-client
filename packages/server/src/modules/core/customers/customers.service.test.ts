import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { CustomersService } from "./customers.service";
import type { RequestContext } from "../tenancy/requestContext";

void test("CustomersService.create inserts row and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  type PoolClientLike = {
    query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>;
    release: () => void;
  };

  type PoolLike = {
    connect: () => Promise<PoolClientLike>;
  };

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("insert into customers")) {
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

  const pool: PoolLike = { connect: () => Promise.resolve(client) };

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

  const customer = await service.create(ctx, {
    type: "individual",
    baseProfile: { name: "Alice" },
  });

  assert.equal(customer.id, "c1");
  assert.equal(customer.type, "individual");

  const insertCall = calls.find((c) => c.sql.includes("insert into customers"));
  if (!insertCall) throw new Error("missing insert call");

  assert.deepEqual(insertCall.params, [
    "00000000-0000-4000-8000-000000000000",
    "individual",
    JSON.stringify({ name: "Alice" }),
    "[]",
  ]);

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
  const service = new CustomersService(pool as unknown as Pool, {} as never);

  const ctx: RequestContext = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "staff",
  };

  await assert.rejects(
    async () => {
      await service.create(ctx, { type: "individual" });
    },
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.message, "Failed to create customer");
      return true;
    },
  );
});

void test("CustomersService.get returns customer or null", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (
        sql.includes("where") && sql.includes("id = $1") &&
        params?.[0] === "c1" &&
        !sql.includes("update customers")
      ) {
        return Promise.resolve({
          rows: [
            {
              id: "c1",
              org_id: "00000000-0000-4000-8000-000000000000",
              type: "corporation",
              base_profile: {},
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
    role: "viewer",
  };

  const c1 = await service.get(ctx, "c1");
  assert.ok(c1);
  assert.equal(c1.id, "c1");

  const c2 = await service.get(ctx, "c2");
  assert.equal(c2, null);

  const getCall = calls.find((c) => c.sql.includes("select id, org_id, type"));
  assert.ok(getCall);
  assert.ok(
    getCall.sql.includes(
      "coalesce(base_profile->>'status', '') is distinct from 'deleted'",
    ),
  );
});

void test("CustomersService.list returns array", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("select count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }] });
      }
      return Promise.resolve({
        rows: [
          {
            id: "c1",
            org_id: "00000000-0000-4000-8000-000000000000",
            type: "individual",
            base_profile: {},
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
    role: "viewer",
  };

  const list = await service.list(ctx, { limit: 10 });
  assert.equal(list.items.length, 1);
  assert.equal(list.total, 1);
  assert.equal(list.items[0]?.id, "c1");

  const listCall = calls.find((c) => c.sql.includes("limit $1 offset $2"));
  assert.ok(listCall);
  assert.deepEqual(listCall.params, [10, 0]);
});

void test("CustomersService.list handles default parameters and empty counts", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];

  const client = {
    query: (sql: string, params?: unknown[]) => {
      calls.push({ sql: sql.trim(), params });
      if (sql.includes("select count(*)")) {
        return Promise.resolve({ rows: [] }); // Empty count branch
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
    role: "viewer",
  };

  const list = await service.list(ctx); // Default input parameter branch
  assert.equal(list.items.length, 0);
  assert.equal(list.total, 0);

  const listCall = calls.find((c) => c.sql.includes("limit $1 offset $2"));
  assert.ok(listCall);
  assert.deepEqual(listCall.params, [50, 0]); // Default limit 50, page 1 (offset 0)
});


void test("CustomersService.get returns null when not found", async () => {
  const client = {
    query: () => Promise.resolve({ rows: [] }),
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  const service = new CustomersService(pool as unknown as Pool, {} as never);
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "viewer" as const,
  };
  const result = await service.get(ctx, "c-not-found");
  assert.equal(result, null);
});

void test("CustomersService.get handles null contacts", async () => {
  const client = {
    query: () => Promise.resolve({ rows: [{
      id: "c-null-contacts",
      org_id: "00000000-0000-4000-8000-000000000000",
      type: "individual",
      base_profile: { name: "Test" },
      contacts: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    }] }),
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  const service = new CustomersService(pool as unknown as Pool, {} as never);
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "viewer" as const,
  };
  const result = await service.get(ctx, "c-null-contacts");
  assert.ok(result);
  assert.deepEqual(result.contacts, []);
});

void test("CustomersService.list handles items and count", async () => {
  const client = {
    query: (sql: string) => {
      if (sql.includes("select count(*)")) {
        return Promise.resolve({ rows: [{ count: "10" }] });
      }
      return Promise.resolve({ rows: [{
        id: "c-list-1",
        org_id: "00000000-0000-4000-8000-000000000000",
        type: "individual",
        base_profile: { name: "Test" },
        contacts: [],
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
      }] });
    },
    release: () => undefined,
  };
  const pool = { connect: () => Promise.resolve(client) };
  const service = new CustomersService(pool as unknown as Pool, {} as never);
  const ctx = {
    orgId: "00000000-0000-4000-8000-000000000000",
    userId: "00000000-0000-4000-8000-000000000001",
    role: "viewer" as const,
  };
  const list = await service.list(ctx, { page: 2, limit: 10 });
  assert.equal(list.total, 10);
  assert.equal(list.items.length, 1);
});
