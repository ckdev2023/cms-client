import assert from "node:assert/strict";
import test from "node:test";
import { BillingPlansService } from "./billingPlans.service";
import { PaymentRecordsService } from "./paymentRecords.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_PLAN_ID = "bp-1";
const PAYMENT_RECORD_ID = "pr-1";
const CASE_ID = "case-1";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeBillingPlanRow(overrides = {}) {
  return {
    id: BILLING_PLAN_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    milestone_name: "着手金",
    amount_due: "1000.00",
    due_date: "2026-06-01",
    status: "due",
    gate_effect_mode: "warn",
    remark: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function makePaymentRecordRow(overrides = {}) {
  return {
    id: PAYMENT_RECORD_ID,
    org_id: ORG_ID,
    billing_record_id: BILLING_PLAN_ID,
    case_id: CASE_ID,
    amount_received: "500.00",
    received_at: "2026-02-01T00:00:00.000Z",
    payment_method: "bank_transfer",
    record_status: "valid",
    receipt_storage_type: null,
    receipt_relative_path_or_key: null,
    note: null,
    void_reason_code: null,
    void_reason_note: null,
    voided_by: null,
    voided_at: null,
    reversed_from_payment_record_id: null,
    recorded_by: USER_ID,
    created_at: "2026-02-01T00:00:00.000Z",
    ...overrides,
  };
}
function makePool(queryFn) {
  const client = { query: queryFn, release: () => undefined };
  return { connect: () => Promise.resolve(client) };
}
function findCacheSyncCalls(calls) {
  return calls.filter(
    (c) =>
      c.sql.includes("update cases set") &&
      c.sql.includes("billing_unpaid_amount_cached"),
  );
}
function makeTrackedQueryFn(handlers) {
  const calls = [];
  const queryFn = (sql, params) => {
    calls.push({ sql: sql.trim(), params });
    for (const [pattern, handler] of Object.entries(handlers)) {
      if (sql.includes(pattern)) return Promise.resolve(handler(params));
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  return { calls, queryFn };
}
void test("syncBillingCache: BillingPlansService.create triggers cache sync", async () => {
  const { calls, queryFn } = makeTrackedQueryFn({
    "select id from cases": () => ({ rows: [{ id: CASE_ID }], rowCount: 1 }),
    "insert into billing_records": () => ({
      rows: [makeBillingPlanRow()],
      rowCount: 1,
    }),
  });
  await new BillingPlansService(makePool(queryFn)).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 1000,
  });
  const cacheCalls = findCacheSyncCalls(calls);
  assert.equal(
    cacheCalls.length,
    1,
    "create must trigger exactly one cache sync",
  );
  assert.equal(
    cacheCalls[0]?.params?.[0],
    CASE_ID,
    "cache sync must target the correct caseId",
  );
});
void test("syncBillingCache: BillingPlansService.update triggers cache sync", async () => {
  const { calls, queryFn } = makeTrackedQueryFn({
    "for update": (params) =>
      params?.[0] === BILLING_PLAN_ID
        ? { rows: [makeBillingPlanRow()], rowCount: 1 }
        : { rows: [], rowCount: 0 },
    "update billing_records": () => ({
      rows: [makeBillingPlanRow({ amount_due: "2000.00" })],
      rowCount: 1,
    }),
  });
  await new BillingPlansService(makePool(queryFn)).update(
    makeCtx(),
    BILLING_PLAN_ID,
    { amountDue: 2000 },
  );
  const cacheCalls = findCacheSyncCalls(calls);
  assert.equal(
    cacheCalls.length,
    1,
    "update must trigger exactly one cache sync",
  );
  assert.equal(cacheCalls[0]?.params?.[0], CASE_ID);
});
void test("syncBillingCache: BillingPlansService.transition triggers cache sync", async () => {
  const { calls, queryFn } = makeTrackedQueryFn({
    "for update": (params) =>
      params?.[0] === BILLING_PLAN_ID
        ? { rows: [makeBillingPlanRow({ status: "due" })], rowCount: 1 }
        : { rows: [], rowCount: 0 },
    "update billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "overdue" })],
      rowCount: 1,
    }),
  });
  await new BillingPlansService(makePool(queryFn)).transition(
    makeCtx(),
    BILLING_PLAN_ID,
    { toStatus: "overdue" },
  );
  const cacheCalls = findCacheSyncCalls(calls);
  assert.equal(
    cacheCalls.length,
    1,
    "transition must trigger exactly one cache sync",
  );
  assert.equal(cacheCalls[0]?.params?.[0], CASE_ID);
});
void test("syncBillingCache: PaymentRecordsService.create (createInTx) triggers cache sync", async () => {
  const { calls, queryFn } = makeTrackedQueryFn({
    "from billing_records": () => ({
      rows: [makeBillingPlanRow()],
      rowCount: 1,
    }),
    "insert into payment_records": () => ({
      rows: [makePaymentRecordRow()],
      rowCount: 1,
    }),
    "sum(amount_received)": () => ({
      rows: [{ total_received: "500.00" }],
      rowCount: 1,
    }),
    "update billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "partial" })],
      rowCount: 1,
    }),
  });
  await new PaymentRecordsService(makePool(queryFn)).create(makeCtx(), {
    billingPlanId: BILLING_PLAN_ID,
    amountReceived: 500,
    receivedAt: "2026-02-01T00:00:00.000Z",
  });
  const cacheCalls = findCacheSyncCalls(calls);
  assert.equal(
    cacheCalls.length,
    1,
    "createInTx must trigger exactly one cache sync",
  );
  assert.equal(cacheCalls[0]?.params?.[0], CASE_ID);
});
void test("syncBillingCache: PaymentRecordsService.void triggers cache sync", async () => {
  const { calls, queryFn } = makeTrackedQueryFn({
    "from payment_records": () => ({
      rows: [makePaymentRecordRow()],
      rowCount: 1,
    }),
    "from billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "partial" })],
      rowCount: 1,
    }),
    "update payment_records": () => ({
      rows: [makePaymentRecordRow({ record_status: "voided" })],
      rowCount: 1,
    }),
    "sum(amount_received)": () => ({
      rows: [{ total_received: "0.00" }],
      rowCount: 1,
    }),
    "update billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "due" })],
      rowCount: 1,
    }),
  });
  await new PaymentRecordsService(makePool(queryFn)).void(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
    { reasonCode: "customer_request" },
  );
  const cacheCalls = findCacheSyncCalls(calls);
  assert.equal(
    cacheCalls.length,
    1,
    "void must trigger exactly one cache sync",
  );
  assert.equal(cacheCalls[0]?.params?.[0], CASE_ID);
});
void test("syncBillingCache: PaymentRecordsService.reverse (reverseInTx) triggers cache sync", async () => {
  const { calls, queryFn } = makeTrackedQueryFn({
    "from payment_records": () => ({
      rows: [makePaymentRecordRow()],
      rowCount: 1,
    }),
    "from billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "partial" })],
      rowCount: 1,
    }),
    "update payment_records": () => ({
      rows: [
        makePaymentRecordRow({
          record_status: "reversed",
          void_reason_code: "incorrect_amount",
          voided_by: USER_ID,
          voided_at: "2026-03-01T00:00:00.000Z",
        }),
      ],
      rowCount: 1,
    }),
    "sum(amount_received)": () => ({
      rows: [{ total_received: "0.00" }],
      rowCount: 1,
    }),
    "update billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "due" })],
      rowCount: 1,
    }),
  });
  await new PaymentRecordsService(makePool(queryFn)).reverse(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
    { reasonCode: "incorrect_amount" },
  );
  const cacheCalls = findCacheSyncCalls(calls);
  assert.equal(
    cacheCalls.length,
    1,
    "reverseInTx must trigger exactly one cache sync",
  );
  assert.equal(cacheCalls[0]?.params?.[0], CASE_ID);
});
void test("syncBillingCache: reversed payment rolls back billing_unpaid_amount_cached in real-time", async () => {
  const cacheUpdates = [];
  const { queryFn } = makeTrackedQueryFn({
    "from payment_records": () => ({
      rows: [makePaymentRecordRow({ amount_received: "1000.00" })],
      rowCount: 1,
    }),
    "from billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "paid", milestone_name: "着手金" })],
      rowCount: 1,
    }),
    "update payment_records": () => ({
      rows: [
        makePaymentRecordRow({
          amount_received: "1000.00",
          record_status: "reversed",
          void_reason_code: "bank_error",
          voided_by: USER_ID,
          voided_at: "2026-03-01T00:00:00.000Z",
        }),
      ],
      rowCount: 1,
    }),
    "sum(amount_received)": () => ({
      rows: [{ total_received: "0.00" }],
      rowCount: 1,
    }),
    "update billing_records": () => ({
      rows: [makeBillingPlanRow({ status: "due", milestone_name: "着手金" })],
      rowCount: 1,
    }),
  });
  const originalQueryFn = queryFn;
  const wrappedQueryFn = (sql, params) => {
    if (
      sql.includes("update cases set") &&
      sql.includes("billing_unpaid_amount_cached")
    ) {
      cacheUpdates.push({
        depositPaid: params?.[1],
        finalPaid: params?.[2],
        unpaid: params?.[3],
      });
    }
    return originalQueryFn(sql, params);
  };
  await new PaymentRecordsService(makePool(wrappedQueryFn)).reverse(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
    { reasonCode: "bank_error" },
  );
  assert.equal(cacheUpdates.length, 1, "cache must be updated exactly once");
  assert.equal(
    cacheUpdates[0]?.unpaid,
    1000,
    "billing_unpaid_amount_cached must roll back to full amount_due after reverse",
  );
});
void test("syncBillingCache: serial writes to same case are idempotent (cache called once per write)", async () => {
  const cacheCallCounts = [];
  const makeQueryFnForCreate = () => {
    let localCacheCalls = 0;
    const queryFn = (sql) => {
      if (
        sql.includes("update cases set") &&
        sql.includes("billing_unpaid_amount_cached")
      ) {
        localCacheCalls++;
      }
      if (sql.includes("select id from cases")) {
        return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
      }
      if (sql.includes("insert into billing_records")) {
        return Promise.resolve({
          rows: [makeBillingPlanRow()],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    };
    return {
      queryFn,
      getCacheCount: () => localCacheCalls,
    };
  };
  const run1 = makeQueryFnForCreate();
  await new BillingPlansService(makePool(run1.queryFn)).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 500,
  });
  cacheCallCounts.push(run1.getCacheCount());
  const run2 = makeQueryFnForCreate();
  await new BillingPlansService(makePool(run2.queryFn)).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 700,
  });
  cacheCallCounts.push(run2.getCacheCount());
  assert.deepEqual(
    cacheCallCounts,
    [1, 1],
    "each write must trigger exactly one cache sync, no more",
  );
});
//# sourceMappingURL=syncBillingCache.focused.test.js.map
