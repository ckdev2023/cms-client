/**
 * integration-pg — LeadsAdminService.convertCustomer()
 * 验证：happy-path + dedup 409 + 状态前置 400 + SQL schema 兼容。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";
import type { Pool } from "pg";

import {
  getTestPool,
  closeTestPool,
  migrateAndSeed,
  truncateAllBusinessTables,
} from "./setup";

import { LeadsAdminService } from "../../src/modules/core/leads/leads.admin.service";
import type { TimelineService } from "../../src/modules/core/timeline/timeline.service";
import type { CustomersService } from "../../src/modules/core/customers/customers.service";
import type { CasesService } from "../../src/modules/core/cases/cases.service";
import type { RequestContext } from "../../src/modules/core/tenancy/requestContext";

before(async () => {
  await migrateAndSeed();
});

beforeEach(async () => {
  await truncateAllBusinessTables();
});

after(async () => {
  await closeTestPool();
});

const ORG_ID = "31000000-0000-4000-a000-000000000001";
const USER_ID = "31000000-0000-4000-a000-000000000010";
const ROLE_ID = "31000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "31000000-0000-4000-a000-c00000000001";

const CTX: RequestContext = { orgId: ORG_ID, userId: USER_ID, role: "owner" };

function stubTimeline(): TimelineService {
  return {
    write: () => Promise.resolve(),
    list: () => Promise.resolve([]),
  } as unknown as TimelineService;
}

function stubCustomers(pool: Pool): CustomersService {
  return {
    create: async (ctx: RequestContext) => {
      await pool.query(
        `INSERT INTO customers (id, org_id, type) VALUES ($1, $2, 'individual') ON CONFLICT DO NOTHING`,
        [CUSTOMER_ID, ctx.orgId],
      );
      return { id: CUSTOMER_ID, type: "individual" };
    },
  } as unknown as CustomersService;
}

function stubCases(): CasesService {
  return {
    create: () => Promise.resolve({ id: "case-stub" }),
  } as unknown as CasesService;
}

function createService(pool: Pool): LeadsAdminService {
  return new LeadsAdminService(
    pool,
    stubTimeline(),
    stubCustomers(pool),
    stubCases(),
  );
}

async function seedBase(pool: Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org-convert-cust') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id) VALUES ($1, $2, 'convert-cust@test.com', 'Converter', $3) ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
}

async function createLead(
  svc: LeadsAdminService,
  overrides?: { status?: string },
): Promise<string> {
  const lead = await svc.create(CTX, {
    name: "Convert Target",
    phone: "090-5555-6666",
    email: "convert-target@test.com",
  });
  if (overrides?.status && overrides.status !== "new") {
    await svc.transitionStatus(CTX, lead.id, { status: "following" });
    if (overrides.status !== "following") {
      await svc.transitionStatus(CTX, lead.id, { status: overrides.status });
    }
  }
  return lead.id;
}

// ── 1. happy-path: convertCustomer with existing customerId ──

void test("convertCustomer happy-path: sets converted_customer_id with provided customerId", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  await pool.query(
    `INSERT INTO customers (id, org_id, type) VALUES ($1, $2, 'individual') ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );

  const svc = createService(pool);
  const leadId = await createLead(svc, { status: "following" });

  const result = await svc.convertCustomer(CTX, leadId, {
    customerId: CUSTOMER_ID,
    confirmDedup: true,
  });

  assert.equal(result.customerId, CUSTOMER_ID);
  assert.equal(result.lead.convertedCustomerId, CUSTOMER_ID);

  const detail = await svc.getDetail(CTX, leadId);
  assert.equal(detail.lead.convertedCustomerId, CUSTOMER_ID);
});

// ── 2. happy-path: convertCustomer creates new customer ──

void test("convertCustomer happy-path: creates new customer when customerId not provided", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const leadId = await createLead(svc, { status: "following" });

  const result = await svc.convertCustomer(CTX, leadId, {
    confirmDedup: true,
  });

  assert.ok(result.customerId, "Must return a customerId");
  assert.equal(result.lead.convertedCustomerId, result.customerId);
});

// ── 3. status precondition: lost → 400 ──

void test("convertCustomer rejects lost lead with 400", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const lead = await svc.create(CTX, {
    name: "Lost Lead",
    phone: "090-7777",
  });
  await svc.transitionStatus(CTX, lead.id, { status: "following" });
  await svc.transitionStatus(CTX, lead.id, {
    status: "lost",
    lostReason: "Not interested",
  });

  await assert.rejects(
    () => svc.convertCustomer(CTX, lead.id, { confirmDedup: true }),
    (err: Error) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("not convertible"));
      return true;
    },
  );
});

// ── 4. already converted → 400 ──

void test("convertCustomer rejects lead that already has converted_customer_id", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  await pool.query(
    `INSERT INTO customers (id, org_id, type) VALUES ($1, $2, 'individual') ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );

  const svc = createService(pool);
  const leadId = await createLead(svc, { status: "following" });

  await svc.convertCustomer(CTX, leadId, {
    customerId: CUSTOMER_ID,
    confirmDedup: true,
  });

  await assert.rejects(
    () =>
      svc.convertCustomer(CTX, leadId, {
        customerId: CUSTOMER_ID,
        confirmDedup: true,
      }),
    (err: Error) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("already has a converted customer"));
      return true;
    },
  );
});

// ── 5. dedup hit without confirmDedup → 409 ──

void test("convertCustomer dedup hit without confirmDedup returns 409", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  await pool.query(
    `INSERT INTO customers (id, org_id, type, base_profile) VALUES ($1, $2, 'individual', $3) ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID, JSON.stringify({ phone: "090-5555-6666" })],
  );

  const svc = createService(pool);
  const leadId = await createLead(svc, { status: "following" });

  await assert.rejects(
    () => svc.convertCustomer(CTX, leadId, {}),
    (err: Error) => {
      assert.ok(
        err instanceof ConflictException,
        `Expected ConflictException, got ${err.constructor.name}: ${err.message}`,
      );
      return true;
    },
  );
});
