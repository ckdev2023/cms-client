import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import { BillingPlansService, mapBillingPlanRow } from "./billingPlans.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_PLAN_ID = "bp-1";
const CASE_ID = "case-1";
const FOREIGN_CASE_ID = "case-foreign";

function makeCtx(role: RequestContext["role"] = "staff"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeBillingPlanRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BILLING_PLAN_ID,
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

function makeTimeline() {
  const writes: unknown[] = [];
  return {
    service: {
      write: (_ctx: unknown, input: unknown) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}

function svc(pool: Pool, timeline = makeTimeline()) {
  return new BillingPlansService(pool, timeline.service as never);
}

void test("mapBillingPlanRow maps database row to BillingPlan", () => {
  const plan = mapBillingPlanRow(makeBillingPlanRow());
  assert.equal(plan.id, BILLING_PLAN_ID);
  assert.equal(plan.caseId, CASE_ID);
  assert.equal(plan.amountDue, 1200.5);
  assert.equal(plan.dueDate, "2026-06-01");
  assert.equal(plan.status, "due");
  assert.equal(plan.gateEffectMode, "warn");
});

void test("mapBillingPlanRow handles null optional fields", () => {
  const plan = mapBillingPlanRow(
    makeBillingPlanRow({
      milestone_name: null,
      due_date: null,
      remark: null,
    }),
  );
  assert.equal(plan.milestoneName, null);
  assert.equal(plan.dueDate, null);
  assert.equal(plan.remark, null);
});

void test("BillingPlansService.create inserts row and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("insert into billing_plans")) {
      return Promise.resolve({ rows: [makeBillingPlanRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const created = await svc(pool, timeline).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 1200.5,
    remark: "initial",
  });

  assert.equal(created.id, BILLING_PLAN_ID);
  assert.equal(created.status, "due");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(timeline.writes[0], {
    entityType: "billing_plan",
    entityId: BILLING_PLAN_ID,
    action: "billing_plan.created",
    payload: {
      caseId: CASE_ID,
      milestoneName: null,
      amountDue: 1200.5,
      status: "due",
    },
  });
});

void test("BillingPlansService.create rejects negative amountDue", async () => {
  await assert.rejects(
    () =>
      svc(makePool(() => Promise.resolve({ rows: [], rowCount: 0 }))).create(
        makeCtx(),
        { caseId: CASE_ID, amountDue: -1 },
      ),
    {
      name: "BadRequestException",
      message: "amountDue must be greater than or equal to 0",
    },
  );
});

void test("BillingPlansService.create rejects cross-tenant caseId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool).create(makeCtx(), { caseId: FOREIGN_CASE_ID, amountDue: 99 }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("cases"));
      return true;
    },
  );
});

void test("BillingPlansService.get returns billing plan or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from billing_plans") && params?.[0] === BILLING_PLAN_ID) {
      return Promise.resolve({ rows: [makeBillingPlanRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = svc(pool);
  const found = await service.get(makeCtx("viewer"), BILLING_PLAN_ID);
  assert.ok(found);
  assert.equal(found.id, BILLING_PLAN_ID);
  assert.equal(await service.get(makeCtx("viewer"), "missing"), null);
});

void test("BillingPlansService.list returns items and total by caseId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from billing_plans")) {
      return Promise.resolve({ rows: [makeBillingPlanRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc(pool).list(makeCtx("viewer"), {
    caseId: CASE_ID,
    page: 1,
    limit: 10,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall?.sql.includes("case_id = $1"));
});

void test("BillingPlansService.update patches fields and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from billing_plans") && params?.[0] === BILLING_PLAN_ID) {
      return Promise.resolve({ rows: [makeBillingPlanRow()], rowCount: 1 });
    }
    if (sql.includes("update billing_plans")) {
      return Promise.resolve({
        rows: [
          makeBillingPlanRow({ amount_due: "1500.00", remark: "updated" }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const updated = await svc(pool, timeline).update(makeCtx(), BILLING_PLAN_ID, {
    amountDue: 1500,
    remark: "updated",
  });

  assert.equal(updated.amountDue, 1500);
  assert.equal(timeline.writes.length, 1);
  assert.equal(
    (timeline.writes[0] as Record<string, unknown>).action,
    "billing_plan.updated",
  );
});

void test("BillingPlansService.update rejects when status is paid", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from billing_plans") && params?.[0] === BILLING_PLAN_ID) {
      return Promise.resolve({
        rows: [makeBillingPlanRow({ status: "paid" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () => svc(pool).update(makeCtx(), BILLING_PLAN_ID, { amountDue: 1500 }),
    {
      name: "BadRequestException",
      message: "Cannot update a billing plan that is already paid",
    },
  );
});

const VALID_TRANSITIONS: [string, string][] = [
  ["due", "partial"],
  ["due", "paid"],
  ["due", "overdue"],
  ["partial", "paid"],
  ["partial", "overdue"],
  ["overdue", "partial"],
  ["overdue", "paid"],
];

for (const [from, to] of VALID_TRANSITIONS) {
  void test(`BillingPlansService.transition allows ${from} → ${to}`, async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes("from billing_plans") &&
        params?.[0] === BILLING_PLAN_ID
      ) {
        return Promise.resolve({
          rows: [makeBillingPlanRow({ status: from })],
          rowCount: 1,
        });
      }
      if (sql.includes("update billing_plans")) {
        return Promise.resolve({
          rows: [makeBillingPlanRow({ status: to })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    const result = await svc(pool, timeline).transition(
      makeCtx(),
      BILLING_PLAN_ID,
      { toStatus: to as "due" | "partial" | "paid" | "overdue" },
    );

    assert.equal(result.status, to);
    assert.equal(timeline.writes.length, 1);
  });
}

const INVALID_TRANSITIONS: [string, string][] = [
  ["due", "due"],
  ["paid", "due"],
  ["paid", "partial"],
  ["partial", "due"],
];

for (const [from, to] of INVALID_TRANSITIONS) {
  void test(`BillingPlansService.transition rejects ${from} → ${to}`, async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes("from billing_plans") &&
        params?.[0] === BILLING_PLAN_ID
      ) {
        return Promise.resolve({
          rows: [makeBillingPlanRow({ status: from })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).transition(makeCtx(), BILLING_PLAN_ID, {
          toStatus: to as "due" | "partial" | "paid" | "overdue",
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("not allowed"));
        return true;
      },
    );
  });
}
