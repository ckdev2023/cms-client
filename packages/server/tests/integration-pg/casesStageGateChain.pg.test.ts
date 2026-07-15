/**
 * S3 flow/stage 域 PG-integration —— Gate-A / Gate-B 的真实 SQL 判定。
 *
 * 这两道闸口不是纯函数：它们直接查 `case_parties`(is_primary) 与
 * `document_items`(required_flag / status)。单测用 mock pool 只能断言 SQL
 * 字符串形状，无法验证「查询与 schema 是否真的对得上、判定是否真的成立」。
 * 本用例跑真实 PG，覆盖 flow/stage/stageTransitionGates 的核心判定：
 *
 *   Gate-A（S3→S4）：必须存在 is_primary=true 的 case_party
 *   Gate-B（S4→S5）：required_flag=true 的 document_items 必须全部
 *                    approved 或 waived（waived 亦放行 —— 完成率口径里
 *                    waived 从分母剔除，见 P0/03 业务规则 §7）
 *
 * 拆分批次 S3 把这些判定从 cases.service.transition-gates 迁至
 * flow/stage/stageTransitionGates；本用例同时充当迁移后的行为哨兵。
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

const ORG_ID = "22000000-0000-4000-a000-000000000001";
const USER_ID = "22000000-0000-4000-a000-000000000010";
const ROLE_ID = "22000000-0000-4000-a000-00000000a001";
const CUSTOMER_ID = "22000000-0000-4000-a000-000000000020";
const CASE_ID = "22000000-0000-4000-a000-000000000030";

const CTX: RequestContext = { orgId: ORG_ID, userId: USER_ID, role: "owner" };

function createService(pool: Pool): CasesService {
  const templates = {
    resolve: () => Promise.resolve({ mode: "legacy", used: false }),
  };
  return new CasesService(pool, templates as never);
}

async function seedBase(pool: Pool, stage: string): Promise<void> {
  await pool.query(
    `INSERT INTO organizations (id, name)
     VALUES ($1, 'gate-test-org') ON CONFLICT DO NOTHING`,
    [ORG_ID],
  );
  await pool.query(
    `INSERT INTO roles (id, org_id, code, name, is_system)
     VALUES ($1, $2, 'owner', 'Owner', true) ON CONFLICT DO NOTHING`,
    [ROLE_ID, ORG_ID],
  );
  await pool.query(
    `INSERT INTO users (id, org_id, email, name, role_id)
     VALUES ($1, $2, 'gate-test@test.com', 'Gate Tester', $3)
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
     VALUES ($1, $2, $3, 'family_stay', $4, $4, $5, 'C-GATE-001',
             'gate chain case', 'CONSULTING')
     ON CONFLICT DO NOTHING`,
    [CASE_ID, ORG_ID, CUSTOMER_ID, stage, USER_ID],
  );
}

async function addPrimaryParty(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO case_parties
       (org_id, case_id, party_type, customer_id, relation_to_case, is_primary)
     VALUES ($1, $2, 'applicant', $3, '主申請人', true)`,
    [ORG_ID, CASE_ID, CUSTOMER_ID],
  );
}

async function addDocumentItem(
  pool: Pool,
  opts: { status: string; requiredFlag: boolean; code: string },
): Promise<void> {
  await pool.query(
    `INSERT INTO document_items
       (org_id, case_id, checklist_item_code, name, status, owner_side,
        category, provided_by_role, required_flag)
     VALUES ($1, $2, $3, 'テスト書類', $4, 'applicant', '主申请人',
             'applicant', $5)`,
    [ORG_ID, CASE_ID, opts.code, opts.status, opts.requiredFlag],
  );
}

/**
 * S5/S6/S7 的共同前置：`assertBillingRecordExists` 要求案件至少有一条应收。
 * 该检查在 Gate-B 的资料项判定之前执行，故所有 Gate-B 用例都需先备好应收，
 * 否则会被更早的 CASE_STAGE_BILLING_RECORD_REQUIRED 拦下，根本测不到 Gate-B。
 */
async function addBillingRecord(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO billing_records (org_id, case_id, milestone_name, amount_due, status)
     VALUES ($1, $2, '着手金', 100000, 'due')`,
    [ORG_ID, CASE_ID],
  );
}

// ── Gate-A（S3→S4）：主当事人 ──────────────────────────────────

void test("Gate-A 阻断：无 is_primary 当事人时 S3→S4 被拒", async () => {
  const pool = getTestPool();
  await seedBase(pool, "S3");
  const svc = createService(pool);

  await assert.rejects(
    svc.transition(CTX, CASE_ID, { toStage: "S4" }),
    /CASE_GATE_A_MISSING_PRIMARY_PARTY/,
  );

  const row = await pool.query<{ stage: string }>(
    `select stage from cases where id = $1`,
    [CASE_ID],
  );
  assert.equal(row.rows[0]?.stage, "S3", "闸口拒绝后阶段不得推进");
});

void test("Gate-A 放行：存在 is_primary 当事人时 S3→S4 通过", async () => {
  const pool = getTestPool();
  await seedBase(pool, "S3");
  await addPrimaryParty(pool);
  const svc = createService(pool);

  const updated = await svc.transition(CTX, CASE_ID, { toStage: "S4" });
  assert.equal(updated.stage ?? updated.status, "S4");
});

void test("Gate-A 阻断：仅有非 primary 当事人不足以放行", async () => {
  const pool = getTestPool();
  await seedBase(pool, "S3");
  await pool.query(
    `INSERT INTO case_parties
       (org_id, case_id, party_type, customer_id, relation_to_case, is_primary)
     VALUES ($1, $2, 'supporter', $3, '扶養者', false)`,
    [ORG_ID, CASE_ID, CUSTOMER_ID],
  );
  const svc = createService(pool);

  await assert.rejects(
    svc.transition(CTX, CASE_ID, { toStage: "S4" }),
    /CASE_GATE_A_MISSING_PRIMARY_PARTY/,
  );
});

// ── Gate-B（S4→S5）：必交资料项 ────────────────────────────────

void test("Gate-B 阻断：存在未审核通过的必交资料项时 S4→S5 被拒", async () => {
  const pool = getTestPool();
  await seedBase(pool, "S4");
  await addPrimaryParty(pool);
  await addBillingRecord(pool);
  await addDocumentItem(pool, {
    status: "pending",
    requiredFlag: true,
    code: "fs-passport",
  });
  const svc = createService(pool);

  await assert.rejects(
    svc.transition(CTX, CASE_ID, { toStage: "S5" }),
    /CASE_GATE_B_INCOMPLETE_REQUIRED_ITEMS/,
  );
});

void test("Gate-B 放行：必交项 approved / waived 混合即可通过（waived 视同齐备）", async () => {
  const pool = getTestPool();
  await seedBase(pool, "S4");
  await addPrimaryParty(pool);
  await addDocumentItem(pool, {
    status: "approved",
    requiredFlag: true,
    code: "fs-passport",
  });
  await addDocumentItem(pool, {
    status: "waived",
    requiredFlag: true,
    code: "fs-supporter-employment",
  });
  await addBillingRecord(pool);
  const svc = createService(pool);

  const updated = await svc.transition(CTX, CASE_ID, { toStage: "S5" });
  assert.equal(updated.stage ?? updated.status, "S5");
});

void test("Gate-B 放行：非必交项未完成不阻断（required_flag=false 不参与判定）", async () => {
  const pool = getTestPool();
  await seedBase(pool, "S4");
  await addPrimaryParty(pool);
  await addDocumentItem(pool, {
    status: "approved",
    requiredFlag: true,
    code: "fs-passport",
  });
  await addDocumentItem(pool, {
    status: "pending",
    requiredFlag: false,
    code: "fs-optional-extra",
  });
  await addBillingRecord(pool);
  const svc = createService(pool);

  const updated = await svc.transition(CTX, CASE_ID, { toStage: "S5" });
  assert.equal(updated.stage ?? updated.status, "S5");
});
