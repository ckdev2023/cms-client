import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { BillingPlansService } from "./billingPlans.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "case-1";

function makeCtx(role: RequestContext["role"] = "viewer"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeBillingPlanWithPaymentsRow(
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "bp-1",
    org_id: ORG_ID,
    case_id: CASE_ID,
    milestone_name: null,
    amount_due: "1200.50",
    due_date: "2026-06-01",
    status: "due",
    gate_effect_mode: "warn",
    remark: "initial",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    paid_amount: "300.00",
    case_no: "CASE-001",
    case_name: "Test Case",
    customer_name: "田中太郎",
    group_id: "group-1",
    owner_user_id: "owner-1",
    owner_display_name: "鈴木花子",
    ...overrides,
  };
}

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn: PoolClientLike["query"]): Pool {
  const client: PoolClientLike = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) } as unknown as Pool;
}

function svc(pool: Pool) {
  return new BillingPlansService(pool);
}

type SqlCall = { sql: string; params?: unknown[] };

function makeCountPool(): { calls: SqlCall[]; pool: Pool } {
  const calls: SqlCall[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  return { calls, pool };
}

function findCount(calls: SqlCall[]) {
  return calls.find((c) => c.sql.includes("count(*)"));
}

// ─── org-wide list (no caseId) ─────────────────────────────────

void test("list org-wide omits case_id filter, includes org_id", async () => {
  const calls: SqlCall[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "2" }], rowCount: 1 });
    if (sql.includes("paid_amount")) {
      return Promise.resolve({
        rows: [
          makeBillingPlanWithPaymentsRow(),
          makeBillingPlanWithPaymentsRow({ id: "bp-2", case_id: "case-2" }),
        ],
        rowCount: 2,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc(pool).list(makeCtx(), { page: 1, limit: 10 });

  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(cnt.sql.includes("br.org_id = $1"), "count filters by org_id");
  assert.ok(!cnt.sql.includes("br.case_id = $"), "count omits case_id filter");

  const list = calls.find((c) => c.sql.includes("paid_amount"));
  assert.ok(list);
  assert.ok(list.sql.includes("br.org_id = $1"), "list filters by org_id");
  assert.ok(!list.sql.includes("br.case_id = $"), "list omits case_id filter");
});

// ─── single caseId compat ──────────────────────────────────────

void test("list with caseId includes case_id filter alongside org_id", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), { caseId: CASE_ID });

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(cnt.sql.includes("br.org_id = $1"));
  assert.ok(cnt.sql.includes("br.case_id = $2"));
  const cp = cnt.params ?? [];
  assert.equal(cp[0], ORG_ID);
  assert.equal(cp[1], CASE_ID);
});

// ─── cross-org isolation ───────────────────────────────────────

void test("org_id param always equals ctx.orgId (cross-org isolation)", async () => {
  const { calls, pool } = makeCountPool();
  const OTHER_ORG = "11111111-1111-4111-8111-111111111111";

  await svc(pool).list(
    { orgId: OTHER_ORG, userId: USER_ID, role: "viewer" },
    {},
  );

  const cnt = findCount(calls);
  assert.ok(cnt);
  const cp = cnt.params ?? [];
  assert.equal(cp[0], OTHER_ORG, "org_id param must match ctx.orgId");
});

// ─── status filter ─────────────────────────────────────────────

void test("list with status filter adds br.status condition", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), { status: "overdue" });

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(cnt.sql.includes("br.status = $2"));
  assert.equal((cnt.params ?? [])[1], "overdue");
});

// ─── groupId filter ────────────────────────────────────────────

void test("list with groupId filter adds c.group_id condition", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), { groupId: "group-1" });

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(cnt.sql.includes("c.group_id = $2"));
  assert.equal((cnt.params ?? [])[1], "group-1");
});

// ─── ownerId filter ────────────────────────────────────────────

void test("list with ownerId filter adds c.owner_user_id condition", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), { ownerId: "owner-1" });

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(cnt.sql.includes("c.owner_user_id = $2"));
  assert.equal((cnt.params ?? [])[1], "owner-1");
});

// ─── q search ──────────────────────────────────────────────────

void test("list with q filter adds lower() like conditions for D3 columns", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), { q: "田中" });

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(cnt.sql.includes("lower(c.case_no) like"), "q searches case_no");
  assert.ok(
    cnt.sql.includes("lower(c.case_name) like"),
    "q searches case_name",
  );
  assert.ok(
    cnt.sql.includes("lower(cu.base_profile->>'displayName') like"),
    "q searches customer name",
  );
  assert.ok(
    cnt.sql.includes("lower(br.milestone_name) like"),
    "q searches milestone_name",
  );
  const qp = cnt.params ?? [];
  assert.equal(qp[1], "田中");
});

// ─── combined filters ──────────────────────────────────────────

void test("combined filters constructs correct parameter positions", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), {
    caseId: CASE_ID,
    status: "due",
    groupId: "group-1",
    ownerId: "owner-1",
    q: "visa",
  });

  const cnt = findCount(calls);
  assert.ok(cnt);
  const cp = cnt.params ?? [];
  assert.equal(cp[0], ORG_ID, "$1 = orgId");
  assert.equal(cp[1], CASE_ID, "$2 = caseId");
  assert.equal(cp[2], "due", "$3 = status");
  assert.equal(cp[3], "group-1", "$4 = groupId");
  assert.equal(cp[4], "owner-1", "$5 = ownerId");
  assert.equal(cp[5], "visa", "$6 = q");
  assert.ok(cnt.sql.includes("br.org_id = $1"));
  assert.ok(cnt.sql.includes("br.case_id = $2"));
  assert.ok(cnt.sql.includes("br.status = $3"));
  assert.ok(cnt.sql.includes("c.group_id = $4"));
  assert.ok(cnt.sql.includes("c.owner_user_id = $5"));
  assert.ok(cnt.sql.includes("lower(c.case_no) like '%' || lower($6)"));
});

// ─── count query joins ─────────────────────────────────────────

void test("count uses JOIN for filter compatibility", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), { groupId: "group-1" });

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(
    cnt.sql.includes("join cases c"),
    "count must JOIN cases for group_id filter",
  );
});

// ─── soft-deleted case exclusion ───────────────────────────────

void test("list JOIN cases excludes soft-deleted cases (metadata._status='deleted')", async () => {
  const { calls, pool } = makeCountPool();

  await svc(pool).list(makeCtx(), {});

  const cnt = findCount(calls);
  assert.ok(cnt);
  assert.ok(
    cnt.sql.includes(
      "coalesce(c.metadata->>'_status', '') is distinct from 'deleted'",
    ),
    "count JOIN cases must filter out soft-deleted cases",
  );
});

// ─── pagination ────────────────────────────────────────────────

void test("pagination passes limit and offset as last params", async () => {
  const calls: SqlCall[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "50" }], rowCount: 1 });
    if (sql.includes("paid_amount"))
      return Promise.resolve({ rows: [], rowCount: 0 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await svc(pool).list(makeCtx(), { page: 3, limit: 10 });

  const list = calls.find((c) => c.sql.includes("paid_amount"));
  assert.ok(list);
  const p = list.params ?? [];
  assert.equal(p[p.length - 2], 10, "second-to-last param = limit");
  assert.equal(
    p[p.length - 1],
    20,
    "last param = offset (page 3, limit 10 → offset 20)",
  );
});
