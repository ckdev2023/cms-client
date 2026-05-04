import assert from "node:assert/strict";
import test from "node:test";
import { PaymentRecordsService } from "./paymentRecords.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_RECORD_ID = "billing-1";
const PAYMENT_RECORD_ID = "payment-1";
const CASE_ID = "case-1";
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
void test("reverse: valid → reversed, writes timeline, recalculates billing, syncs cache", async () => {
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
        rows: [
          makePaymentRecordRow({
            record_status: "reversed",
            void_reason_code: "incorrect_amount",
            voided_by: USER_ID,
            voided_at: "2026-03-01T00:00:00.000Z",
          }),
        ],
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
  const reversed = await new PaymentRecordsService(pool).reverse(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
    { reasonCode: "incorrect_amount" },
  );
  assert.equal(reversed.recordStatus, "reversed");
  assert.equal(reversed.voidReasonCode, "incorrect_amount");
  const timelineCalls = calls.filter((call) =>
    call.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCalls.length >= 1);
  assert.equal(timelineCalls[0]?.params?.[3], "payment_record.reversed");
  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records set status"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "due");
  const cacheCall = calls.find((call) =>
    call.sql.includes("billing_unpaid_amount_cached"),
  );
  assert.ok(cacheCall, "syncBillingCacheForCase should be called");
});
void test("reverse: rejects non-manager role", async () => {
  await assert.rejects(
    () =>
      new PaymentRecordsService(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
      ).reverse(makeCtx("staff"), PAYMENT_RECORD_ID, {
        reasonCode: "incorrect_amount",
      }),
    {
      name: "ForbiddenException",
      message: "Reversing payment record requires manager role",
    },
  );
});
void test("reverse: rejects missing reasonCode", async () => {
  await assert.rejects(
    () =>
      new PaymentRecordsService(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
      ).reverse(makeCtx("manager"), PAYMENT_RECORD_ID, {
        reasonCode: "",
      }),
    {
      name: "BadRequestException",
      message: "reasonCode is required for reverse",
    },
  );
});
void test("reverse: rejects already reversed record", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from payment_records") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [makePaymentRecordRow({ record_status: "reversed" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await assert.rejects(
    () =>
      new PaymentRecordsService(pool).reverse(
        makeCtx("manager"),
        PAYMENT_RECORD_ID,
        { reasonCode: "incorrect_amount" },
      ),
    {
      name: "BadRequestException",
      message: "Only valid payment records can be reversed (current: reversed)",
    },
  );
});
void test("reverse: rejects voided record", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from payment_records") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [makePaymentRecordRow({ record_status: "voided" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  await assert.rejects(
    () =>
      new PaymentRecordsService(pool).reverse(
        makeCtx("manager"),
        PAYMENT_RECORD_ID,
        { reasonCode: "incorrect_amount" },
      ),
    {
      name: "BadRequestException",
      message: "Only valid payment records can be reversed (current: voided)",
    },
  );
});
void test("reverse: does not introduce negative amounts", async () => {
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
        rows: [makePaymentRecordRow({ record_status: "reversed" })],
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
  await new PaymentRecordsService(pool).reverse(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
    { reasonCode: "incorrect_amount" },
  );
  const updateCall = calls.find((c) =>
    c.sql.includes("update payment_records"),
  );
  assert.ok(updateCall);
  assert.ok(
    !updateCall.sql.includes("-"),
    "SQL should not contain negative sign (no negative amounts)",
  );
  const allParams = calls.flatMap((c) => c.params ?? []);
  const numericParams = allParams.filter((p) => typeof p === "number");
  assert.ok(
    numericParams.every((n) => n >= 0),
    "No negative numeric parameters should be passed",
  );
});
//# sourceMappingURL=paymentRecords.reverse.test.js.map
