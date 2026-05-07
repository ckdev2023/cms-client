/**
 * integration-pg — backfillCustomerOwnerFromLead
 * BACKFILL_QUERY が実 PG で crash しないこと + applyBackfill が
 * ownerUserId / groupId / visaType を正しく書き込むことを検証。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  getTestPool,
  closeTestPool,
  migrateAndSeed,
  truncateAllBusinessTables,
} from "../setup";

import {
  buildPatch,
  applyBackfill,
  BACKFILL_QUERY,
  type BackfillRow,
} from "../../../src/scripts/backfillCustomerOwnerFromLead";

before(async () => {
  await migrateAndSeed();
});

beforeEach(async () => {
  await truncateAllBusinessTables();
});

after(async () => {
  await closeTestPool();
});

const ORG_ID = "bf000000-0000-4000-a000-000000000001";
const USER_ID = "bf000000-0000-4000-a000-000000000010";
const ROLE_ID = "bf000000-0000-4000-a000-00000000a001";
const GROUP_ID = "bf000000-0000-4000-a000-000000000071";
const CUSTOMER_A = "bf000000-0000-4000-a000-c00000000001";
const CUSTOMER_B = "bf000000-0000-4000-a000-c00000000002";
const CUSTOMER_C = "bf000000-0000-4000-a000-c00000000003";
const LEAD_A = "bf000000-0000-4000-a000-1ead00000001";
const LEAD_B = "bf000000-0000-4000-a000-1ead00000002";
const LEAD_C = "bf000000-0000-4000-a000-1ead00000003";

async function seedBase() {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org-backfill') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'backfill@test.com', 'Backfiller', $3) ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
  await pool.query(
    `INSERT INTO groups (id, org_id, name)
     VALUES ($1, $2, 'Test Group') ON CONFLICT DO NOTHING`,
    [GROUP_ID, ORG_ID],
  );
}

async function insertCustomer(
  id: string,
  baseProfile: Record<string, unknown> = {},
) {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO customers (id, org_id, type, base_profile)
     VALUES ($1, $2, 'individual', $3::jsonb) ON CONFLICT DO NOTHING`,
    [id, ORG_ID, JSON.stringify(baseProfile)],
  );
}

async function insertLead(
  id: string,
  overrides: {
    ownerUserId?: string | null;
    groupId?: string | null;
    intendedCaseType?: string | null;
    convertedCustomerId?: string | null;
  } = {},
) {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO leads (
       id, org_id, status, owner_user_id, group_id,
       intended_case_type, converted_customer_id
     ) VALUES ($1, $2, 'signed', $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [
      id,
      ORG_ID,
      overrides.ownerUserId ?? null,
      overrides.groupId ?? null,
      overrides.intendedCaseType ?? null,
      overrides.convertedCustomerId ?? null,
    ],
  );
}

async function readBaseProfile(
  customerId: string,
): Promise<Record<string, unknown>> {
  const pool = getTestPool();
  const { rows } = await pool.query<{ base_profile: Record<string, unknown> }>(
    `SELECT base_profile FROM customers WHERE id = $1`,
    [customerId],
  );
  return rows[0]?.base_profile ?? {};
}

// ── 1. BACKFILL_QUERY runs without SQL error on real PG ──

void test("BACKFILL_QUERY executes without error against real PG", async () => {
  const pool = getTestPool();
  await seedBase();

  await insertCustomer(CUSTOMER_A);
  await insertLead(LEAD_A, {
    ownerUserId: USER_ID,
    groupId: GROUP_ID,
    intendedCaseType: "dependent_visa",
    convertedCustomerId: CUSTOMER_A,
  });

  const { rows } = await pool.query<BackfillRow>(BACKFILL_QUERY);

  assert.ok(rows.length >= 1, "Should return at least one row");
  const row = rows.find((r) => r.customer_id === CUSTOMER_A);
  assert.ok(row, "Should include CUSTOMER_A");
  assert.equal(row.owner_user_id, USER_ID);
  assert.equal(row.group_id, GROUP_ID);
  assert.equal(row.intended_case_type, "dependent_visa");
});

// ── 2. applyBackfill patches ownerUserId / groupId / visaType into empty base_profile ──

void test("applyBackfill fills ownerUserId, groupId, visaType for empty base_profile", async () => {
  const pool = getTestPool();
  await seedBase();

  await insertCustomer(CUSTOMER_A);
  await insertLead(LEAD_A, {
    ownerUserId: USER_ID,
    groupId: GROUP_ID,
    intendedCaseType: "dependent_visa",
    convertedCustomerId: CUSTOMER_A,
  });

  const { rows } = await pool.query<BackfillRow>(BACKFILL_QUERY);
  await applyBackfill(pool, rows, false);

  const bp = await readBaseProfile(CUSTOMER_A);
  assert.equal(bp.ownerUserId, USER_ID, "ownerUserId backfilled");
  assert.equal(bp.groupId, GROUP_ID, "groupId backfilled");
  assert.equal(bp.visaType, "dependent", "visaType mapped from dependent_visa");
});

// ── 3. applyBackfill skips fields already present in base_profile ──

void test("applyBackfill does not overwrite existing base_profile fields", async () => {
  const pool = getTestPool();
  await seedBase();

  const existingOwner = "existing-owner-id";
  await insertCustomer(CUSTOMER_B, { ownerUserId: existingOwner });
  await insertLead(LEAD_B, {
    ownerUserId: USER_ID,
    groupId: GROUP_ID,
    intendedCaseType: "work",
    convertedCustomerId: CUSTOMER_B,
  });

  const { rows } = await pool.query<BackfillRow>(BACKFILL_QUERY);
  await applyBackfill(pool, rows, false);

  const bp = await readBaseProfile(CUSTOMER_B);
  assert.equal(bp.ownerUserId, existingOwner, "existing ownerUserId preserved");
  assert.equal(bp.groupId, GROUP_ID, "groupId backfilled");
  assert.equal(bp.visaType, "engineer_specialist", "visaType mapped from work");
});

// ── 4. applyBackfill skips customers with no matching lead data ──

void test("applyBackfill returns skipped count for fully populated customers", async () => {
  const pool = getTestPool();
  await seedBase();

  await insertCustomer(CUSTOMER_C, {
    ownerUserId: USER_ID,
    groupId: GROUP_ID,
    visaType: "business_manager",
  });
  await insertLead(LEAD_C, {
    ownerUserId: USER_ID,
    groupId: GROUP_ID,
    intendedCaseType: "business_manager_visa",
    convertedCustomerId: CUSTOMER_C,
  });

  const { rows } = await pool.query<BackfillRow>(BACKFILL_QUERY);
  const { updated, skipped } = await applyBackfill(pool, rows, false);

  assert.equal(updated, 0, "no rows updated");
  assert.equal(skipped, 1, "one row skipped (already complete)");
});

// ── 5. dry-run mode does not mutate DB ──

void test("applyBackfill dry-run does not write to DB", async () => {
  const pool = getTestPool();
  await seedBase();

  await insertCustomer(CUSTOMER_A);
  await insertLead(LEAD_A, {
    ownerUserId: USER_ID,
    groupId: GROUP_ID,
    intendedCaseType: "dependent_visa",
    convertedCustomerId: CUSTOMER_A,
  });

  const { rows } = await pool.query<BackfillRow>(BACKFILL_QUERY);
  const { updated } = await applyBackfill(pool, rows, true);

  assert.equal(updated, 1, "dry-run reports 1 would-be update");

  const bp = await readBaseProfile(CUSTOMER_A);
  assert.equal(bp.ownerUserId, undefined, "DB not mutated in dry-run");
});

// ── 6. buildPatch uses owner_user_id (no assigned_user_id) ──

void test("buildPatch uses owner_user_id directly", () => {
  const patch = buildPatch({
    customer_id: "c-1",
    base_profile: {},
    owner_user_id: "u-owner",
    group_id: null,
    intended_case_type: null,
  });
  assert.deepEqual(patch, { ownerUserId: "u-owner" });
});
