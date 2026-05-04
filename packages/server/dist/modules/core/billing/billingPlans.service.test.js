import assert from "node:assert/strict";
import test from "node:test";
import {
  BillingPlansService,
  mapBillingPlanRow,
  mapBillingPlanWithPaymentsRow,
} from "./billingPlans.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_PLAN_ID = "bp-1";
const CASE_ID = "case-1";
const FOREIGN_CASE_ID = "case-foreign";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeBillingPlanRow(overrides = {}) {
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
function makeBillingPlanWithPaymentsRow(overrides = {}) {
  return {
    ...makeBillingPlanRow(),
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
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function makeTrackedPool() {
  const calls = [];
  function createQueryFn(handlers) {
    return (sql, params) => {
      calls.push({ sql: sql.trim(), params });
      for (const [pattern, handler] of Object.entries(handlers)) {
        if (sql.includes(pattern)) return Promise.resolve(handler(params));
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    };
  }
  return { calls, createQueryFn };
}
function svc(pool) {
  return new BillingPlansService(pool);
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
void test("mapBillingPlanWithPaymentsRow maps extended fields", () => {
  const dto = mapBillingPlanWithPaymentsRow(makeBillingPlanWithPaymentsRow());
  assert.equal(dto.id, BILLING_PLAN_ID);
  assert.equal(dto.caseId, CASE_ID);
  assert.equal(dto.amountDue, 1200.5);
  assert.equal(dto.paidAmount, 300);
  assert.equal(dto.unpaidAmount, 900.5);
  assert.equal(dto.caseNo, "CASE-001");
  assert.equal(dto.caseName, "Test Case");
  assert.equal(dto.customerName, "田中太郎");
  assert.equal(dto.groupId, "group-1");
  assert.equal(dto.ownerUserId, "owner-1");
  assert.equal(dto.ownerDisplayName, "鈴木花子");
});
void test("mapBillingPlanWithPaymentsRow clamps unpaidAmount to zero", () => {
  const dto = mapBillingPlanWithPaymentsRow(
    makeBillingPlanWithPaymentsRow({
      amount_due: "100",
      paid_amount: "150",
    }),
  );
  assert.equal(dto.paidAmount, 150);
  assert.equal(dto.unpaidAmount, 0);
});
void test("mapBillingPlanWithPaymentsRow handles null owner/customer", () => {
  const dto = mapBillingPlanWithPaymentsRow(
    makeBillingPlanWithPaymentsRow({
      owner_user_id: null,
      owner_display_name: null,
      customer_name: null,
      case_no: null,
      case_name: null,
      group_id: null,
    }),
  );
  assert.equal(dto.ownerUserId, null);
  assert.equal(dto.ownerDisplayName, null);
  assert.equal(dto.customerName, null);
  assert.equal(dto.caseNo, null);
  assert.equal(dto.caseName, null);
  assert.equal(dto.groupId, null);
});
void test("mapBillingPlanWithPaymentsRow handles zero paid_amount", () => {
  const dto = mapBillingPlanWithPaymentsRow(
    makeBillingPlanWithPaymentsRow({ paid_amount: "0" }),
  );
  assert.equal(dto.paidAmount, 0);
  assert.equal(dto.unpaidAmount, 1200.5);
});
void test("BillingPlansService.create inserts row and writes timeline in tx", async () => {
  const { calls, createQueryFn } = makeTrackedPool();
  const pool = makePool(
    createQueryFn({
      "select id from cases": () => ({ rows: [{ id: CASE_ID }], rowCount: 1 }),
      "insert into billing_records": () => ({
        rows: [makeBillingPlanRow()],
        rowCount: 1,
      }),
    }),
  );
  const created = await svc(pool).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 1200.5,
    remark: "initial",
  });
  assert.equal(created.id, BILLING_PLAN_ID);
  assert.equal(created.status, "due");
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall, "timeline must be written inside tx");
  const tlParams = timelineCall.params ?? [];
  assert.equal(tlParams[2], BILLING_PLAN_ID);
  assert.equal(tlParams[3], "billing_plan.created");
  const cacheCall = calls.find((c) => c.sql.includes("update cases set"));
  assert.ok(cacheCall, "syncBillingCacheForCase must be called inside tx");
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
void test("BillingPlansService.create accepts block gateEffectMode", async () => {
  const { calls, createQueryFn } = makeTrackedPool();
  const pool = makePool(
    createQueryFn({
      "select id from cases": () => ({ rows: [{ id: CASE_ID }], rowCount: 1 }),
      "insert into billing_records": () => ({
        rows: [makeBillingPlanRow({ gate_effect_mode: "block" })],
        rowCount: 1,
      }),
    }),
  );
  const created = await svc(pool).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 1200.5,
    gateEffectMode: "block",
  });
  assert.equal(created.gateEffectMode, "block");
  const insertCall = calls.find((c) =>
    c.sql.includes("insert into billing_records"),
  );
  assert.equal(insertCall?.params?.[5], "block");
});
void test("BillingPlansService.create rejects invalid gateEffectMode", async () => {
  await assert.rejects(
    () =>
      svc(makePool(() => Promise.resolve({ rows: [], rowCount: 0 }))).create(
        makeCtx(),
        { caseId: CASE_ID, amountDue: 100, gateEffectMode: "invalid" },
      ),
    /Invalid gateEffectMode: invalid/,
  );
});
void test("BillingPlansService.create rejects cross-tenant caseId", async () => {
  const pool = makePool(
    makeTrackedPool().createQueryFn({
      "select id from cases": () => ({ rows: [], rowCount: 0 }),
    }),
  );
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
    if (
      sql.includes("from billing_records") &&
      params?.[0] === BILLING_PLAN_ID
    ) {
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
void test("BillingPlansService.list returns CaseBillingPlanDto with extended fields", async () => {
  const { calls, createQueryFn } = makeTrackedPool();
  const pool = makePool(
    createQueryFn({
      "count(*)": () => ({ rows: [{ count: "1" }], rowCount: 1 }),
      "join cases": () => ({
        rows: [makeBillingPlanWithPaymentsRow()],
        rowCount: 1,
      }),
    }),
  );
  const result = await svc(pool).list(makeCtx("viewer"), {
    caseId: CASE_ID,
    page: 1,
    limit: 10,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  const item = result.items[0];
  assert.equal(item.paidAmount, 300);
  assert.equal(item.unpaidAmount, 900.5);
  assert.equal(item.caseNo, "CASE-001");
  assert.equal(item.caseName, "Test Case");
  assert.equal(item.customerName, "田中太郎");
  assert.equal(item.ownerDisplayName, "鈴木花子");
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(
    countCall?.sql.includes("br.org_id = $1"),
    "count must filter by org_id",
  );
  assert.ok(
    countCall?.sql.includes("br.case_id = $2"),
    "count must filter by case_id when provided",
  );
  const listCall = calls.find(
    (call) =>
      call.sql.includes("join cases") && call.sql.includes("paid_amount"),
  );
  assert.ok(
    listCall,
    "list SQL must JOIN cases and include paid_amount subquery",
  );
});
void test("BillingPlansService.update uses select for update, patches fields and writes timeline in tx", async () => {
  const { calls, createQueryFn } = makeTrackedPool();
  const pool = makePool(
    createQueryFn({
      "for update": (params) =>
        params?.[0] === BILLING_PLAN_ID
          ? { rows: [makeBillingPlanRow()], rowCount: 1 }
          : { rows: [], rowCount: 0 },
      "update billing_records": () => ({
        rows: [
          makeBillingPlanRow({ amount_due: "1500.00", remark: "updated" }),
        ],
        rowCount: 1,
      }),
    }),
  );
  const updated = await svc(pool).update(makeCtx(), BILLING_PLAN_ID, {
    amountDue: 1500,
    remark: "updated",
  });
  assert.equal(updated.amountDue, 1500);
  const forUpdateCall = calls.find((c) => c.sql.includes("for update"));
  assert.ok(forUpdateCall, "must use select ... for update to lock row");
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall, "timeline must be written inside tx");
  assert.equal(timelineCall.params?.[3], "billing_plan.updated");
  const cacheCall = calls.find((c) => c.sql.includes("update cases set"));
  assert.ok(cacheCall, "syncBillingCacheForCase must be called inside tx");
});
void test("BillingPlansService.update rejects when status is paid", async () => {
  const pool = makePool(
    makeTrackedPool().createQueryFn({
      "for update": () => ({
        rows: [makeBillingPlanRow({ status: "paid" })],
        rowCount: 1,
      }),
    }),
  );
  await assert.rejects(
    () => svc(pool).update(makeCtx(), BILLING_PLAN_ID, { amountDue: 1500 }),
    {
      name: "BadRequestException",
      message: "Cannot update a billing plan that is already paid",
    },
  );
});
const VALID_TRANSITIONS = [
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
    const { calls, createQueryFn } = makeTrackedPool();
    const pool = makePool(
      createQueryFn({
        "for update": (params) =>
          params?.[0] === BILLING_PLAN_ID
            ? { rows: [makeBillingPlanRow({ status: from })], rowCount: 1 }
            : { rows: [], rowCount: 0 },
        "update billing_records": () => ({
          rows: [makeBillingPlanRow({ status: to })],
          rowCount: 1,
        }),
      }),
    );
    const result = await svc(pool).transition(makeCtx(), BILLING_PLAN_ID, {
      toStatus: to,
    });
    assert.equal(result.status, to);
    const forUpdateCall = calls.find((c) => c.sql.includes("for update"));
    assert.ok(forUpdateCall, "must use select ... for update to lock row");
    const timelineCall = calls.find((c) =>
      c.sql.includes("insert into timeline_logs"),
    );
    assert.ok(timelineCall, "timeline must be written inside tx");
    assert.equal(timelineCall.params?.[3], "billing_plan.transitioned");
    const cacheCall = calls.find((c) => c.sql.includes("update cases set"));
    assert.ok(cacheCall, "syncBillingCacheForCase must be called inside tx");
  });
}
const INVALID_TRANSITIONS = [
  ["due", "due"],
  ["paid", "due"],
  ["paid", "partial"],
  ["partial", "due"],
];
for (const [from, to] of INVALID_TRANSITIONS) {
  void test(`BillingPlansService.transition rejects ${from} → ${to}`, async () => {
    const pool = makePool(
      makeTrackedPool().createQueryFn({
        "for update": () => ({
          rows: [makeBillingPlanRow({ status: from })],
          rowCount: 1,
        }),
      }),
    );
    await assert.rejects(
      () =>
        svc(pool).transition(makeCtx(), BILLING_PLAN_ID, {
          toStatus: to,
        }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("not allowed"));
        return true;
      },
    );
  });
}
void test("BillingPlansService.update not found throws NotFoundException", async () => {
  const pool = makePool(makeTrackedPool().createQueryFn({}));
  await assert.rejects(
    () => svc(pool).update(makeCtx(), "nonexistent", { amountDue: 100 }),
    { name: "NotFoundException" },
  );
});
void test("BillingPlansService.transition not found throws NotFoundException", async () => {
  const pool = makePool(makeTrackedPool().createQueryFn({}));
  await assert.rejects(
    () => svc(pool).transition(makeCtx(), "nonexistent", { toStatus: "paid" }),
    { name: "NotFoundException" },
  );
});
//# sourceMappingURL=billingPlans.service.test.js.map
