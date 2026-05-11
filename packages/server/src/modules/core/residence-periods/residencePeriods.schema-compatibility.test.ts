import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { ResidencePeriodsService } from "./residencePeriods.service";

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
    entry_date: null,
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

void test(
  "ResidencePeriodsService.create skips legacy columns when schema is missing entry_date/reminder_created",
  { skip: "pending schema migration" },
  async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const { svc, timeline } = createService((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("information_schema.columns")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("case_type_code") && sql.includes("from cases")) {
        return Promise.resolve({
          rows: [{ case_type_code: "business_manager_visa" }],
          rowCount: 1,
        });
      }
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
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      }
      if (sql.includes("from case_templates")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("update reminders") && sql.includes("canceled")) {
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
      entryDate: "2026-01-15",
      isCurrent: true,
    });

    assert.equal(created.entryDate, null);
    assert.equal(created.reminderCreated, false);
    assert.equal(timeline.writes.length, 1);
    const insertCall = calls.find((call) =>
      call.sql.includes("insert into residence_periods"),
    );
    assert.ok(insertCall, "should issue insert SQL");
    assert.ok(!insertCall.sql.includes("is_current, entry_date, notes"));
    assert.ok(!insertCall.params?.includes("2026-01-15"));
    assert.ok(
      !calls.some((call) => call.sql.includes("reminder_created = true")),
    );
  },
);

void test(
  "ResidencePeriodsService.update skips legacy columns when schema is missing entry_date/reminder_created",
  { skip: "pending schema migration" },
  async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const { svc, timeline } = createService((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes("information_schema.columns")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("case_type_code") && sql.includes("from cases")) {
        return Promise.resolve({
          rows: [{ case_type_code: "business_manager_visa" }],
          rowCount: 1,
        });
      }
      if (
        sql.includes("from residence_periods") &&
        sql.includes("for update")
      ) {
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      }
      if (
        sql.includes("update residence_periods") &&
        sql.includes("set visa_type")
      ) {
        return Promise.resolve({
          rows: [makeResidencePeriodRow()],
          rowCount: 1,
        });
      }
      if (sql.includes("from case_templates")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (sql.includes("update reminders") && sql.includes("canceled")) {
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
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const updated = await svc.update(makeCtx(), PERIOD_ID, {
      entryDate: "2026-03-01",
      validUntil: "2027-06-01",
    });

    assert.equal(updated.entryDate, null);
    assert.equal(updated.reminderCreated, false);
    assert.equal(timeline.writes.length, 1);
    const updateCall = calls.find(
      (call) =>
        call.sql.includes("update residence_periods") &&
        call.sql.includes("set visa_type"),
    );
    assert.ok(updateCall, "should issue update SQL");
    assert.ok(!updateCall.sql.includes("entry_date ="));
    assert.ok(
      !calls.some(
        (call) =>
          call.sql.includes("update residence_periods") &&
          call.sql.includes("reminder_created ="),
      ),
    );
  },
);
