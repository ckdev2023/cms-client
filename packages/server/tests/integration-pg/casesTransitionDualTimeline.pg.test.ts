/**
 * 拆分前置契约（S3 保障）PG-integration —— 钉死 timeline 双写语义：
 *
 * 一次 S1→S2 阶段流转必须同时产生两条 timeline_logs：
 *   1) `case.transitioned`   —— cases.service 事务内直写（writeTimelineInTx）
 *   2) `case.status_changed` —— DB 触发器 cases_status_timeline（AFTER UPDATE OF status，
 *                               见 infra/db/migrations/003_timeline_triggers.sql）
 * 两条记录的 actor_user_id 均取自事务内 set_config('app.actor_user_id')。
 *
 * flow/ 域拆分（批次 S3）不得改变：status 列的更新写法（触发器依赖
 * UPDATE OF status）、service 直写动作名、actor 传递机制。
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

import { CasesService } from "../../src/modules/core/cases/cases.service";
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

const ORG_ID = "21000000-0000-4000-a000-000000000001";
const USER_ID = "21000000-0000-4000-a000-000000000010";
const ROLE_ID = "21000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "21000000-0000-4000-a000-000000000020";
const CASE_ID = "21000000-0000-4000-a000-000000000030";

const CTX: RequestContext = {
  orgId: ORG_ID,
  userId: USER_ID,
  role: "owner",
};

function createService(pool: Pool): CasesService {
  const templates = {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  };
  return new CasesService(pool, templates as never);
}

async function seedBase(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO organizations (id, name)
     VALUES ($1, 'timeline-test-org') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'timeline-test@test.com', 'Timeline Tester', $3)
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID, ROLE_ID],
  );
  await pool.query(
    `INSERT INTO customers (id, org_id, type)
     VALUES ($1, $2, 'individual') ON CONFLICT DO NOTHING`,
    [CUSTOMER_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO cases
       (id, org_id, customer_id, case_type_code, status, stage,
        owner_user_id, case_no, case_name, business_phase)
     VALUES ($1, $2, $3, 'family_stay', 'S1', 'S1', $4, 'C-TL-001',
             'timeline dual-write case', 'CONSULTING')
     ON CONFLICT DO NOTHING`,
    [CASE_ID, ORG_ID, CUSTOMER_ID, USER_ID],
  );
}

void test("S1→S2 流转同时产生 service 直写与触发器两条时间线，actor 一致", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  const svc = createService(pool);

  const updated = await svc.transition(CTX, CASE_ID, { toStage: "S2" });
  assert.equal(updated.stage ?? updated.status, "S2");

  const logs = await pool.query<{
    action: string;
    actor_user_id: string | null;
    payload: Record<string, unknown>;
  }>(
    `select action, actor_user_id, payload
       from timeline_logs
      where org_id = $1 and entity_type = 'case' and entity_id = $2
      order by created_at asc`,
    [ORG_ID, CASE_ID],
  );

  const actions = logs.rows.map((r) => r.action);
  assert.ok(
    actions.includes("case.transitioned"),
    `缺少 service 直写 case.transitioned，实际：${actions.join(", ")}`,
  );
  assert.ok(
    actions.includes("case.status_changed"),
    `缺少触发器写入 case.status_changed，实际：${actions.join(", ")}`,
  );

  for (const row of logs.rows) {
    assert.equal(
      row.actor_user_id,
      USER_ID,
      `actor_user_id 必须来自 set_config('app.actor_user_id')（action=${row.action}）`,
    );
  }

  const triggerRow = logs.rows.find((r) => r.action === "case.status_changed");
  assert.deepEqual(triggerRow?.payload, { from: "S1", to: "S2" });

  const stageHistory = await pool.query(
    `select from_stage, to_stage from case_stage_history
      where org_id = $1 and case_id = $2`,
    [ORG_ID, CASE_ID],
  );
  assert.equal(stageHistory.rows.length, 1);
  assert.deepEqual(stageHistory.rows[0], { from_stage: "S1", to_stage: "S2" });
});
