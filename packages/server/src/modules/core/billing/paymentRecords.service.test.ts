import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
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

function makeCtx(
  role: "owner" | "manager" | "staff" | "viewer" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeBillingRecordRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BILLING_RECORD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    billing_type: "standard",
    milestone_name: null,
    amount_due: "1200.00",
    due_date: "2026-06-01",
    status: "awaiting_payment",
    invoice_status: "none",
    remark: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePaymentRecordRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PAYMENT_RECORD_ID,
    org_id: ORG_ID,
    billing_record_id: BILLING_RECORD_ID,
    case_id: CASE_ID,
    amount_received: "300.00",
    received_at: "2026-02-01T00:00:00.000Z",
    payment_method: "bank_transfer",
    receipt_file_url: "https://example.test/receipt.pdf",
    recorded_by: USER_ID,
    created_at: "2026-02-01T00:00:00.000Z",
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

void test("mapPaymentRecordRow maps database row to PaymentRecord", () => {
  const paymentRecord = mapPaymentRecordRow(makePaymentRecordRow());
  assert.equal(paymentRecord.id, PAYMENT_RECORD_ID);
  assert.equal(paymentRecord.billingRecordId, BILLING_RECORD_ID);
  assert.equal(paymentRecord.amountReceived, 300);
  assert.equal(paymentRecord.paymentMethod, "bank_transfer");
});

void test("PaymentRecordsService.create inserts row, writes timeline, and recalculates billing to partial_paid", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
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
        rows: [makeBillingRecordRow({ status: "partial_paid" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const created = await new PaymentRecordsService(pool).create(makeCtx(), {
    billingRecordId: BILLING_RECORD_ID,
    amountReceived: 300,
    receivedAt: "2026-02-01T00:00:00.000Z",
    paymentMethod: "bank_transfer",
    receiptFileUrl: "https://example.test/receipt.pdf",
  });

  assert.equal(created.id, PAYMENT_RECORD_ID);
  const timelineCalls = calls.filter((call) =>
    call.sql.includes("insert into timeline_logs"),
  );
  assert.equal(timelineCalls.length, 2);
  assert.equal(timelineCalls[0]?.params?.[1], "payment_record");
  assert.equal(timelineCalls[0]?.params?.[3], "payment_record.created");
  assert.equal(timelineCalls[1]?.params?.[1], "billing_record");
  assert.equal(timelineCalls[1]?.params?.[3], "billing_record.transitioned");
  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "partial_paid");
});

void test("PaymentRecordsService.create settles billing record when cumulative payments cover amountDue", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
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
        rows: [makeBillingRecordRow({ status: "settled" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).create(makeCtx(), {
    billingRecordId: BILLING_RECORD_ID,
    amountReceived: 900,
    receivedAt: "2026-02-01T00:00:00.000Z",
  });

  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "settled");
});

void test("PaymentRecordsService.create rejects amountReceived <= 0", async () => {
  await assert.rejects(
    () =>
      new PaymentRecordsService(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
      ).create(makeCtx(), {
        billingRecordId: BILLING_RECORD_ID,
        amountReceived: 0,
        receivedAt: "2026-02-01T00:00:00.000Z",
      }),
    {
      name: "BadRequestException",
      message: "amountReceived must be greater than 0",
    },
  );
});

void test("PaymentRecordsService.create rejects cross-tenant billingRecordId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      new PaymentRecordsService(pool).create(makeCtx(), {
        billingRecordId: FOREIGN_BILLING_RECORD_ID,
        amountReceived: 100,
        receivedAt: "2026-02-01T00:00:00.000Z",
      }),
    {
      name: "BadRequestException",
      message:
        "Referenced billing_records record not found in current organization",
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

void test("PaymentRecordsService.list returns items and total by billingRecordId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from payment_records")) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    billingRecordId: BILLING_RECORD_ID,
    page: 1,
    limit: 10,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall?.sql.includes("billing_record_id = $1"));
  const orgCall = calls.find((call) => call.sql.includes("app.org_id"));
  assert.equal(orgCall?.params?.[0], ORG_ID);
});

void test("PaymentRecordsService.delete recalculates billing record to awaiting_payment when no payments remain", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from payment_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "partial_paid" })],
        rowCount: 1,
      });
    }
    if (sql.includes("delete from payment_records")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("sum(amount_received)")) {
      return Promise.resolve({
        rows: [{ total_received: "0.00" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "awaiting_payment" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).delete(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
  );

  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "awaiting_payment");
  const timelineCalls = calls.filter((call) =>
    call.sql.includes("insert into timeline_logs"),
  );
  assert.equal(timelineCalls.length, 2);
  assert.equal(timelineCalls[0]?.params?.[1], "payment_record");
  assert.equal(timelineCalls[0]?.params?.[3], "payment_record.deleted");
});

void test("PaymentRecordsService.delete recalculates billing record to partial_paid when payments remain", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from payment_records") && sql.includes("for update")) {
      return Promise.resolve({ rows: [makePaymentRecordRow()], rowCount: 1 });
    }
    if (sql.includes("from billing_records") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "settled" })],
        rowCount: 1,
      });
    }
    if (sql.includes("delete from payment_records")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("sum(amount_received)")) {
      return Promise.resolve({
        rows: [{ total_received: "200.00" }],
        rowCount: 1,
      });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "partial_paid" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).delete(
    makeCtx("manager"),
    PAYMENT_RECORD_ID,
  );

  const billingUpdateCall = calls.find((call) =>
    call.sql.includes("update billing_records"),
  );
  assert.equal(billingUpdateCall?.params?.[1], "partial_paid");
});

void test("PaymentRecordsService.delete rejects non-manager role", async () => {
  await assert.rejects(
    () =>
      new PaymentRecordsService(
        makePool(() => Promise.resolve({ rows: [], rowCount: 0 })),
      ).delete(makeCtx("staff"), PAYMENT_RECORD_ID),
    {
      name: "ForbiddenException",
      message: "Deleting payment record requires manager role",
    },
  );
});
