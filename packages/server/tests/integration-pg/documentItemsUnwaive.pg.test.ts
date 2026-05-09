/**
 * integration-pg — DocumentItemsService.unwaive 全链路。
 *
 * 哨兵目的：
 * - waived 状态的 document_item 经 unwaive 后 status=pending，4 个 latest 字段清空。
 * - 非 waived 状态的 document_item 调用 unwaive 抛 BadRequestException。
 * - timeline 写入 document_item.unwaived action。
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

import { DocumentItemsService } from "../../src/modules/core/document-items/documentItems.service";
import type { TimelineService } from "../../src/modules/core/timeline/timeline.service";
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

const ORG_ID = "42000000-0000-4000-a000-000000000001";
const USER_ID = "42000000-0000-4000-a000-000000000010";
const ROLE_ID = "42000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "42000000-0000-4000-a000-c00000000001";
const CASE_ID = "42000000-0000-4000-a000-c10000000001";
const ITEM_ID = "42000000-0000-4000-a000-d00000000001";

const CTX: RequestContext = {
  orgId: ORG_ID,
  userId: USER_ID,
  role: "owner",
};

function stubTimeline(): {
  service: TimelineService;
  writes: { action: string }[];
} {
  const writes: { action: string }[] = [];
  const service = {
    write: (_ctx: unknown, input: { action: string }) => {
      writes.push(input);
      return Promise.resolve();
    },
    list: () => Promise.resolve([]),
  } as unknown as TimelineService;
  return { service, writes };
}

async function seedBase(pool: Pool) {
  await pool.query(
    `INSERT INTO organizations (id, name) VALUES ($1, 'test-org-unwaive')
     ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'unwaive@test.com', 'Unwaive User', $3)
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
  await pool.query(
    `INSERT INTO customers (id, org_id, type) VALUES ($1, $2, 'individual')
     ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO cases
       (id, org_id, customer_id, case_type_code, status, owner_user_id,
        case_no, case_name, business_phase, stage)
     VALUES ($1, $2, $3, 'family_stay', 'open', $4,
             'CASE-UNWAIVE-001', 'unwaive test case', 'INTAKE', 'S1')
     ON CONFLICT DO NOTHING`,
    [CASE_ID, ORG_ID, CUSTOMER_ID, USER_ID],
  );
}

async function seedWaivedItem(pool: Pool) {
  await pool.query(
    `INSERT INTO document_items
       (id, org_id, case_id, checklist_item_code, name, status, owner_side,
        category, provided_by_role, required_flag,
        waive_reason_code_latest, waive_reason_latest,
        waived_by_user_id_latest, waived_at_latest)
     VALUES ($1, $2, $3, 'fs-supporter-employment', 'テスト書類',
             'waived', 'applicant', '主申请人', 'applicant', true,
             'not_applicable', '不要', $4, NOW())`,
    [ITEM_ID, ORG_ID, CASE_ID, USER_ID],
  );
}

function createService(pool: Pool) {
  const timeline = stubTimeline();
  const svc = new DocumentItemsService(pool, timeline.service);
  return { svc, timeline };
}

void test("unwaive: waived item transitions to pending with latest fields cleared", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  await seedWaivedItem(pool);
  const { svc, timeline } = createService(pool);

  const result = await svc.unwaive(CTX, ITEM_ID, { note: "再提出お願い" });

  assert.equal(result.status, "pending");
  assert.equal(result.waiveReasonCodeLatest, null);
  assert.equal(result.waiveReasonLatest, null);
  assert.equal(result.waivedByUserIdLatest, null);
  assert.equal(result.waivedAtLatest, null);

  const row = await pool.query<{ status: string }>(
    "SELECT status FROM document_items WHERE id = $1",
    [ITEM_ID],
  );
  assert.equal(row.rows[0].status, "pending");

  assert.equal(timeline.writes.length, 1);
  assert.equal(timeline.writes[0].action, "document_item.unwaived");
});

void test("unwaive: non-waived item throws BadRequestException", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  await pool.query(
    `INSERT INTO document_items
       (id, org_id, case_id, checklist_item_code, name, status, owner_side,
        category, provided_by_role, required_flag)
     VALUES ($1, $2, $3, 'fs-supporter-employment', 'テスト書類',
             'pending', 'applicant', '主申请人', 'applicant', true)`,
    [ITEM_ID, ORG_ID, CASE_ID],
  );
  const { svc } = createService(pool);

  await assert.rejects(
    () => svc.unwaive(CTX, ITEM_ID, {}),
    (err: Error) => {
      assert.ok(err.message.includes("Cannot unwaive"));
      return true;
    },
  );
});

void test("unwaive: non-existent item throws NotFoundException", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  const { svc } = createService(pool);

  await assert.rejects(
    () => svc.unwaive(CTX, "00000000-0000-0000-0000-000000000099", {}),
    (err: Error) => {
      assert.ok(err.message.toLowerCase().includes("not found"));
      return true;
    },
  );
});
