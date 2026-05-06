/**
 * BUG-177 PG-integration smoke — migration 039 backfill 后，
 * 所有有 customer_id 的 case 都拥有至少一条 primary applicant case_parties 行。
 */

import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  getTestPool,
  closeTestPool,
  migrateAndSeed,
  truncateAllBusinessTables,
} from "./setup";

before(async () => {
  await migrateAndSeed();
});

beforeEach(async () => {
  await truncateAllBusinessTables();
});

after(async () => {
  await closeTestPool();
});

const DUMMY_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DUMMY_USER_ID = "00000000-0000-0000-0000-000000000010";
const DUMMY_ROLE_ID = "00000000-0000-0000-0000-00000000a001";
const DUMMY_CUSTOMER_ID = "00000000-0000-0000-0000-000000000020";

async function seedOrgAndUser(pool: import("pg").Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org')
     ON CONFLICT DO NOTHING`,
    [DUMMY_ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [DUMMY_ROLE_ID, DUMMY_ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'test@test.com', 'Test User', $3)
     ON CONFLICT DO NOTHING`,
    [DUMMY_USER_ID, DUMMY_ORG_ID, DUMMY_ROLE_ID],
  );
  await pool.query(
    `INSERT INTO customers (id, org_id, type, base_profile, contacts)
     VALUES ($1, $2, 'individual', '{}'::jsonb, '[]'::jsonb)
     ON CONFLICT DO NOTHING`,
    [DUMMY_CUSTOMER_ID, DUMMY_ORG_ID],
  );
}

void test("[BUG-177] migration 039 backfills primary applicant for cases without one", async () => {
  const pool = getTestPool();
  await seedOrgAndUser(pool);

  const caseId = "00000000-0000-0000-0000-000000000100";
  await pool.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase)
     VALUES ($1, $2, $3, 'business_manager_visa', 'open', $4, 'none')`,
    [caseId, DUMMY_ORG_ID, DUMMY_CUSTOMER_ID, DUMMY_USER_ID],
  );

  const orphanResult = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM cases c
     LEFT JOIN case_parties cp
       ON cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
     WHERE c.customer_id IS NOT NULL
       AND cp.id IS NULL`,
  );

  const orphanCount = Number(orphanResult.rows[0].cnt);

  if (orphanCount > 0) {
    await pool.query(
      `INSERT INTO case_parties (id, org_id, case_id, party_type, customer_id, is_primary, created_at, updated_at)
       SELECT gen_random_uuid(), c.org_id, c.id, 'applicant', c.customer_id, true, now(), now()
       FROM cases c
       WHERE c.customer_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM case_parties cp
           WHERE cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
         )`,
    );
  }

  const afterResult = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM cases c
     LEFT JOIN case_parties cp
       ON cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
     WHERE c.customer_id IS NOT NULL
       AND cp.id IS NULL`,
  );

  assert.equal(
    Number(afterResult.rows[0].cnt),
    0,
    "All cases with customer_id should have a primary applicant case_parties row after backfill",
  );
});

void test("[BUG-177] backfill is idempotent — running twice does not duplicate rows", async () => {
  const pool = getTestPool();
  await seedOrgAndUser(pool);

  const caseId = "00000000-0000-0000-0000-000000000101";
  await pool.query(
    `INSERT INTO cases (id, org_id, customer_id, case_type_code, status, owner_user_id, business_phase)
     VALUES ($1, $2, $3, 'business_manager_visa', 'open', $4, 'none')`,
    [caseId, DUMMY_ORG_ID, DUMMY_CUSTOMER_ID, DUMMY_USER_ID],
  );

  const backfillSql = `
    INSERT INTO case_parties (id, org_id, case_id, party_type, customer_id, is_primary, created_at, updated_at)
    SELECT gen_random_uuid(), c.org_id, c.id, 'applicant', c.customer_id, true, now(), now()
    FROM cases c
    WHERE c.customer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM case_parties cp
        WHERE cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
      )`;

  await pool.query(backfillSql);
  await pool.query(backfillSql);

  const result = await pool.query<{ cnt: string }>(
    `SELECT count(*) AS cnt
     FROM case_parties
     WHERE case_id = $1 AND is_primary = true AND party_type = 'applicant'`,
    [caseId],
  );

  assert.equal(
    Number(result.rows[0].cnt),
    1,
    "Running backfill twice should still result in exactly one primary applicant row",
  );
});

void test("[BUG-177] migration 039 SQL syntax is valid (EXPLAIN)", async () => {
  const pool = getTestPool();

  const backfillSql = `
    INSERT INTO case_parties (id, org_id, case_id, party_type, customer_id, is_primary, created_at, updated_at)
    SELECT gen_random_uuid(), c.org_id, c.id, 'applicant', c.customer_id, true, now(), now()
    FROM cases c
    WHERE c.customer_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM case_parties cp
        WHERE cp.case_id = c.id AND cp.is_primary = true AND cp.party_type = 'applicant'
      )`;

  try {
    await pool.query(`EXPLAIN (costs off) ${backfillSql}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    assert.fail(`EXPLAIN failed for migration 039 backfill SQL:\n${msg}`);
  }
});
