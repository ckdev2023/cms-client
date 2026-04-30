import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { PermissionsService } from "../auth/permissions.service";
import type { RequestContext } from "../tenancy/requestContext";

import { CustomersService } from "./customers.service";

/**
 * BUG-145 regression：`POST /api/customers` 直接调用必须走 numbering，
 * 严禁 fallback 到 UUID 作 customerNumber。
 *
 * 用例锁定：
 * - 顺序创建 3 个客户 → 每条 baseProfile.customerNumber 形如 `CUS-YYYYMM-NNNN`
 * - 序号严格单调递增（max_seq + 1, +2, +3）
 * - 同一组织内序号互不重复
 */

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount?: number }>;
  release: () => void;
};

function makePermissionsService(): PermissionsService {
  return {
    canAccessCustomer: () => true,
    canEditCustomer: () => true,
  } as unknown as PermissionsService;
}

function makePool(client: PoolClientLike): Pool {
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function makeService(pool: Pool): CustomersService {
  return new CustomersService(
    pool,
    makePermissionsService(),
    { write: () => Promise.resolve() } as never,
    { create: () => Promise.resolve({}) } as never,
  );
}

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CTX: RequestContext = { orgId: ORG_ID, userId: USER_ID, role: "staff" };

void test("POST /api/customers 顺序创建 3 次 → customerNumber 形如 CUS-YYYYMM-NNNN 并单调递增", async () => {
  const persistedNumbers: string[] = [];
  let counter = 0;

  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      if (sql.includes("coalesce(max(substring")) {
        return Promise.resolve({
          rows: [{ max_seq: String(persistedNumbers.length) }],
        });
      }
      if (sql.includes("insert into customers")) {
        const [, , profileJson] = params as [string, string, string, string];
        const persistedProfile = JSON.parse(profileJson) as Record<
          string,
          unknown
        >;
        const customerNumber = String(persistedProfile.customerNumber);
        persistedNumbers.push(customerNumber);
        counter += 1;
        return Promise.resolve({
          rows: [
            {
              id: `c-${String(counter)}`,
              org_id: ORG_ID,
              type: "individual",
              base_profile: persistedProfile,
              contacts: [],
              created_at: "2026-04-30T00:00:00.000Z",
              updated_at: "2026-04-30T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const service = makeService(makePool(client));

  for (const name of ["Alice", "Bob", "Carol"]) {
    const created = await service.create(CTX, {
      type: "individual",
      baseProfile: { name_cn: name },
    });
    assert.match(
      String(created.baseProfile.customerNumber),
      /^CUS-\d{6}-\d{4}$/,
      `customer ${name} 必须生成 CUS-YYYYMM-NNNN 编号，实际：${String(created.baseProfile.customerNumber)}`,
    );
  }

  assert.equal(persistedNumbers.length, 3);
  for (const number of persistedNumbers) {
    assert.match(number, /^CUS-\d{6}-\d{4}$/);
  }

  assert.equal(
    new Set(persistedNumbers).size,
    3,
    "customerNumber 必须互不重复",
  );

  const sequences = persistedNumbers.map((number) => {
    const match = /^CUS-\d{6}-(\d{4})$/.exec(number);
    if (!match) throw new Error(`malformed customerNumber: ${number}`);
    return parseInt(match[1], 10);
  });
  for (let i = 1; i < sequences.length; i += 1) {
    assert.equal(
      sequences[i],
      sequences[i - 1] + 1,
      `序号必须单调递增 (+1)，实际：${sequences.join(",")}`,
    );
  }
});

void test("POST /api/customers 不得 fallback 到 UUID 作 customerNumber", async () => {
  const client: PoolClientLike = {
    query: (sql: string, params?: unknown[]) => {
      if (sql.includes("coalesce(max(substring")) {
        return Promise.resolve({ rows: [{ max_seq: "0" }] });
      }
      if (sql.includes("insert into customers")) {
        const [, , profileJson] = params as [string, string, string, string];
        const persistedProfile = JSON.parse(profileJson) as Record<
          string,
          unknown
        >;
        return Promise.resolve({
          rows: [
            {
              id: "2d233e59-3af5-4af5-ae2d-7f0ae2eefd3c",
              org_id: ORG_ID,
              type: "individual",
              base_profile: persistedProfile,
              contacts: [],
              created_at: "2026-04-30T00:00:00.000Z",
              updated_at: "2026-04-30T00:00:00.000Z",
            },
          ],
        });
      }
      return Promise.resolve({ rows: [] });
    },
    release: () => undefined,
  };

  const service = makeService(makePool(client));

  const customer = await service.create(CTX, {
    type: "individual",
    baseProfile: { name_cn: "Probe" },
  });

  const customerNumber = String(customer.baseProfile.customerNumber);
  assert.notEqual(customerNumber, customer.id);
  assert.doesNotMatch(
    customerNumber,
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    `customerNumber 不得为 UUID，实际：${customerNumber}`,
  );
  assert.match(customerNumber, /^CUS-\d{6}-0001$/);
});
