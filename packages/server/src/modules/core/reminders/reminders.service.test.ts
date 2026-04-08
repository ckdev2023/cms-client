import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { RemindersService } from "./reminders.service";
import type { RequestContext } from "../tenancy/requestContext";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const REMINDER_ID = "rem-1";

function makeCtx(
  role: "staff" | "viewer" | "manager" = "staff",
): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role };
}

function makeReminderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: REMINDER_ID,
    org_id: ORG_ID,
    entity_type: "case",
    entity_id: "case-1",
    scheduled_at: "2026-06-01T00:00:00.000Z",
    status: "pending",
    payload: { note: "follow up" },
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

type PoolLike = { connect: () => Promise<PoolClientLike> };

function makePool(queryFn: PoolClientLike["query"]): PoolLike {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
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

function createService(
  pool: PoolLike,
  timeline: ReturnType<typeof makeTimeline>,
) {
  return new RemindersService(
    pool as unknown as Pool,
    timeline.service as never,
  );
}

// ── create ──
void test("RemindersService.create inserts row and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into reminders")) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const reminder = await svc.create(makeCtx(), {
    entityType: "case",
    entityId: "case-1",
    scheduledAt: "2026-06-01T00:00:00.000Z",
    payload: { note: "follow up" },
  });

  assert.equal(reminder.id, REMINDER_ID);
  assert.equal(reminder.status, "pending");
  assert.equal(reminder.entityType, "case");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "reminder.created",
  );
});

// ── get ──
void test("RemindersService.get returns reminder or null", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from reminders") && params?.[0] === REMINDER_ID) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const reminder = await svc.get(makeCtx("viewer"), REMINDER_ID);
  assert.ok(reminder);
  assert.equal(reminder.id, REMINDER_ID);

  const notFound = await svc.get(makeCtx("viewer"), "nonexistent");
  assert.equal(notFound, null);
});

// ── list (no filters) ──
void test("RemindersService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "2" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
  });

  const svc = createService(pool, makeTimeline());
  const result = await svc.list(makeCtx("viewer"));
  assert.equal(result.total, 2);
  assert.equal(result.items.length, 1);
});

// ── list (with filters) ──
void test("RemindersService.list applies status/entityType filters", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("count(*)")) {
      return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
  });

  const svc = createService(pool, makeTimeline());
  await svc.list(makeCtx("viewer"), { status: "pending", entityType: "case" });

  const countCall = calls.find((c) => c.sql.includes("count(*)"));
  assert.ok(countCall);
  assert.ok(countCall.sql.includes("status = $"));
  assert.ok(countCall.sql.includes("entity_type = $"));
});

// ── update ──
void test("RemindersService.update updates and writes timeline", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("update reminders")) {
      return Promise.resolve({
        rows: [makeReminderRow({ scheduled_at: "2026-07-01T00:00:00.000Z" })],
        rowCount: 1,
      });
    }
    if (sql.includes("from reminders") && params?.[0] === REMINDER_ID) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const updated = await svc.update(makeCtx(), REMINDER_ID, {
    scheduledAt: "2026-07-01T00:00:00.000Z",
  });

  assert.equal(updated.scheduledAt, "2026-07-01T00:00:00.000Z");
  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "reminder.updated",
  );
});

// ── update not found ──
void test("RemindersService.update throws when not found", async () => {
  const pool = makePool(() => {
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.update(makeCtx(), "nonexistent", {
        scheduledAt: "2026-07-01T00:00:00.000Z",
      }),
    { name: "NotFoundException" },
  );
});

// ── update not pending ──
void test("RemindersService.update throws when not pending", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from reminders") && params?.[0] === REMINDER_ID) {
      return Promise.resolve({
        rows: [makeReminderRow({ status: "sent" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(
    () =>
      svc.update(makeCtx(), REMINDER_ID, {
        scheduledAt: "2026-07-01T00:00:00.000Z",
      }),
    {
      name: "BadRequestException",
      message: "Only pending reminders can be updated",
    },
  );
});

// ── cancel (delete is soft cancel) ──
void test("RemindersService.cancel sets status to cancelled and writes timeline", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders") && params?.[0] === REMINDER_ID) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    if (sql.includes("update reminders")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await svc.cancel(makeCtx("manager"), REMINDER_ID);

  // Verify it's a status update, not a physical delete
  const updateCall = calls.find((c) => c.sql.includes("update reminders"));
  assert.ok(updateCall);
  assert.ok(updateCall.sql.includes("status = 'cancelled'"));
  assert.ok(!calls.some((c) => c.sql.includes("delete from")));

  assert.equal(timeline.writes.length, 1);
  assert.deepEqual(
    (timeline.writes[0] as Record<string, unknown>).action,
    "reminder.cancelled",
  );
});

// ── cancel not found ──
void test("RemindersService.cancel throws when not found", async () => {
  const pool = makePool(() => {
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(() => svc.cancel(makeCtx("manager"), "nonexistent"), {
    name: "NotFoundException",
  });
});

// ── cancel not pending ──
void test("RemindersService.cancel throws when not pending", async () => {
  const pool = makePool((sql, params) => {
    if (sql.includes("from reminders") && params?.[0] === REMINDER_ID) {
      return Promise.resolve({
        rows: [makeReminderRow({ status: "cancelled" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  await assert.rejects(() => svc.cancel(makeCtx("manager"), REMINDER_ID), {
    name: "BadRequestException",
    message: "Only pending reminders can be cancelled",
  });
});

// ── due ──
void test("RemindersService.due returns pending reminders past scheduled_at and enforces tenant isolation", async () => {
  const calls: { sql: string }[] = [];
  const pool = makePool((sql) => {
    calls.push({ sql: sql.trim() });
    if (sql.includes("scheduled_at <= now()")) {
      return Promise.resolve({
        rows: [makeReminderRow()],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  const svc = createService(pool, makeTimeline());
  const dueReminders = await svc.due(makeCtx("manager"));

  assert.equal(dueReminders.length, 1);
  assert.equal(dueReminders[0]?.id, REMINDER_ID);

  const dueCall = calls.find((c) => c.sql.includes("scheduled_at <= now()"));
  assert.ok(dueCall);
  assert.ok(dueCall.sql.includes("status = 'pending'"));
  assert.ok(calls.some((c) => c.sql.includes("set_config('app.org_id'")));
});
