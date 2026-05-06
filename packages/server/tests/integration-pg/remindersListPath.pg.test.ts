/**
 * R33-D PG-integration — RemindersService.list を真 PG で実行し、
 * REMINDER_LIST_SELECT の JOIN（c.case_name as case_title 等）が
 * schema と整合していることを検証するスキーマ漂移哨兵テスト。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  getTestPool,
  closeTestPool,
  migrateAndSeed,
  truncateAllBusinessTables,
} from "./setup";

import { RemindersService } from "../../src/modules/core/reminders/reminders.service";
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

const ORG_ID = "10000000-0000-4000-a000-000000000001";
const USER_ID = "10000000-0000-4000-a000-000000000010";
const ROLE_ID = "10000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "10000000-0000-4000-a000-000000000020";
const CASE_ID = "10000000-0000-4000-a000-000000000030";
const TARGET_ID = "10000000-0000-4000-a000-000000000040";
const CASE_NAME = "経営管理ビザ";
const CASE_NO = "CASE-202605-0001";

const CTX: RequestContext = {
  orgId: ORG_ID,
  userId: USER_ID,
  role: "owner",
};

function stubTimelineService() {
  return {
    write: async () => {
      /* noop stub */
    },
  };
}

function createService(pool: Pool): RemindersService {
  const stub = stubTimelineService();
  return new RemindersService(pool, stub as never);
}

async function seedOrg(pool: Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name)
     VALUES ($1, 'test-org')
     ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
}

async function seedUser(pool: Pool) {
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'test@test.com', 'Test User', $3)
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
}

async function seedCustomer(pool: Pool) {
  await pool.query(
    `INSERT INTO customers (id, org_id, type)
     VALUES ($1, $2, 'individual')
     ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );
}

async function seedCase(pool: Pool) {
  await pool.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, case_no, case_name, business_phase)
     VALUES ($1, $2, $3, 'bmv', 'open', $4, $5, $6, 'INTAKE')
     ON CONFLICT DO NOTHING`,
    [CASE_ID, ORG_ID, CUSTOMER_ID, USER_ID, CASE_NO, CASE_NAME],
  );
}

async function seedAll(pool: Pool) {
  await seedOrg(pool);
  await seedUser(pool);
  await seedCustomer(pool);
  await seedCase(pool);
}

async function insertReminder(
  pool: Pool,
  overrides: {
    id?: string;
    case_id?: string | null;
    recipient_id?: string | null;
  } = {},
) {
  const id = overrides.id ?? "10000000-0000-4000-a000-000000000099";
  const caseId = overrides.case_id === undefined ? null : overrides.case_id;
  const recipientId =
    overrides.recipient_id === undefined ? null : overrides.recipient_id;
  await pool.query(
    `INSERT INTO reminders (id, org_id, case_id, target_type, target_id, remind_at,
       recipient_type, recipient_id, channel, send_status, status)
     VALUES ($1, $2, $3, 'case', $4, now() + interval '1 day',
       'user', $5, 'in_app', 'pending', 'pending')
     ON CONFLICT DO NOTHING`,
    [id, ORG_ID, caseId, TARGET_ID, recipientId],
  );
}

// ── 1. 空集 → { items: [], total: 0 } ──

void test("list returns empty result when no reminders exist (no SQL error)", async () => {
  const pool = getTestPool();
  await seedOrg(pool);
  await seedUser(pool);

  const svc = createService(pool);
  const result = await svc.list(CTX);

  assert.deepStrictEqual(result, { items: [], total: 0 });
});

// ── 2. 含 case_id 的 reminder → caseTitle === case_name 字面量 ──

void test("list resolves caseNo and caseTitle from cases.case_name via LEFT JOIN", async () => {
  const pool = getTestPool();
  await seedAll(pool);
  await insertReminder(pool, {
    case_id: CASE_ID,
    recipient_id: USER_ID,
  });

  const svc = createService(pool);
  const result = await svc.list(CTX);

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);

  const item = result.items[0];
  assert.equal(item.caseNo, CASE_NO, "caseNo should come from cases.case_no");
  assert.equal(
    item.caseTitle,
    CASE_NAME,
    "caseTitle should come from cases.case_name",
  );
  assert.equal(
    item.recipientName,
    "Test User",
    "recipientName should come from users.name",
  );
});

// ── 3. case_id = null → LEFT JOIN 不丢行，caseTitle = null ──

void test("list includes reminder with case_id=null (LEFT JOIN does not drop the row)", async () => {
  const pool = getTestPool();
  await seedAll(pool);

  const WITH_CASE_ID = "10000000-0000-4000-a000-0000000000a1";
  const WITHOUT_CASE_ID = "10000000-0000-4000-a000-0000000000a2";

  await insertReminder(pool, { id: WITH_CASE_ID, case_id: CASE_ID });
  await insertReminder(pool, { id: WITHOUT_CASE_ID, case_id: null });

  const svc = createService(pool);
  const result = await svc.list(CTX);

  assert.equal(result.total, 2, "both reminders should be counted");
  assert.equal(result.items.length, 2, "both reminders should be returned");

  const noCaseItem = result.items.find((i) => i.id === WITHOUT_CASE_ID);
  assert.ok(
    noCaseItem,
    "reminder with case_id=null should not be filtered out",
  );
  assert.equal(noCaseItem.caseNo, null);
  assert.equal(noCaseItem.caseTitle, null);

  const withCaseItem = result.items.find((i) => i.id === WITH_CASE_ID);
  assert.ok(withCaseItem);
  assert.equal(withCaseItem.caseNo, CASE_NO);
  assert.equal(withCaseItem.caseTitle, CASE_NAME);
});
