import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import {
  BillingRecordsService,
  mapBillingRecordRow,
} from "./billingRecords.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const BILLING_RECORD_ID = "billing-1";
const CASE_ID = "case-1";
const FOREIGN_CASE_ID = "case-foreign";

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
    amount_due: "1200.50",
    due_date: "2026-06-01",
    status: "unquoted",
    invoice_status: "none",
    remark: "initial quote",
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
  return new BillingRecordsService(pool, timeline.service as never);
}

void test("mapBillingRecordRow maps database row to BillingRecord", () => {
  const billingRecord = mapBillingRecordRow(makeBillingRecordRow());
  assert.equal(billingRecord.id, BILLING_RECORD_ID);
  assert.equal(billingRecord.caseId, CASE_ID);
  assert.equal(billingRecord.amountDue, 1200.5);
  assert.equal(billingRecord.dueDate, "2026-06-01");
  assert.equal(billingRecord.invoiceStatus, "none");
});

void test("mapBillingRecordRow handles null optional fields", () => {
  const billingRecord = mapBillingRecordRow(
    makeBillingRecordRow({
      milestone_name: null,
      due_date: null,
      remark: null,
    }),
  );
  assert.equal(billingRecord.milestoneName, null);
  assert.equal(billingRecord.dueDate, null);
  assert.equal(billingRecord.remark, null);
});

void test("BillingRecordsService.create inserts row and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [{ id: CASE_ID }], rowCount: 1 });
    }
    if (sql.includes("insert into billing_records")) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const created = await svc(pool, timeline).create(makeCtx(), {
    caseId: CASE_ID,
    amountDue: 1200.5,
    remark: "initial quote",
  });

  assert.equal(created.id, BILLING_RECORD_ID);
  assert.equal(created.status, "unquoted");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(timeline.writes[0], {
    entityType: "billing_record",
    entityId: BILLING_RECORD_ID,
    action: "billing_record.created",
    payload: {
      caseId: CASE_ID,
      status: "unquoted",
      amountDue: 1200.5,
      invoiceStatus: "none",
    },
  });
});

void test("BillingRecordsService.create rejects negative amountDue", async () => {
  await assert.rejects(
    () =>
      svc(makePool(() => Promise.resolve({ rows: [], rowCount: 0 }))).create(
        makeCtx(),
        {
          caseId: CASE_ID,
          amountDue: -1,
        },
      ),
    {
      name: "BadRequestException",
      message: "amountDue must be greater than or equal to 0",
    },
  );
});

void test("BillingRecordsService.create rejects cross-tenant caseId", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool).create(makeCtx(), {
        caseId: FOREIGN_CASE_ID,
        amountDue: 99,
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("cases"));
      return true;
    },
  );
});

void test("BillingRecordsService.get returns billing record or null", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from billing_records") &&
      params?.[0] === BILLING_RECORD_ID
    ) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const service = svc(pool);
  const found = await service.get(makeCtx("viewer"), BILLING_RECORD_ID);
  assert.ok(found);
  assert.equal(found.id, BILLING_RECORD_ID);
  assert.equal(await service.get(makeCtx("viewer"), "missing"), null);
});

void test("BillingRecordsService.list returns items and total by caseId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from billing_records")) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
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
  const orgCall = calls.find((call) => call.sql.includes("app.org_id"));
  assert.equal(orgCall?.params?.[0], ORG_ID);
});

void test("BillingRecordsService.update patches fields and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from billing_records") &&
      params?.[0] === BILLING_RECORD_ID
    ) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [
          makeBillingRecordRow({
            billing_type: "milestone",
            amount_due: "1500.00",
            invoice_status: "issued",
            remark: "updated",
          }),
        ],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const updated = await svc(pool, timeline).update(
    makeCtx(),
    BILLING_RECORD_ID,
    {
      billingType: "milestone",
      amountDue: 1500,
      invoiceStatus: "issued",
      remark: "updated",
    },
  );

  assert.equal(updated.billingType, "milestone");
  assert.equal(updated.amountDue, 1500);
  assert.equal(updated.invoiceStatus, "issued");
  assert.equal(timeline.writes.length, 1);
  assert.equal(
    (timeline.writes[0] as Record<string, unknown>).action,
    "billing_record.updated",
  );
});

void test("BillingRecordsService.update rejects cross-tenant case change", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from billing_records") &&
      params?.[0] === BILLING_RECORD_ID
    ) {
      return Promise.resolve({ rows: [makeBillingRecordRow()], rowCount: 1 });
    }
    if (sql.includes("select id from cases")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool).update(makeCtx(), BILLING_RECORD_ID, {
        caseId: FOREIGN_CASE_ID,
      }),
    (err) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("cases"));
      return true;
    },
  );
});

const VALID_STAFF_TRANSITIONS: [string, string][] = [
  ["unquoted", "quoted_pending"],
  ["quoted_pending", "awaiting_payment"],
  ["quoted_pending", "unquoted"],
  ["awaiting_payment", "partial_paid"],
  ["awaiting_payment", "settled"],
  ["partial_paid", "settled"],
];

for (const [from, to] of VALID_STAFF_TRANSITIONS) {
  void test(`BillingRecordsService.transition allows ${from} → ${to}`, async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes("from billing_records") &&
        params?.[0] === BILLING_RECORD_ID
      ) {
        return Promise.resolve({
          rows: [makeBillingRecordRow({ status: from })],
          rowCount: 1,
        });
      }
      if (sql.includes("update billing_records")) {
        return Promise.resolve({
          rows: [makeBillingRecordRow({ status: to })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const timeline = makeTimeline();
    const result = await svc(pool, timeline).transition(
      makeCtx(),
      BILLING_RECORD_ID,
      {
        toStatus: to,
      },
    );

    assert.equal(result.status, to);
    assert.equal(timeline.writes.length, 1);
    assert.equal(
      (timeline.writes[0] as Record<string, unknown>).action,
      "billing_record.transitioned",
    );
  });
}

const INVALID_TRANSITIONS: [string, string][] = [
  ["unquoted", "settled"],
  ["awaiting_payment", "unquoted"],
  ["partial_paid", "refunded"],
  ["refunded", "settled"],
];

for (const [from, to] of INVALID_TRANSITIONS) {
  void test(`BillingRecordsService.transition rejects ${from} → ${to}`, async () => {
    const pool = makePool((sql, params) => {
      if (
        sql.includes("from billing_records") &&
        params?.[0] === BILLING_RECORD_ID
      ) {
        return Promise.resolve({
          rows: [makeBillingRecordRow({ status: from })],
          rowCount: 1,
        });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await assert.rejects(
      () =>
        svc(pool).transition(makeCtx(), BILLING_RECORD_ID, { toStatus: to }),
      (err) => {
        assert.ok(err instanceof Error);
        assert.ok(err.message.includes("not allowed"));
        return true;
      },
    );
  });
}

void test("BillingRecordsService.transition allows settled → refunded for manager", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from billing_records") &&
      params?.[0] === BILLING_RECORD_ID
    ) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "settled" })],
        rowCount: 1,
      });
    }
    if (sql.includes("update billing_records")) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "refunded" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc(pool).transition(
    makeCtx("manager"),
    BILLING_RECORD_ID,
    {
      toStatus: "refunded",
    },
  );
  assert.equal(result.status, "refunded");
});

void test("BillingRecordsService.transition blocks settled → refunded for staff", async () => {
  const pool = makePool((sql, params) => {
    if (
      sql.includes("from billing_records") &&
      params?.[0] === BILLING_RECORD_ID
    ) {
      return Promise.resolve({
        rows: [makeBillingRecordRow({ status: "settled" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc(pool).transition(makeCtx("staff"), BILLING_RECORD_ID, {
        toStatus: "refunded",
      }),
    {
      name: "ForbiddenException",
      message: "Transition to 'refunded' requires manager role",
    },
  );
});
