import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import {
  PaymentRecordsService,
  mapPaymentRecordListRow,
  type PaymentRecordListRow,
} from "./paymentRecords.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_RECORD_ID = "billing-1";
const PAYMENT_RECORD_ID = "payment-1";
const CASE_ID = "case-1";

function makeCtx(
  role: "owner" | "manager" | "staff" | "viewer" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
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

function makePaymentRecordListRow(
  overrides: Record<string, unknown> = {},
): PaymentRecordListRow {
  return {
    ...(makePaymentRecordRow(overrides) as unknown as PaymentRecordListRow),
    milestone_name:
      (overrides.milestone_name as string | null | undefined) ?? null,
    case_name: (overrides.case_name as string | null | undefined) ?? null,
    case_no: (overrides.case_no as string | null | undefined) ?? null,
    recorded_by_display_name:
      (overrides.recorded_by_display_name as string | null | undefined) ?? null,
    voided_by_display_name:
      (overrides.voided_by_display_name as string | null | undefined) ?? null,
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

void test("list returns items and total by billingPlanId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (
      sql.includes("from payment_records") &&
      !sql.includes("for update") &&
      !sql.includes("count(*)")
    ) {
      return Promise.resolve({
        rows: [makePaymentRecordListRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    billingPlanId: BILLING_RECORD_ID,
    page: 1,
    limit: 10,
  });

  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("pr.org_id = $1"));
  assert.ok(countCall.sql.includes("pr.billing_record_id = $2"));
  assert.ok(countCall.sql.includes("pr.record_status = $3"));
  assert.ok(countCall.params);
  assert.equal(countCall.params[0], ORG_ID);
  assert.equal(countCall.params[1], BILLING_RECORD_ID);
  assert.equal(countCall.params[2], "valid");
});

void test("list succeeds without billingPlanId or caseId (org-wide)", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await new PaymentRecordsService(pool).list(
    makeCtx("viewer"),
    {},
  );

  assert.equal(result.total, 0);
  assert.equal(result.items.length, 0);
  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("pr.org_id = $1"));
  assert.ok(!countCall.sql.includes("pr.billing_record_id = $"));
  assert.ok(!countCall.sql.includes("pr.case_id = $"));
});

void test("list returns displayName from joined users", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (
      sql.includes("from payment_records") &&
      !sql.includes("for update") &&
      !sql.includes("count(*)")
    ) {
      return Promise.resolve({
        rows: [
          makePaymentRecordListRow({
            recorded_by_display_name: "田中太郎",
            voided_by_display_name: "鈴木花子",
            record_status: "voided",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    recordStatus: "all",
  });

  assert.equal(result.items[0]?.recordedByDisplayName, "田中太郎");
  assert.equal(result.items[0]?.voidedByDisplayName, "鈴木花子");
});

void test("list displayName fallback to null when user missing", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (
      sql.includes("from payment_records") &&
      !sql.includes("for update") &&
      !sql.includes("count(*)")
    ) {
      return Promise.resolve({
        rows: [
          makePaymentRecordListRow({
            recorded_by_display_name: null,
            voided_by_display_name: null,
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await new PaymentRecordsService(pool).list(
    makeCtx("viewer"),
    {},
  );

  assert.equal(result.items[0]?.recordedByDisplayName, null);
  assert.equal(result.items[0]?.voidedByDisplayName, null);
});

void test("list defaults recordStatus to valid", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).list(makeCtx("viewer"), {});

  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("pr.record_status = $"));
  assert.ok(countCall.params?.includes("valid"));
});

void test("list recordStatus=all returns all three states", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    recordStatus: "all",
  });

  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(!countCall.sql.includes("pr.record_status = $"));
  assert.ok(!countCall.params?.includes("valid"));
});

void test("list passes groupId and ownerId filters", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    groupId: "group-1",
    ownerId: "owner-1",
  });

  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("c.group_id = $"));
  assert.ok(countCall.sql.includes("c.owner_user_id = $"));
  assert.ok(countCall.params?.includes("group-1"));
  assert.ok(countCall.params?.includes("owner-1"));
});

void test("list passes q filter matching note and case fields", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    q: "振込",
  });

  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("lower(pr.note)"));
  assert.ok(countCall.sql.includes("lower(c.case_no)"));
  assert.ok(countCall.sql.includes("lower(c.case_name)"));
  assert.ok(countCall.sql.includes("lower(cu.name)"));
  assert.ok(countCall.sql.includes("lower(br.milestone_name)"));
  assert.ok(countCall.params?.includes("振込"));
});

void test("list passes from/to date range filters", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await new PaymentRecordsService(pool).list(makeCtx("viewer"), {
    from: "2026-01-01T00:00:00.000Z",
    to: "2026-12-31T23:59:59.999Z",
  });

  const countCall = calls.find((call) => call.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("pr.received_at >= $"));
  assert.ok(countCall.sql.includes("pr.received_at <= $"));
  assert.ok(countCall.params?.includes("2026-01-01T00:00:00.000Z"));
  assert.ok(countCall.params?.includes("2026-12-31T23:59:59.999Z"));
});

void test("list returns caseName, caseNo, milestoneName from joined tables", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (
      sql.includes("from payment_records") &&
      !sql.includes("for update") &&
      !sql.includes("count(*)")
    ) {
      return Promise.resolve({
        rows: [
          makePaymentRecordListRow({
            case_name: "在留資格変更",
            case_no: "CASE-001",
            milestone_name: "着手金",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await new PaymentRecordsService(pool).list(
    makeCtx("viewer"),
    {},
  );

  assert.equal(result.items[0]?.caseName, "在留資格変更");
  assert.equal(result.items[0]?.caseNo, "CASE-001");
  assert.equal(result.items[0]?.milestoneName, "着手金");
});

void test("mapPaymentRecordListRow maps all fields including displayName and extended fields", () => {
  const row = makePaymentRecordListRow({
    recorded_by_display_name: "Admin",
    voided_by_display_name: "Manager",
    milestone_name: "着手金",
    case_name: "テストケース",
    case_no: "CASE-999",
    record_status: "reversed",
    voided_by: "user-void",
    voided_at: "2026-03-01T00:00:00.000Z",
  });

  const dto = mapPaymentRecordListRow(row);

  assert.equal(dto.id, PAYMENT_RECORD_ID);
  assert.equal(dto.billingPlanId, BILLING_RECORD_ID);
  assert.equal(dto.recordedByDisplayName, "Admin");
  assert.equal(dto.voidedByDisplayName, "Manager");
  assert.equal(dto.milestoneName, "着手金");
  assert.equal(dto.caseName, "テストケース");
  assert.equal(dto.caseNo, "CASE-999");
  assert.equal(dto.recordStatus, "reversed");
  assert.equal(dto.voidedBy, "user-void");
  assert.equal(dto.voidedAt, "2026-03-01T00:00:00.000Z");
});
