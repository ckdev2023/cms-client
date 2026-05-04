import { test } from "node:test";
import assert from "node:assert/strict";
import { handleReminderJob } from "./reminderJobHandler";
/* ------------------------------------------------------------------ */
/*  常量                                                               */
/* ------------------------------------------------------------------ */
const ORG_ID = "00000000-0000-4000-8000-000000000000";
function makeJob(orgId = ORG_ID) {
  return {
    id: "job-1",
    name: "reminder_scan",
    payload: { orgId },
    createdAt: "2026-04-06T00:00:00.000Z",
  };
}
function makePool(queryFn) {
  return {
    connect: () =>
      Promise.resolve({ query: queryFn, release: () => undefined }),
  };
}
function makeReminderRow(overrides = {}) {
  return {
    id: "rem-1",
    org_id: ORG_ID,
    case_id: "case-1",
    target_type: "case",
    target_id: "case-1",
    remind_at: "2026-03-01T00:00:00.000Z",
    send_status: "pending",
    recipient_type: "user",
    recipient_id: null,
    channel: "in_app",
    dedupe_key: null,
    retry_count: 0,
    sent_at: null,
    payload_snapshot: { note: "follow up" },
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function makeMockQueue() {
  const enqueueCalls = [];
  const queue = {
    enqueue: (queueName, job) => {
      enqueueCalls.push({ queueName, job });
      return Promise.resolve();
    },
  };
  return { queue, enqueueCalls };
}
/* ------------------------------------------------------------------ */
/*  正常路径                                                           */
/* ------------------------------------------------------------------ */
void test("processes due pending reminders: enqueues notification, updates status, writes timeline", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  // 验证入队 notification_job
  assert.equal(enqueueCalls.length, 1);
  assert.equal(enqueueCalls[0]?.queueName, "notification_jobs");
  const notifPayload = (enqueueCalls[0]?.job).payload;
  assert.equal(notifPayload.orgId, ORG_ID);
  assert.equal(notifPayload.channel, "in_app");
  assert.equal(notifPayload.targetType, "case");
  assert.equal(notifPayload.targetId, "case-1");
  // 验证 status 更新
  const updateCall = calls.find(
    (c) =>
      c.sql.includes("update reminders") &&
      c.sql.includes("send_status = 'sent'"),
  );
  assert.ok(updateCall, "should update reminder status to sent");
  assert.equal(updateCall.params?.[0], "rem-1");
  // 验证 timeline 写入
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall, "should write timeline");
  const tlParams = timelineCall.params ?? [];
  assert.equal(tlParams[0], ORG_ID);
  assert.equal(tlParams[1], "reminder");
  assert.equal(tlParams[2], "rem-1");
  assert.equal(tlParams[3], "reminder.sent");
});
/* ------------------------------------------------------------------ */
/*  空结果 — 无到期 reminder                                           */
/* ------------------------------------------------------------------ */
void test("completes normally when no due reminders", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from reminders")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  assert.equal(enqueueCalls.length, 0, "no notification should be enqueued");
});
/* ------------------------------------------------------------------ */
/*  幂等性 — 已 sent 的 reminder 跳过                                  */
/* ------------------------------------------------------------------ */
void test("skips reminders already marked as sent", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders")) {
      return Promise.resolve({
        rows: [makeReminderRow({ send_status: "sent" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  assert.equal(
    enqueueCalls.length,
    0,
    "sent reminder should not generate notification",
  );
  const updateCall = calls.find((c) => c.sql.includes("update reminders"));
  assert.equal(
    updateCall,
    undefined,
    "should not update already sent reminder",
  );
});
/* ------------------------------------------------------------------ */
/*  幂等性 — cancelled 的 reminder 跳过                                */
/* ------------------------------------------------------------------ */
void test("skips reminders with cancelled status", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from reminders")) {
      return Promise.resolve({
        rows: [makeReminderRow({ send_status: "cancelled" })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  assert.equal(enqueueCalls.length, 0, "cancelled reminder should be skipped");
});
/* ------------------------------------------------------------------ */
/*  批量处理 — 多条 reminder                                           */
/* ------------------------------------------------------------------ */
void test("processes multiple due reminders in single batch", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({
        rows: [
          makeReminderRow({ id: "rem-1", target_id: "case-1" }),
          makeReminderRow({ id: "rem-2", target_id: "case-2" }),
          makeReminderRow({ id: "rem-3", target_id: "case-3" }),
        ],
        rowCount: 3,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  assert.equal(enqueueCalls.length, 3, "should enqueue 3 notifications");
  const targetIds = enqueueCalls.map((c) => c.job.payload.targetId);
  assert.deepEqual(targetIds, ["case-1", "case-2", "case-3"]);
});
/* ------------------------------------------------------------------ */
/*  错误隔离 — 单条失败不影响批次                                       */
/* ------------------------------------------------------------------ */
void test("isolates errors: one reminder failure does not block others", async () => {
  let updateCount = 0;
  const pool = makePool((sql) => {
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({
        rows: [
          makeReminderRow({ id: "rem-1" }),
          makeReminderRow({ id: "rem-2" }),
          makeReminderRow({ id: "rem-3" }),
        ],
        rowCount: 3,
      });
    }
    if (sql.includes("update reminders")) {
      updateCount++;
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    if (sql.includes("insert into timeline_logs")) {
      return Promise.resolve({ rows: [], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  // enqueue 在第 2 条时抛错
  let callCount = 0;
  const enqueueCalls = [];
  const queue = {
    enqueue: (queueName, job) => {
      callCount++;
      if (callCount === 2) {
        return Promise.reject(new Error("Redis connection lost"));
      }
      enqueueCalls.push({ queueName, job });
      return Promise.resolve();
    },
  };
  // 不应抛异常
  await handleReminderJob(pool, queue, makeJob());
  // rem-1 和 rem-3 成功，rem-2 失败
  assert.equal(enqueueCalls.length, 2, "2 of 3 should succeed");
  assert.equal(updateCount, 3, "3 updates: 2 sent + 1 failed");
});
/* ------------------------------------------------------------------ */
/*  批量上限 — 查询带 LIMIT                                            */
/* ------------------------------------------------------------------ */
void test("query uses LIMIT to cap batch size", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  const selectCall = calls.find(
    (c) => c.sql.includes("from reminders") && c.sql.includes("limit"),
  );
  assert.ok(selectCall, "query should include LIMIT");
  assert.equal(selectCall.params?.[0], 100, "LIMIT should be 100");
});
/* ------------------------------------------------------------------ */
/*  Tenant 隔离 — 使用 createTenantDb 设置 org_id                      */
/* ------------------------------------------------------------------ */
void test("sets tenant org_id via set_config for RLS isolation", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders")) {
      return Promise.resolve({ rows: [], rowCount: 0 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  const setConfigCall = calls.find((c) =>
    c.sql.includes("set_config('app.org_id'"),
  );
  assert.ok(
    setConfigCall,
    "should set org_id via set_config for tenant isolation",
  );
  assert.equal(setConfigCall.params?.[0], ORG_ID);
});
/* ------------------------------------------------------------------ */
/*  notification payload 结构验证                                      */
/* ------------------------------------------------------------------ */
void test("notification job payload contains correct structure", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({
        rows: [makeReminderRow({ payload_snapshot: { note: "urgent" } })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  assert.equal(enqueueCalls.length, 1);
  const notifJob = enqueueCalls[0]?.job;
  assert.ok(notifJob.id, "notification job should have an id");
  assert.equal(notifJob.name, "reminder_notification");
  assert.ok(notifJob.createdAt, "notification job should have createdAt");
  const p = notifJob.payload;
  assert.equal(p.orgId, ORG_ID);
  assert.equal(p.channel, "in_app");
  assert.equal(typeof p.body, "string");
  assert.ok(p.body.length > 0, "body should not be empty");
  // metadata should include reminderId and merged payload
  const meta = p.metadata;
  assert.equal(meta.reminderId, "rem-1");
  assert.equal(meta.note, "urgent");
});
/* ------------------------------------------------------------------ */
/*  null payload 处理                                                  */
/* ------------------------------------------------------------------ */
void test("handles reminder with null payload gracefully", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({
        rows: [makeReminderRow({ payload_snapshot: null })],
        rowCount: 1,
      });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue, enqueueCalls } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  assert.equal(enqueueCalls.length, 1);
  const meta = (enqueueCalls[0]?.job).payload.metadata;
  assert.equal(meta.reminderId, "rem-1");
});
/* ------------------------------------------------------------------ */
/*  Timeline payload 验证                                              */
/* ------------------------------------------------------------------ */
void test("timeline payload includes targetType, targetId, remindAt", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall);
  const payloadJson = timelineCall.params?.[5];
  const parsed = JSON.parse(payloadJson);
  assert.equal(parsed.targetType, "case");
  assert.equal(parsed.targetId, "case-1");
  assert.equal(parsed.remindAt, "2026-03-01T00:00:00.000Z");
});
/* ------------------------------------------------------------------ */
/*  update 条件 — 只更新 pending 状态                                   */
/* ------------------------------------------------------------------ */
void test("update query includes status = 'pending' guard for idempotency", async () => {
  const calls = [];
  const pool = makePool((sql, params) => {
    calls.push({ sql: sql.trim(), params });
    if (sql.includes("from reminders") && sql.includes("remind_at <= now()")) {
      return Promise.resolve({ rows: [makeReminderRow()], rowCount: 1 });
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });
  const { queue } = makeMockQueue();
  await handleReminderJob(pool, queue, makeJob());
  const updateCall = calls.find((c) => c.sql.includes("update reminders"));
  assert.ok(updateCall);
  assert.ok(
    updateCall.sql.includes("send_status = 'pending'"),
    "update WHERE should include send_status = 'pending' for idempotency",
  );
});
//# sourceMappingURL=reminderJobHandler.test.js.map
