import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import { CustomersService } from "./customers.service";

function makePermissionsService(): PermissionsService {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
  } as unknown as PermissionsService;
}

function createCustomersService(pool: Pool): CustomersService {
  return new CustomersService(
    pool,
    makePermissionsService(),
    { write: () => Promise.resolve() } as never,
    { create: () => Promise.resolve({}) } as never,
  );
}

void test("CustomersService.list does not derive phone digits from non-phone-like keywords", async () => {
  // 关键字含字母（如业务编号 / 客户名）时不应触发电话分支：旧实现会把
  // "R-FLOW-01" 剥离成 "01" 并以 %01% 命中所有电话号码里含 "01" 的客户。
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
  } as unknown as Pool);

  await service.list(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000011",
      role: "viewer",
    },
    {
      keyword: "R-FLOW-01",
      limit: 20,
    },
  );

  const countCall = calls.find((call) =>
    call.sql.includes("count(*)::text as count from customers c"),
  );
  assert.ok(countCall);
  const phoneDigitParam = countCall.params?.find(
    (p) => typeof p === "string" && p === "%01%",
  );
  assert.equal(
    phoneDigitParam,
    undefined,
    "non-phone-like keyword must not generate %01% phone pattern",
  );
});

void test("CustomersService.list still derives phone digits from phone-like keywords", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const client = {
    query: (sql: string, params?: unknown[]) => {
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
  } as unknown as Pool);

  await service.list(
    {
      orgId: "00000000-0000-4000-8000-000000000000",
      userId: "00000000-0000-4000-8000-000000000011",
      role: "viewer",
    },
    {
      keyword: "+81 90-1234-5678",
      limit: 20,
    },
  );

  const countCall = calls.find((call) =>
    call.sql.includes("count(*)::text as count from customers c"),
  );
  assert.ok(countCall);
  const phoneDigitParam = countCall.params?.find(
    (p) => typeof p === "string" && p === "%819012345678%",
  );
  assert.ok(
    phoneDigitParam,
    "phone-like keyword must still generate phone digit pattern",
  );
});
