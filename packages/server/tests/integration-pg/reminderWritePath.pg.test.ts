/**
 * R30-H PG-integration — migration 043 適用後、entity_type / entity_id なしで
 * reminder INSERT が成功し、trigger が target_* → entity_* を自動同期することを検証。
 *
 * 背景: 旧スキーマでは entity_type / entity_id が NOT NULL のため、
 * 新コードが target_* のみを書き込むと PG 23502 が発生していた。
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
const DUMMY_TARGET_ID = "00000000-0000-0000-0000-000000000040";

async function seedPrerequisites(pool: Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org')
     ON CONFLICT DO NOTHING`,
    [DUMMY_ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role)
     VALUES ($1, $2, 'test@test.com', 'Test User', 'admin')
     ON CONFLICT DO NOTHING`,
    [DUMMY_USER_ID, DUMMY_ORG_ID],
  );
}

void test("INSERT reminder with only target_type/target_id succeeds (no 23502)", async () => {
  const pool = getTestPool();
  await seedPrerequisites(pool);

  const result = await pool.query<{
    id: string;
    target_type: string;
    target_id: string;
    entity_type: string | null;
    entity_id: string | null;
  }>(
    `INSERT INTO reminders (
       org_id, target_type, target_id, remind_at,
       recipient_type, channel, send_status
     )
     VALUES ($1, $2, $3, now() + interval '1 day', 'user', 'in_app', 'pending')
     RETURNING id, target_type, target_id, entity_type, entity_id`,
    [DUMMY_ORG_ID, "case", DUMMY_TARGET_ID],
  );

  assert.equal(result.rows.length, 1);
  const row = result.rows[0];
  assert.ok(row);
  assert.equal(row.target_type, "case");
  assert.equal(row.target_id, DUMMY_TARGET_ID);
});

void test("trigger syncs target_* → entity_* on INSERT", async () => {
  const pool = getTestPool();
  await seedPrerequisites(pool);

  const result = await pool.query<{
    target_type: string;
    target_id: string;
    entity_type: string | null;
    entity_id: string | null;
  }>(
    `INSERT INTO reminders (
       org_id, target_type, target_id, remind_at,
       recipient_type, channel, send_status
     )
     VALUES ($1, $2, $3, now() + interval '1 day', 'user', 'in_app', 'pending')
     RETURNING target_type, target_id, entity_type, entity_id`,
    [DUMMY_ORG_ID, "case", DUMMY_TARGET_ID],
  );

  const row = result.rows[0];
  assert.ok(row);
  assert.equal(
    row.entity_type,
    row.target_type,
    "trigger should sync entity_type from target_type",
  );
  assert.equal(
    row.entity_id,
    row.target_id,
    "trigger should sync entity_id from target_id",
  );
});

void test("entity_type / entity_id are NULLABLE after migration 043", async () => {
  const pool = getTestPool();

  const result = await pool.query<{
    column_name: string;
    is_nullable: string;
  }>(
    `SELECT column_name, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'reminders'
       AND column_name IN ('entity_type', 'entity_id')
     ORDER BY column_name`,
  );

  assert.equal(result.rows.length, 2);
  for (const row of result.rows) {
    assert.equal(
      row.is_nullable,
      "YES",
      `${row.column_name} should be NULLABLE after migration 043`,
    );
  }
});

void test("status column has DEFAULT 'pending' after migration 045", async () => {
  const pool = getTestPool();

  const result = await pool.query<{
    column_default: string | null;
  }>(
    `SELECT column_default
     FROM information_schema.columns
     WHERE table_name = 'reminders'
       AND column_name = 'status'`,
  );

  assert.equal(result.rows.length, 1);
  assert.ok(
    result.rows[0].column_default?.includes("pending"),
    `status column should default to 'pending' after migration 045`,
  );
});

void test("target_type / target_id are NOT NULL after migration 043", async () => {
  const pool = getTestPool();

  const result = await pool.query<{
    column_name: string;
    is_nullable: string;
  }>(
    `SELECT column_name, is_nullable
     FROM information_schema.columns
     WHERE table_name = 'reminders'
       AND column_name IN ('target_type', 'target_id')
     ORDER BY column_name`,
  );

  assert.equal(result.rows.length, 2);
  for (const row of result.rows) {
    assert.equal(
      row.is_nullable,
      "NO",
      `${row.column_name} should be NOT NULL after migration 043`,
    );
  }
});
