/**
 * integration-pg — LeadsAdminService.convertCase()
 * 验证：happy-path + 前置 customer 缺失 400 + BMV profile 初始化 + conversation 回填。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
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

const ORG_ID = "32000000-0000-4000-a000-000000000001";
const USER_ID = "32000000-0000-4000-a000-000000000010";
const ROLE_ID = "32000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "32000000-0000-4000-a000-c00000000001";
const CASE_ID = "32000000-0000-4000-a000-ca5e00000001";
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

function stubCases(pool: Pool): CasesService {
  return {
    create: async (
      ctx: RequestContext,
      input: { customerId: string; caseTypeCode: string; ownerUserId: string },
    ) => {
      await pool.query(
        `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, case_no, case_name, business_phase)
         VALUES ($1, $2, $3, $4, 'open', $5, 'CASE-TEST-001', 'Test Case', 'INTAKE')
         ON CONFLICT DO NOTHING`,
        [
          CASE_ID,
          ctx.orgId,
          input.customerId,
          input.caseTypeCode,
          input.ownerUserId,
        ],
      );
      return { id: CASE_ID, caseTypeCode: input.caseTypeCode };
    },
  } as unknown as CasesService;
}

function createService(pool: Pool): LeadsAdminService {
  return new LeadsAdminService(
    pool,
    stubTimeline(),
    stubCustomers(pool),
    stubCases(pool),
  );
}

async function seedBase(pool: Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org-convert-case') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'convert-case@test.com', 'Case Converter', $3)
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
}

async function createConvertedLead(
  svc: LeadsAdminService,
  pool: Pool,
): Promise<string> {
  const lead = await svc.create(CTX, {
    name: "Case Target",
    phone: "090-8888-9999",
    email: "case-target@test.com",
  });

  await svc.transitionStatus(CTX, lead.id, { status: "following" });

  await pool.query(
    `INSERT INTO customers (id, org_id, type) VALUES ($1, $2, 'individual') ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );

  await svc.convertCustomer(CTX, lead.id, {
    customerId: CUSTOMER_ID,
    confirmDedup: true,
  });

  return lead.id;
}

// ── 1. happy-path: convertCase ──

void test("convertCase happy-path: sets status=converted_case and converted_case_id", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const leadId = await createConvertedLead(svc, pool);

  const result = await svc.convertCase(CTX, leadId, {
    caseTypeCode: "general",
    ownerUserId: USER_ID,
  });

  assert.equal(result.caseId, CASE_ID);
  assert.equal(result.lead.status, "converted_case");
  assert.equal(result.lead.convertedCaseId, CASE_ID);

  const detail = await svc.getDetail(CTX, leadId);
  assert.equal(detail.lead.status, "converted_case");
  assert.equal(detail.lead.convertedCaseId, CASE_ID);
});

// ── 2. missing converted_customer_id → 400 ──

void test("convertCase rejects lead without converted_customer_id", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const lead = await svc.create(CTX, {
    name: "No Customer Lead",
    phone: "090-1111",
  });
  await svc.transitionStatus(CTX, lead.id, { status: "following" });

  await assert.rejects(
    () =>
      svc.convertCase(CTX, lead.id, {
        caseTypeCode: "general",
        ownerUserId: USER_ID,
      }),
    (err: Error) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("converted_customer_id"));
      return true;
    },
  );
});

// ── 3. already converted_case → 400 (idempotent guard) ──

void test("convertCase rejects lead already in converted_case status", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const leadId = await createConvertedLead(svc, pool);

  await svc.convertCase(CTX, leadId, {
    caseTypeCode: "general",
    ownerUserId: USER_ID,
  });

  const CASE_ID_2 = "32000000-0000-4000-a000-ca5e00000002";
  const svc2 = new LeadsAdminService(
    pool,
    stubTimeline(),
    stubCustomers(pool),
    {
      create: async (
        ctx: RequestContext,
        input: {
          customerId: string;
          caseTypeCode: string;
          ownerUserId: string;
        },
      ) => {
        await pool.query(
          `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, case_no, case_name, business_phase)
           VALUES ($1, $2, $3, $4, 'open', $5, 'CASE-TEST-002', 'Test Case 2', 'INTAKE')
           ON CONFLICT DO NOTHING`,
          [
            CASE_ID_2,
            ctx.orgId,
            input.customerId,
            input.caseTypeCode,
            input.ownerUserId,
          ],
        );
        return { id: CASE_ID_2 };
      },
    } as unknown as CasesService,
  );

  await assert.rejects(
    () =>
      svc2.convertCase(CTX, leadId, {
        caseTypeCode: "general",
        ownerUserId: USER_ID,
      }),
    (err: Error) => {
      assert.ok(err instanceof BadRequestException);
      assert.ok(err.message.includes("already converted"));
      return true;
    },
  );
});

// ── 4. BMV case type triggers bmvProfile initialization ──

void test("convertCase with BMV type initializes bmvProfile on customer", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const leadId = await createConvertedLead(svc, pool);

  await svc.convertCase(CTX, leadId, {
    caseTypeCode: "business_manager_visa",
    ownerUserId: USER_ID,
  });

  const custResult = await pool.query<{
    base_profile: Record<string, unknown>;
  }>(`SELECT base_profile FROM customers WHERE id = $1`, [CUSTOMER_ID]);
  const profile = custResult.rows[0]?.base_profile;
  assert.ok(profile, "Customer must exist");
  assert.ok(
    profile.bmvProfile,
    "BMV convertCase must initialize bmvProfile on customer",
  );
});

// ── 5b. NEW-V5-4: case timeline records `case.converted_from_lead` ──

void test("convertCase writes case.converted_from_lead timeline on case side", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const leadId = await createConvertedLead(svc, pool);

  await svc.convertCase(CTX, leadId, {
    caseTypeCode: "general",
    ownerUserId: USER_ID,
  });

  const tl = await pool.query<{
    entity_type: string;
    entity_id: string;
    action: string;
    actor_user_id: string | null;
    payload: Record<string, unknown>;
  }>(
    `SELECT entity_type, entity_id, action, actor_user_id, payload
       FROM timeline_logs
      WHERE entity_type = 'case'
        AND entity_id = $1
        AND action = 'case.converted_from_lead'`,
    [CASE_ID],
  );

  assert.equal(
    tl.rows.length,
    1,
    "exactly one case.converted_from_lead timeline row must exist",
  );
  const row = tl.rows[0];
  assert.equal(row.actor_user_id, USER_ID);
  assert.equal(row.payload.leadId, leadId);
  assert.equal(row.payload.customerId, CUSTOMER_ID);
  assert.ok(
    typeof row.payload.leadNo === "string" && row.payload.leadNo.length > 0,
    "payload.leadNo must be present so the case-side log shows LEAD-XXX, not a UUID",
  );
});

// ── 6. conversation backfill ──

void test("convertCase backfills conversation customer_id", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const leadId = await createConvertedLead(svc, pool);

  const appUserId = "32000000-0000-4000-a000-a00000000001";
  await pool.query(
    `INSERT INTO app_users (id, name) VALUES ($1, 'Test Portal User') ON CONFLICT DO NOTHING`,
    [appUserId],
  );
  const CONV_ID = "32000000-0000-4000-a000-c0000000c001";
  await pool.query(
    `INSERT INTO conversations (id, org_id, lead_id, customer_id, status, channel, app_user_id)
     VALUES ($1, $2, $3, null, 'open', 'line', $4)
     ON CONFLICT DO NOTHING`,
    [CONV_ID, ORG_ID, leadId, appUserId],
  );

  await svc.convertCase(CTX, leadId, {
    caseTypeCode: "general",
    ownerUserId: USER_ID,
  });

  const convResult = await pool.query<{ customer_id: string | null }>(
    `SELECT customer_id FROM conversations WHERE id = $1`,
    [CONV_ID],
  );
  assert.equal(
    convResult.rows[0]?.customer_id,
    CUSTOMER_ID,
    "convertCase must backfill conversation customer_id",
  );
});
