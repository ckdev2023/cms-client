import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import {
  ResidencePeriodsService,
  mapResidencePeriodRow,
} from "./residencePeriods.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000010";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000020";
const PERIOD_ID = "00000000-0000-4000-8000-000000000030";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

function makeCtx(role: RequestContext["role"] = "staff"): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeResidencePeriodRow(overrides: Record<string, unknown> = {}) {
  return {
    id: PERIOD_ID,
    org_id: ORG_ID,
    case_id: CASE_ID,
    customer_id: CUSTOMER_ID,
    visa_type: "business_manager",
    status_of_residence: "経営・管理",
    period_years: 1,
    period_label: "1年",
    valid_from: "2026-01-01",
    valid_until: "2027-01-01",
    card_number: "AB1234567CD",
    is_current: true,
    notes: null,
    created_by: USER_ID,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: queryFn,
        release: () => undefined,
      }),
  } as unknown as Pool;
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

function createService(queryFn: QueryFn) {
  const timeline = makeTimeline();
  const svc = new ResidencePeriodsService(
    makePool(queryFn),
    timeline.service as never,
  );
  return { svc, timeline };
}

void test("mapResidencePeriodRow maps row to entity", () => {
  const period = mapResidencePeriodRow(makeResidencePeriodRow());
  assert.equal(period.id, PERIOD_ID);
  assert.equal(period.validUntil, "2027-01-01");
  assert.equal(period.periodYears, 1);
  assert.equal(period.isCurrent, true);
});

void test("ResidencePeriodsService.create inserts row, clears previous current and schedules reminders", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc, timeline } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from cases") && sql.includes("customer_id")) {
      return Promise.resolve({
        rows: [{ id: CASE_ID, customer_id: CUSTOMER_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("from customers")) {
      return Promise.resolve({ rows: [{ id: CUSTOMER_ID }], rowCount: 1 });
    }
    if (
      sql.includes("update residence_periods") &&
      sql.includes("set is_current = false")
    ) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("insert into residence_periods")) {
      return Promise.resolve({ rows: [makeResidencePeriodRow()], rowCount: 1 });
    }
    if (
      sql.includes("update reminders") &&
      sql.includes("set send_status = 'canceled'")
    ) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (sql.includes("select owner_user_id") && sql.includes("from cases")) {
      return Promise.resolve({
        rows: [{ owner_user_id: USER_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into reminders")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const created = await svc.create(makeCtx(), {
    caseId: CASE_ID,
    customerId: CUSTOMER_ID,
    visaType: "business_manager",
    statusOfResidence: "経営・管理",
    validFrom: "2026-01-01",
    validUntil: "2027-01-01",
    isCurrent: true,
  });

  assert.equal(created.id, PERIOD_ID);
  assert.equal(timeline.writes.length, 1);
  assert.ok(calls.some((call) => call.sql.includes("insert into reminders")));
});

void test("ResidencePeriodsService.update replaces reminder schedule and writes timeline", async () => {
  const { svc, timeline } = createService((sql, _params) => {
    void _params;
    if (sql.includes("from residence_periods") && sql.includes("for update")) {
      return Promise.resolve({ rows: [makeResidencePeriodRow()], rowCount: 1 });
    }
    if (
      sql.includes("update residence_periods") &&
      sql.includes("set is_current = false")
    ) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (
      sql.includes("update residence_periods") &&
      sql.includes("set visa_type")
    ) {
      return Promise.resolve({
        rows: [makeResidencePeriodRow({ valid_until: "2027-06-01" })],
        rowCount: 1,
      });
    }
    if (
      sql.includes("update reminders") &&
      sql.includes("set send_status = 'canceled'")
    ) {
      return Promise.resolve({ rows: [], rowCount: 3 });
    }
    if (sql.includes("select owner_user_id") && sql.includes("from cases")) {
      return Promise.resolve({
        rows: [{ owner_user_id: USER_ID }],
        rowCount: 1,
      });
    }
    if (sql.includes("insert into reminders")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const updated = await svc.update(makeCtx(), PERIOD_ID, {
    validUntil: "2027-06-01",
  });
  assert.equal(updated.validUntil, "2027-06-01");
  assert.equal(timeline.writes.length, 1);
});

void test("ResidencePeriodsService.list filters by org and current flag", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)::text")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    if (sql.includes("from residence_periods")) {
      return Promise.resolve({ rows: [makeResidencePeriodRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const result = await svc.list(makeCtx("viewer"), {
    currentOnly: true,
    caseId: CASE_ID,
  });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.ok(calls.some((call) => call.sql.includes("org_id = $1")));
  assert.ok(calls.some((call) => call.sql.includes("is_current = true")));
});

void test("ResidencePeriodsService.create rejects mismatched customer and case", async () => {
  const { svc } = createService((sql) => {
    if (sql.includes("from cases") && sql.includes("customer_id")) {
      return Promise.resolve({
        rows: [{ id: CASE_ID, customer_id: "other" }],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  await assert.rejects(
    () =>
      svc.create(makeCtx(), {
        caseId: CASE_ID,
        customerId: CUSTOMER_ID,
        visaType: "business_manager",
        statusOfResidence: "経営・管理",
        validFrom: "2026-01-01",
        validUntil: "2027-01-01",
      }),
    /customerId does not match case owner customer/,
  );
});
