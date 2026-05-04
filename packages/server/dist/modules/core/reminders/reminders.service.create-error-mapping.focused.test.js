import { test } from "node:test";
import assert from "node:assert/strict";
import { RemindersService } from "./reminders.service";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
function makeCtx() {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff" };
}
function makeReminderRow(overrides = {}) {
  return {
    id: "rem-1",
    org_id: ORG_ID,
    case_id: "case-1",
    target_type: "case",
    target_id: "case-1",
    remind_at: "2026-06-01T00:00:00.000Z",
    recipient_type: "internal_user",
    recipient_id: USER_ID,
    channel: "in_app",
    dedupe_key: null,
    send_status: "pending",
    retry_count: 0,
    sent_at: null,
    payload_snapshot: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function makePool(queryFn) {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
}
function makeTimeline() {
  const writes = [];
  return {
    service: {
      write: (_ctx, input) => {
        writes.push(input);
        return Promise.resolve();
      },
    },
    writes,
  };
}
function createService(pool, timeline) {
  return new RemindersService(pool, timeline.service);
}
const BASE_INPUT = {
  targetType: "case",
  targetId: "case-1",
  remindAt: "2026-06-01T00:00:00.000Z",
};
function makePgError(code, extras = {}) {
  return Object.assign(new Error(`PG ${code}`), { code, ...extras });
}
function rejectOnInsert(err) {
  return (sql) => {
    if (sql.includes("insert into reminders")) return Promise.reject(err);
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
}
// ── FK violation (23503) → REMINDER_REF_NOT_FOUND ──
void test("create: FK violation 23503 → REMINDER_REF_NOT_FOUND", async () => {
  const pool = makePool(rejectOnInsert(makePgError("23503")));
  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await assert.rejects(
    () => svc.create(makeCtx(), BASE_INPUT),
    (err) => {
      const res = err.getResponse();
      assert.equal(res.errorCode, "REMINDER_REF_NOT_FOUND");
      return true;
    },
  );
  assert.equal(timeline.writes.length, 0);
});
// ── NOT NULL violation (23502) → REMINDER_VALIDATION_FAILED ──
void test("create: NOT NULL 23502 → REMINDER_VALIDATION_FAILED with column", async () => {
  const pool = makePool(
    rejectOnInsert(makePgError("23502", { column: "target_type" })),
  );
  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await assert.rejects(
    () => svc.create(makeCtx(), BASE_INPUT),
    (err) => {
      const res = err.getResponse();
      assert.equal(res.errorCode, "REMINDER_VALIDATION_FAILED");
      const detail = res.detail;
      assert.equal(detail.pgCode, "23502");
      assert.equal(detail.column, "target_type");
      return true;
    },
  );
  assert.equal(timeline.writes.length, 0);
});
// ── invalid input format (22P02) → REMINDER_VALIDATION_FAILED ──
void test("create: invalid input 22P02 → REMINDER_VALIDATION_FAILED", async () => {
  const pool = makePool(rejectOnInsert(makePgError("22P02")));
  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await assert.rejects(
    () => svc.create(makeCtx(), { ...BASE_INPUT, targetId: "not-a-uuid" }),
    (err) => {
      const res = err.getResponse();
      assert.equal(res.errorCode, "REMINDER_VALIDATION_FAILED");
      const detail = res.detail;
      assert.equal(detail.pgCode, "22P02");
      assert.equal(detail.column, null);
      return true;
    },
  );
  assert.equal(timeline.writes.length, 0);
});
// ── non-client PG error re-thrown as-is ──
void test("create: non-client PG error (08006) re-thrown unchanged", async () => {
  const pool = makePool(rejectOnInsert(makePgError("08006")));
  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await assert.rejects(
    () => svc.create(makeCtx(), BASE_INPUT),
    (err) => {
      assert.ok(err instanceof Error);
      assert.equal(err.code, "08006");
      return true;
    },
  );
});
// ── success path still works after error-mapping changes ──
void test("create: success path inserts and writes timeline", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("insert into reminders")) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  const reminder = await svc.create(makeCtx(), BASE_INPUT);
  assert.equal(reminder.id, "rem-1");
  assert.equal(reminder.sendStatus, "pending");
  assert.equal(timeline.writes.length, 1);
});
// ── dedupe path still rejects before INSERT ──
void test("create: dedupe_key conflict rejects before INSERT", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from reminders") && sql.includes("dedupe_key")) {
      return Promise.resolve({ rows: [{ id: "existing" }], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const timeline = makeTimeline();
  const svc = createService(pool, timeline);
  await assert.rejects(
    () => svc.create(makeCtx(), { ...BASE_INPUT, dedupeKey: "dup" }),
    { name: "BadRequestException" },
  );
  assert.equal(timeline.writes.length, 0);
});
//# sourceMappingURL=reminders.service.create-error-mapping.focused.test.js.map
