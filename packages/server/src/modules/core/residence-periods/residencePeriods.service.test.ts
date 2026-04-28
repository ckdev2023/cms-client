import assert from "node:assert/strict";
import test, { describe } from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import {
  ResidencePeriodsService,
  mapResidencePeriodRow,
  toDateOnlyString,
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
    entry_date: "2026-01-15",
    reminder_created: false,
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

void test("mapResidencePeriodRow maps row to entity including new fields", () => {
  const period = mapResidencePeriodRow(makeResidencePeriodRow());
  assert.equal(period.id, PERIOD_ID);
  assert.equal(period.validUntil, "2027-01-01");
  assert.equal(period.periodYears, 1);
  assert.equal(period.isCurrent, true);
  assert.equal(period.entryDate, "2026-01-15");
  assert.equal(period.reminderCreated, false);
});

void test("mapResidencePeriodRow handles null entry_date", () => {
  const period = mapResidencePeriodRow(
    makeResidencePeriodRow({ entry_date: null }),
  );
  assert.equal(period.entryDate, null);
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
    if (sql.includes("from case_templates")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
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
    if (
      sql.includes("update residence_periods") &&
      sql.includes("reminder_created = true")
    ) {
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
    entryDate: "2026-01-15",
    isCurrent: true,
  });

  assert.equal(created.id, PERIOD_ID);
  assert.equal(created.reminderCreated, true);
  assert.equal(timeline.writes.length, 1);
  assert.ok(calls.some((call) => call.sql.includes("insert into reminders")));
  assert.ok(
    calls.some(
      (call) =>
        call.sql.includes("update residence_periods") &&
        call.sql.includes("reminder_created = true"),
    ),
  );
});

void test("ResidencePeriodsService.create does not set reminder_created when isCurrent is false", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
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
    if (sql.includes("insert into residence_periods")) {
      return Promise.resolve({
        rows: [makeResidencePeriodRow({ is_current: false })],
        rowCount: 1,
      });
    }
    if (sql.includes("from case_templates")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (
      sql.includes("update reminders") &&
      sql.includes("set send_status = 'canceled'")
    ) {
      return Promise.resolve({ rows: [], rowCount: 0 });
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
    isCurrent: false,
  });

  assert.equal(created.reminderCreated, false);
  assert.ok(!calls.some((call) => call.sql.includes("insert into reminders")));
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
    if (sql.includes("from case_templates")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
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
    if (
      sql.includes("update residence_periods") &&
      sql.includes("reminder_created")
    ) {
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
  assert.equal(result.items[0]?.entryDate, "2026-01-15");
  assert.equal(result.items[0]?.reminderCreated, false);
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

void test("ResidencePeriodsService.update passes entryDate through to SQL", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("from residence_periods") && sql.includes("for update")) {
      return Promise.resolve({
        rows: [makeResidencePeriodRow({ entry_date: null })],
        rowCount: 1,
      });
    }
    if (
      sql.includes("update residence_periods") &&
      sql.includes("set visa_type")
    ) {
      return Promise.resolve({
        rows: [makeResidencePeriodRow({ entry_date: "2026-03-01" })],
        rowCount: 1,
      });
    }
    if (sql.includes("from case_templates")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
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
    if (
      sql.includes("update residence_periods") &&
      sql.includes("set is_current = false")
    ) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    if (
      sql.includes("update residence_periods") &&
      sql.includes("reminder_created")
    ) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const updated = await svc.update(makeCtx(), PERIOD_ID, {
    entryDate: "2026-03-01",
  });
  assert.equal(updated.entryDate, "2026-03-01");

  const updateCall = calls.find(
    (c) =>
      c.sql.includes("update residence_periods") &&
      c.sql.includes("entry_date"),
  );
  assert.ok(updateCall, "should issue SQL with entry_date");
  const updateParams = updateCall.params;
  assert.ok(updateParams, "SQL params should be captured");
  assert.ok(
    updateParams.includes("2026-03-01"),
    "SQL params should include the new entryDate",
  );
});

// ═══════════════════════════════════════════════════════════════
// BUG-068: toDateOnlyString timezone-safety tests
// ═══════════════════════════════════════════════════════════════

void describe("toDateOnlyString", () => {
  void test("returns first 10 chars of an ISO date string", () => {
    assert.equal(toDateOnlyString("2026-04-28"), "2026-04-28");
  });

  void test("returns first 10 chars of a datetime string", () => {
    assert.equal(toDateOnlyString("2026-04-28T15:30:00+09:00"), "2026-04-28");
  });

  void test("extracts correct date from Date at local midnight (pg driver behavior in east-of-UTC TZ)", () => {
    // pg driver creates Date via new Date(year, month-1, day) → local midnight
    const localMidnight = new Date(2026, 3, 28); // Apr 28 local
    assert.equal(toDateOnlyString(localMidnight), "2026-04-28");
  });

  void test("extracts correct date from Date at UTC midnight", () => {
    const utcMidnight = new Date("2026-04-28T00:00:00.000Z");
    const result = toDateOnlyString(utcMidnight);
    // In any timezone the local calendar date is either Apr 28 or Apr 29;
    // the function must return the local interpretation (matching pg driver).
    const localDay = utcMidnight.getDate();
    const localMonth = String(utcMidnight.getMonth() + 1).padStart(2, "0");
    const expected = `2026-${localMonth}-${String(localDay).padStart(2, "0")}`;
    assert.equal(result, expected);
  });

  void test("handles single-digit month/day with zero padding", () => {
    const jan1 = new Date(2026, 0, 1); // Jan 1 local
    assert.equal(toDateOnlyString(jan1), "2026-01-01");
  });

  void test("handles December 31 boundary", () => {
    const dec31 = new Date(2026, 11, 31); // Dec 31 local
    assert.equal(toDateOnlyString(dec31), "2026-12-31");
  });

  void test("throws for non-string non-Date input", () => {
    assert.throws(() => toDateOnlyString(12345), /Invalid date value/);
    assert.throws(() => toDateOnlyString(null), /Invalid date value/);
    assert.throws(() => toDateOnlyString(undefined), /Invalid date value/);
  });
});

void describe("mapResidencePeriodRow with Date objects (BUG-068 round-trip)", () => {
  void test("correctly maps Date objects in valid_from / valid_until / entry_date", () => {
    const row = makeResidencePeriodRow({
      valid_from: new Date(2026, 3, 1), // Apr 1 local midnight (pg driver style)
      valid_until: new Date(2027, 2, 31), // Mar 31 local midnight
      entry_date: new Date(2026, 3, 15), // Apr 15 local midnight
    });
    const mapped = mapResidencePeriodRow(row);
    assert.equal(mapped.validFrom, "2026-04-01");
    assert.equal(mapped.validUntil, "2027-03-31");
    assert.equal(mapped.entryDate, "2026-04-15");
  });

  void test("string dates pass through unchanged (primary path after ::text cast)", () => {
    const row = makeResidencePeriodRow({
      valid_from: "2026-04-01",
      valid_until: "2027-03-31",
      entry_date: "2026-04-15",
    });
    const mapped = mapResidencePeriodRow(row);
    assert.equal(mapped.validFrom, "2026-04-01");
    assert.equal(mapped.validUntil, "2027-03-31");
    assert.equal(mapped.entryDate, "2026-04-15");
  });
});
