import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import { CustomersService } from "./customers.service";
import type { RequestContext } from "../tenancy/requestContext";

function createCustomersService(
  pool: Pool,
  timelineService: { write?: (...args: unknown[]) => Promise<void> } = {
    write: () => Promise.resolve(),
  },
): CustomersService {
  return new CustomersService(
    pool,
    {
      canAccessCustomer: () => true,
      canEditCustomer: () => true,
    } as unknown as PermissionsService,
    timelineService as never,
  );
}

function parseJsonObjectParam(
  params: unknown[] | undefined,
  index: number,
): Record<string, unknown> {
  const value = params?.[index];
  if (typeof value !== "string") return {};

  const parsed: unknown = JSON.parse(value);
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
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
  } as unknown as Pool);

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
  const calls: { sql: string; params?: unknown[] }[] = [];
  const timelineWrites: unknown[] = [];
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
    query: (sql: string, params?: unknown[]) => {
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
    { connect: () => Promise.resolve(client) } as unknown as Pool,
    {
      write: (_ctx: unknown, input: unknown) => {
        timelineWrites.push(input);
        return Promise.resolve();
      },
    },
  );

  const ctx: RequestContext = {
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
