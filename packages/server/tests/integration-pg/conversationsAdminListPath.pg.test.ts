/**
 * PG-integration — ConversationsAdminService.list を真 PG で実行し、
 * CONV_LIST_JOIN_COLS の lateral subquery（sender_type）が
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

import { ConversationsAdminService } from "../../src/modules/core/conversations/conversations.admin.service";
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
const APP_USER_ID = "10000000-0000-4000-a000-000000000060";
const CONV_ID = "10000000-0000-4000-a000-000000000070";
const MSG_USER_ID = "10000000-0000-4000-a000-000000000080";
const MSG_STAFF_ID = "10000000-0000-4000-a000-000000000081";

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

function createService(pool: Pool): ConversationsAdminService {
  return new ConversationsAdminService(pool, stubTimelineService() as never);
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

async function seedAppUser(pool: Pool) {
  await pool.query(
    `INSERT INTO app_users (id, name, preferred_language)
     VALUES ($1, '张三', 'zh')
     ON CONFLICT DO NOTHING`,
    [APP_USER_ID],
  );
}

async function seedConversation(pool: Pool) {
  await pool.query(
    `INSERT INTO conversations (id, app_user_id, org_id, channel, preferred_language, status, owner_user_id, last_message_at)
     VALUES ($1, $2, $3, 'web', 'zh', 'open', $4, now())
     ON CONFLICT DO NOTHING`,
    [CONV_ID, APP_USER_ID, ORG_ID, USER_ID],
  );
}

async function insertMessage(
  pool: Pool,
  id: string,
  senderType: "app_user" | "staff",
  text: string,
) {
  const senderId = senderType === "app_user" ? APP_USER_ID : USER_ID;
  await pool.query(
    `INSERT INTO messages (id, conversation_id, org_id, sender_type, sender_id, original_language, original_text)
     VALUES ($1, $2, $3, $4, $5, 'zh', $6)
     ON CONFLICT DO NOTHING`,
    [id, CONV_ID, ORG_ID, senderType, senderId, text],
  );
}

async function seedAll(pool: Pool) {
  await seedOrg(pool);
  await seedUser(pool);
  await seedAppUser(pool);
  await seedConversation(pool);
}

void test("list does not throw SQL error and returns items (sender_type lateral join)", async () => {
  const pool = getTestPool();
  await seedAll(pool);

  const svc = createService(pool);
  const result = await svc.list(CTX, {});

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].id, CONV_ID);
});

void test("lastMessagePreview shows 客户 prefix for app_user sender_type", async () => {
  const pool = getTestPool();
  await seedAll(pool);
  await insertMessage(
    pool,
    MSG_USER_ID,
    "app_user",
    "在留資格について相談したいです",
  );

  const svc = createService(pool);
  const result = await svc.list(CTX, {});

  assert.equal(result.total, 1);
  const preview = result.items[0].lastMessagePreview;
  assert.ok(
    preview.startsWith("客户："),
    `preview should start with 客户 prefix, got: ${preview}`,
  );
  assert.ok(
    preview.includes("在留資格"),
    `preview should contain message text, got: ${preview}`,
  );
});

void test("lastMessagePreview shows 事務所 prefix for staff sender_type", async () => {
  const pool = getTestPool();
  await seedAll(pool);
  await insertMessage(pool, MSG_STAFF_ID, "staff", "承知しました");

  const svc = createService(pool);
  const result = await svc.list(CTX, {});

  assert.equal(result.total, 1);
  const preview = result.items[0].lastMessagePreview;
  assert.ok(
    preview.startsWith("事務所："),
    `preview should start with 事務所 prefix, got: ${preview}`,
  );
  assert.ok(
    preview.includes("承知しました"),
    `preview should contain message text, got: ${preview}`,
  );
});
