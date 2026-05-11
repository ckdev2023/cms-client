import assert from "node:assert/strict";
import test from "node:test";
import type { Pool } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import { ResidencePeriodsService } from "./residencePeriods.service";
import { BMV_REMINDER_SCHEDULE_BLUEPRINT } from "../cases/bmvTemplateConfig";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000010";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000020";
const PERIOD_ID = "00000000-0000-4000-8000-000000000030";

type QueryResult = { rows: unknown[]; rowCount?: number };
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResult>;

function makeCtx(): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
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
  return {
    service: {
      write: () => Promise.resolve(),
    },
  };
}

function createService(queryFn: QueryFn) {
  const timeline = makeTimeline();
  const svc = new ResidencePeriodsService(
    makePool(queryFn),
    timeline.service as never,
  );
  return svc;
}

const CREATE_INPUT = {
  caseId: CASE_ID,
  customerId: CUSTOMER_ID,
  visaType: "business_manager",
  statusOfResidence: "経営・管理",
  validFrom: "2026-01-01",
  validUntil: "2027-01-01",
  isCurrent: true,
} as const;

type ReminderScenarioOptions = {
  templateRows?: unknown[];
  onInsertReminder?: (params: unknown[]) => void;
};

function createReminderService(options: ReminderScenarioOptions) {
  return createService((sql, params) => {
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
      return Promise.resolve({ rows: [makeResidencePeriodRow()], rowCount: 1 });
    }
    if (sql.includes("from case_templates")) {
      const rows = options.templateRows ?? [];
      return Promise.resolve({ rows, rowCount: rows.length });
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
      options.onInsertReminder?.(params ?? []);
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
}

async function createReminderScenario(options: ReminderScenarioOptions) {
  await createReminderService(options).create(makeCtx(), CREATE_INPUT);
}

// ─── Blueprint-driven reminder generation ──────────────────────

void test("create uses BMV template blueprint when case_templates row exists", async () => {
  const insertedReminders: unknown[][] = [];
  await createReminderScenario({
    templateRows: [
      { reminder_schedule_blueprint: BMV_REMINDER_SCHEDULE_BLUEPRINT },
    ],
    onInsertReminder: (params) => {
      insertedReminders.push(params);
    },
  });

  assert.equal(insertedReminders.length, 3, "should insert 3 reminders");

  for (const params of insertedReminders) {
    const channel = params[7];
    assert.equal(
      channel,
      "in_app",
      "channel from BMV blueprint should be in_app",
    );
    const recipientType = params[5];
    assert.equal(
      recipientType,
      "internal_user",
      "owner blueprint maps to internal_user",
    );
  }

  const dedupeKeys = insertedReminders.map((p) => p[8] as string);
  assert.ok(dedupeKeys.some((k) => k.includes(":180")));
  assert.ok(dedupeKeys.some((k) => k.includes(":90")));
  assert.ok(dedupeKeys.some((k) => k.includes(":30")));
});

void test("create uses DEFAULT_REMINDER_SCHEDULE when no template exists", async () => {
  const insertedReminders: unknown[][] = [];
  await createReminderScenario({
    onInsertReminder: (params) => {
      insertedReminders.push(params);
    },
  });

  assert.equal(
    insertedReminders.length,
    3,
    "default schedule should produce 3 reminders",
  );
  for (const params of insertedReminders) {
    assert.equal(params[7], "in_app", "default channel should be in_app");
  }
});

void test("create uses DEFAULT_REMINDER_SCHEDULE when template has null blueprint", async () => {
  const insertedReminders: unknown[][] = [];
  await createReminderScenario({
    templateRows: [{ reminder_schedule_blueprint: null }],
    onInsertReminder: (params) => {
      insertedReminders.push(params);
    },
  });

  assert.equal(insertedReminders.length, 3);
});

void test("create uses custom blueprint offsets when template provides them", async () => {
  const customBlueprint = [
    {
      daysBefore: 365,
      channel: "in_app",
      recipientType: "owner",
      label: "1年前",
    },
    {
      daysBefore: 14,
      channel: "in_app",
      recipientType: "owner",
      label: "2週間前",
    },
  ];
  const insertedReminders: unknown[][] = [];
  await createReminderScenario({
    templateRows: [{ reminder_schedule_blueprint: customBlueprint }],
    onInsertReminder: (params) => {
      insertedReminders.push(params);
    },
  });

  assert.equal(insertedReminders.length, 2, "custom blueprint has 2 items");
  const dedupeKeys = insertedReminders.map((p) => p[8] as string);
  assert.ok(dedupeKeys.some((k) => k.includes(":365")));
  assert.ok(dedupeKeys.some((k) => k.includes(":14")));
});

void test("channel value written to DB matches blueprint item channel", async () => {
  const insertedReminders: unknown[][] = [];
  await createReminderScenario({
    templateRows: [
      { reminder_schedule_blueprint: BMV_REMINDER_SCHEDULE_BLUEPRINT },
    ],
    onInsertReminder: (params) => {
      insertedReminders.push(params);
    },
  });

  for (const params of insertedReminders) {
    assert.equal(
      params[7],
      "in_app",
      "reminders.channel must satisfy chk_reminders_channel (in_app)",
    );
  }
});

void test("payload_snapshot includes residencePeriodId, validUntil, daysBefore, statusOfResidence", async () => {
  const insertedPayloads: Record<string, unknown>[] = [];
  await createReminderScenario({
    onInsertReminder: (params) => {
      const raw = params[9] as string;
      insertedPayloads.push(JSON.parse(raw) as Record<string, unknown>);
    },
  });

  assert.equal(insertedPayloads.length, 3);
  for (const payload of insertedPayloads) {
    assert.equal(payload.residencePeriodId, PERIOD_ID);
    assert.equal(payload.validUntil, "2027-01-01");
    assert.equal(payload.statusOfResidence, "経営・管理");
    assert.equal(typeof payload.daysBefore, "number");
  }
});

void test("fetchReminderBlueprint resolves alias case_type_code (family → dependent_visa) to template", async () => {
  const customBlueprint = [
    {
      daysBefore: 60,
      channel: "in_app",
      recipientType: "owner",
      label: "60日前",
    },
  ];
  const insertedReminders: unknown[][] = [];

  const svc = createService((sql, params) => {
    if (sql.includes("case_type_code") && sql.includes("from cases")) {
      return Promise.resolve({
        rows: [{ case_type_code: "family" }],
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
      return Promise.resolve({ rows: [makeResidencePeriodRow()], rowCount: 1 });
    }
    if (sql.includes("from case_templates")) {
      return Promise.resolve({
        rows: [{ reminder_schedule_blueprint: customBlueprint }],
        rowCount: 1,
      });
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
      insertedReminders.push(params ?? []);
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

  await svc.create(makeCtx(), CREATE_INPUT);

  assert.equal(
    insertedReminders.length,
    1,
    "alias case_type_code should resolve to template with 1 blueprint item",
  );
  const dedupeKey = insertedReminders[0]?.[8] as string;
  assert.ok(
    dedupeKey.includes(":60"),
    "should use custom 60-day offset from alias-resolved template",
  );
});
