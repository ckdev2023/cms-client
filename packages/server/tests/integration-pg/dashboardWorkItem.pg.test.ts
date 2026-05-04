/**
 * E4 PG-integration — DashboardService.getSummary を真 PG で実行し、
 * loadTodoItems / loadDeadlineItems / loadRiskItems の SQL（JOIN・CTE・
 * 集計）が schema と整合していることを検証するスキーマ漂移哨兵テスト。
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

import { DashboardService } from "../../src/modules/core/dashboard/dashboard.service";
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

const ORG_ID = "20000000-0000-4000-a000-000000000001";
const USER_ID = "20000000-0000-4000-a000-000000000010";
const CUSTOMER_ID = "20000000-0000-4000-a000-000000000020";
const CASE_ID_TODO = "20000000-0000-4000-a000-000000000030";
const CASE_ID_DEADLINE = "20000000-0000-4000-a000-000000000031";
const CASE_ID_RISK = "20000000-0000-4000-a000-000000000032";
const TASK_ID = "20000000-0000-4000-a000-000000000040";
const VALIDATION_RUN_ID = "20000000-0000-4000-a000-000000000050";

const CTX: RequestContext = {
  orgId: ORG_ID,
  userId: USER_ID,
  role: "owner",
};

function createService(pool: Pool): DashboardService {
  return new DashboardService(pool);
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
    `INSERT INTO users (id, org_id, email, name, role)
     VALUES ($1, $2, 'dashboard-test@test.com', 'Dashboard Tester', 'owner')
     ON CONFLICT DO NOTHING`,
    [USER_ID, ORG_ID],
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

async function seedCase(
  pool: Pool,
  overrides: {
    id: string;
    case_no: string;
    case_name: string;
    status?: string;
    stage?: string;
    due_at?: string;
    risk_level?: string;
    billing_unpaid_amount_cached?: number;
  },
) {
  const {
    id,
    case_no,
    case_name,
    status = "open",
    stage,
    due_at,
    risk_level = "low",
    billing_unpaid_amount_cached = 0,
  } = overrides;
  await pool.query(
    `INSERT INTO cases
       (id, org_id, customer_id, case_type_code, status, owner_user_id,
        case_no, case_name, business_phase, stage, due_at, risk_level,
        billing_unpaid_amount_cached)
     VALUES ($1, $2, $3, 'bmv', $4, $5, $6, $7, 'INTAKE', $8, $9::timestamptz, $10, $11)
     ON CONFLICT DO NOTHING`,
    [
      id,
      ORG_ID,
      CUSTOMER_ID,
      status,
      USER_ID,
      case_no,
      case_name,
      stage,
      due_at ?? null,
      risk_level,
      billing_unpaid_amount_cached,
    ],
  );
}

async function seedTask(
  pool: Pool,
  overrides: {
    id: string;
    case_id: string | null;
    title: string;
    priority?: string;
    status?: string;
    due_at?: string;
  },
) {
  const {
    id,
    case_id,
    title,
    priority = "normal",
    status = "pending",
    due_at,
  } = overrides;
  await pool.query(
    `INSERT INTO tasks
       (id, org_id, case_id, title, priority, status, assignee_user_id, due_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
     ON CONFLICT DO NOTHING`,
    [id, ORG_ID, case_id, title, priority, status, USER_ID, due_at ?? null],
  );
}

async function seedValidationRun(
  pool: Pool,
  overrides: {
    id: string;
    case_id: string;
    result_status: string;
  },
) {
  await pool.query(
    `INSERT INTO validation_runs
       (id, org_id, case_id, result_status, executed_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT DO NOTHING`,
    [overrides.id, ORG_ID, overrides.case_id, overrides.result_status],
  );
}

async function seedBase(pool: Pool) {
  await seedOrg(pool);
  await seedUser(pool);
  await seedCustomer(pool);
}

// ── 1. 空集 → panels 全空、summary 全 0 ──

void test("getSummary returns empty panels when no business data exists (no SQL error)", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "all",
    timeWindow: 30,
    limit: 5,
  });

  assert.equal(result.scope, "all");
  assert.equal(result.timeWindow, 30);
  assert.deepStrictEqual(result.panels.todo, []);
  assert.deepStrictEqual(result.panels.deadlines, []);
  assert.deepStrictEqual(result.panels.submissions, []);
  assert.deepStrictEqual(result.panels.risks, []);
  assert.equal(result.summary.todayTasks, 0);
  assert.equal(result.summary.upcomingCases, 0);
  assert.equal(result.summary.pendingSubmissions, 0);
  assert.equal(result.summary.riskCases, 0);
});

// ── 2. todo パネル：task 1 件 → mapTodoItem が正常動作 ──

void test("todo panel returns mapped work item for a pending task", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  await seedCase(pool, {
    id: CASE_ID_TODO,
    case_no: "CASE-TODO-001",
    case_name: "Todo案件",
  });
  await seedTask(pool, {
    id: TASK_ID,
    case_id: CASE_ID_TODO,
    title: "提出資料を準備",
    priority: "high",
    status: "pending",
  });

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "all",
    timeWindow: 30,
    limit: 5,
  });

  assert.ok(
    result.summary.todayTasks >= 1,
    "todayTasks count should include the pending task",
  );
  assert.ok(
    result.panels.todo.length >= 1,
    "todo panel should contain at least 1 item",
  );

  const item = result.panels.todo.find((i) => i.id === TASK_ID);
  assert.ok(item, "todo panel should contain the seeded task");
  assert.equal(item.title, "提出資料を準備");
  assert.equal(item.descKey, "todo.statusPriority");
  assert.ok(item.descParams, "descParams should be populated");
  assert.equal(item.descParams.status, "pending");
  assert.equal(item.descParams.priority, "high");
  assert.equal(item.actionKey, "viewCase");
  assert.equal(item.route, `/cases/${CASE_ID_TODO}`);
});

// ── 3. deadline パネル：due_at が近い case → mapDeadlineItem が正常動作 ──

void test("deadline panel returns mapped work item for a case with upcoming due_at", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const dueSoon = new Date(Date.now() + 3 * 86_400_000).toISOString();
  await seedCase(pool, {
    id: CASE_ID_DEADLINE,
    case_no: "CASE-DL-001",
    case_name: "期限案件",
    stage: "S3",
    due_at: dueSoon,
  });

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "all",
    timeWindow: 30,
    limit: 5,
  });

  assert.ok(
    result.summary.upcomingCases >= 1,
    "upcomingCases count should include the deadline case",
  );
  assert.ok(
    result.panels.deadlines.length >= 1,
    "deadlines panel should contain at least 1 item",
  );

  const item = result.panels.deadlines.find((i) => i.id === CASE_ID_DEADLINE);
  assert.ok(item, "deadlines panel should contain the seeded case");
  assert.equal(item.title, "期限案件");
  assert.equal(item.descKey, "deadline.currentStage");
  assert.ok(item.descParams, "descParams should be populated");
  assert.equal(item.descParams.status, "S3");
  assert.equal(item.actionKey, "viewCase");
  assert.ok(
    typeof item.daysLeft === "number" && item.daysLeft > 0,
    `daysLeft should be a positive number, got ${String(item.daysLeft)}`,
  );
});

// ── 4. risk パネル：high risk case → mapRiskItem が正常動作 ──

void test("risk panel returns mapped work item for a high-risk case", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  await seedCase(pool, {
    id: CASE_ID_RISK,
    case_no: "CASE-RISK-001",
    case_name: "高リスク案件",
    risk_level: "high",
  });

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "all",
    timeWindow: 30,
    limit: 5,
  });

  assert.ok(
    result.summary.riskCases >= 1,
    "riskCases count should include the high-risk case",
  );
  assert.ok(
    result.panels.risks.length >= 1,
    "risks panel should contain at least 1 item",
  );

  const item = result.panels.risks.find((i) => i.id === CASE_ID_RISK);
  assert.ok(item, "risks panel should contain the seeded case");
  assert.equal(item.title, "高リスク案件");
  assert.equal(item.status, "danger");
  assert.equal(item.descKey, "risk.highRiskGeneric");
  assert.equal(item.statusLabelKey, "highRisk");
});

// ── 5. risk パネル：validation_status=failed → CTE が正常動作 ──

void test("risk panel picks up case with failed validation via CTE", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const caseIdValidation = "20000000-0000-4000-a000-000000000033";
  await seedCase(pool, {
    id: caseIdValidation,
    case_no: "CASE-VF-001",
    case_name: "検証失敗案件",
    risk_level: "low",
  });
  await seedValidationRun(pool, {
    id: VALIDATION_RUN_ID,
    case_id: caseIdValidation,
    result_status: "failed",
  });

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "all",
    timeWindow: 30,
    limit: 10,
  });

  const item = result.panels.risks.find((i) => i.id === caseIdValidation);
  assert.ok(item, "risks panel should include case with failed validation run");
  assert.equal(item.descKey, "risk.validationFailed");
  assert.equal(item.statusLabelKey, "validationRisk");
});

// ── 6. mine scope → scopeClause でフィルタが効く ──

void test("getSummary with scope=mine filters by owner_user_id (no SQL error)", async () => {
  const pool = getTestPool();
  await seedBase(pool);
  await seedCase(pool, {
    id: CASE_ID_TODO,
    case_no: "CASE-MINE-001",
    case_name: "マイ案件",
  });
  await seedTask(pool, {
    id: TASK_ID,
    case_id: CASE_ID_TODO,
    title: "自分のタスク",
    priority: "normal",
    status: "in_progress",
  });

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "mine",
    timeWindow: 7,
    limit: 5,
  });

  assert.equal(result.scope, "mine");
  assert.ok(
    result.panels.todo.length >= 1,
    "mine scope should include tasks assigned to the user",
  );
});

// ── 7. risk パネル：unpaid_amount > 0 → billing risk ──

void test("risk panel returns billing risk for case with unpaid amount", async () => {
  const pool = getTestPool();
  await seedBase(pool);

  const caseIdBilling = "20000000-0000-4000-a000-000000000034";
  await seedCase(pool, {
    id: caseIdBilling,
    case_no: "CASE-BILL-001",
    case_name: "未収案件",
    risk_level: "low",
    billing_unpaid_amount_cached: 50000,
  });

  const svc = createService(pool);
  const result = await svc.getSummary(CTX, {
    scope: "all",
    timeWindow: 30,
    limit: 10,
  });

  const item = result.panels.risks.find((i) => i.id === caseIdBilling);
  assert.ok(item, "risks panel should include case with unpaid billing");
  assert.equal(item.descKey, "risk.unpaidAmount");
  assert.equal(item.statusLabelKey, "billingRisk");
  assert.ok(item.descParams?.amount, "descParams.amount should be populated");
});
