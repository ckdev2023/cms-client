import assert from "node:assert/strict";
import test from "node:test";
import {
  PaymentRecordsService,
  mapPaymentRecordRow,
} from "./paymentRecords.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_RECORD_ID = "billing-1";
const PAYMENT_RECORD_ID = "payment-1";
const CASE_ID = "case-1";
const FOREIGN_BILLING_RECORD_ID = "billing-foreign";
function makeCtx(role = "staff") {
  return { orgId: ORG_ID, userId: USER_ID, role };
}
function makeBillingRecordRow(overrides = {}) {
  return {
    id: BILLING_RECORD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    milestone_name: null,
    amount_due: "1200.00",
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
    billing_record_id: BILLING_RECORD_ID,
    case_id: CASE_ID,
    amount_received: "300.00",
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
void test("mapPaymentRecordRow maps database row to PaymentRecord", () => {
  const paymentRecord = mapPaymentRecordRow(makePaymentRecordRow());
  assert.equal(paymentRecord.id, PAYMENT_RECORD_ID);
  assert.equal(paymentRecord.billingPlanId, BILLING_RECORD_ID);
  assert.equal(paymentRecord.amountReceived, 300);
  assert.equal(paymentRecord.paymentMethod, "bank_transfer");
  assert.equal(paymentRecord.recordStatus, "valid");
});
void test("PaymentRecordsService.create inserts row, writes timeline, and recalculates billing to partial", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
    }
    if (sql.includes("insert into payment_records")) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    if (sql.includes("sum(amount_received)")) {
      return Promise.resolve({
        rows: [{ total_received: "300.00" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "partial" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const created = await new PaymentRecordsService(pool).create(makeCtx(), {
    billingPlanId: BILLING_RECORD_ID,
    amountReceived: 300,
    receivedAt: "2026-02-01T00:00:00.000Z",
    paymentMethod: "bank_transfer",
  });
  assert.equal(created.id, PAYMENT_RECORD_ID);
  const timelineCalls = calls.filter((call) =>
    call.sql.includes("insert into timeline_logs"),
  );
  assert.equal(timelineCalls.length, 2);
  assert.equal(timelineCalls[0]?.params?.[1], "payment_record");
  assert.equal(timelineCalls[0]?.params?.[3], "payment_record.created");
  assert.equal(timelineCalls[1]?.params?.[1], "billing_plan");
  assert.equal(timelineCalls[1]?.params?.[3], "billing_plan.transitioned");
  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "partial");
});
void test("PaymentRecordsService.create settles billing record when cumulative payments cover amountDue", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
    }
    if (sql.includes("insert into payment_records")) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    if (sql.includes("sum(amount_received)")) {
      return Promise.resolve({
        rows: [{ total_received: "1200.00" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "paid" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await new PaymentRecordsService(pool).create(makeCtx(), {
    billingPlanId: BILLING_RECORD_ID,
    amountReceived: 900,
    receivedAt: "2026-02-01T00:00:00.000Z",
  });
  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "paid");
});
void test("PaymentRecordsService.create rejects amountReceived <= 0", async () => {
  await assert.rejects(
    () =>
      new PaymentRecordsService(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
      ).create(makeCtx(), {
        billingPlanId: BILLING_RECORD_ID,
        amountReceived: 0,
        receivedAt: "2026-02-01T00:00:00.000Z",
      }),
    {
      name: "BadRequestException",
      message: "amountReceived must be greater than 0",
    },
  );
});
void test("PaymentRecordsService.create rejects cross-tenant billingPlanId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await assert.rejects(
    () =>
      new PaymentRecordsService(pool).create(makeCtx(), {
        billingPlanId: FOREIGN_BILLING_RECORD_ID,
        amountReceived: 100,
        receivedAt: "2026-02-01T00:00:00.000Z",
      }),
    {
      name: "BadRequestException",
      message: "Referenced billing plan not found in current organization",
    },
  );
});
void test("PaymentRecordsService.get returns payment record or null", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from payment_records") &&
      params?.[0] === PAYMENT_RECORD_ID
    ) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const service = new PaymentRecordsService(pool);
  const found = await service.get(makeCtx("viewer"), PAYMENT_RECORD_ID);
  assert.ok(found);
  assert.equal(found.id, PAYMENT_RECORD_ID);
  assert.equal(await service.get(makeCtx("viewer"), "missing"), null);
});
void test("PaymentRecordsService.void sets record_status to voided and recalculates billing to due", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from payment_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "partial" })],
        rowCount: 1,
      });
    }
    if (sql.includes("update payment_records")) {
      return Promise.resolve({
        rows: [makePaymentRecordRow({ record_status: "voided" })],
        rowCount: 1,
      });
    }
    if (sql.includes("sum(amount_received)")) {
      return Promise.resolve({
        rows: [{ total_received: "0.00" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "due" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const voided = await new PaymentRecordsService(pool).void(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
    { reasonCode: "customer_request" },
  );
  assert.equal(voided.recordStatus, "voided");
  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "due");
  const timelineCalls = calls.filter((call) =>
    call.sql.includes("insert into timeline_logs"),
  );
  assert.equal(timelineCalls.length, 2);
  assert.equal(timelineCalls[0]?.params?.[3], "payment_record.voided");
});
void test("PaymentRecordsService.void rejects non-manager role", async () => {
  await assert.rejects(
    () =>
      new PaymentRecordsService(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
      ).void(makeCtx("staff"), PAYMENT_RECORD_ID, {
        reasonCode: "duplicate",
      }),
    {
      name: "ForbiddenException",
      message: "Voiding payment record requires manager role",
    },
  );
});
//# sourceMappingURL=paymentRecords.service.test.js.map
