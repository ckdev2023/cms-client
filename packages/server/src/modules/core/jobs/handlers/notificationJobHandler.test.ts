import { test } from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import {
  handleNotificationJob,
  type NotificationJobPayload,
} from "./notificationJobHandler";
import type { QueueJob } from "../../../../infra/queue/redisQueue";
import type { NotificationAdapter } from "../../../../infra/notification/notificationAdapter";

/* ------------------------------------------------------------------ */
/*  常量 & 工具                                                        */
/* ------------------------------------------------------------------ */

const ORG_ID = "00000000-0000-4000-8000-000000000000";

function makeJob(
  overrides: Partial<NotificationJobPayload> = {},
): QueueJob<NotificationJobPayload> {
  return {
    id: "job-1",
    name: "notification",
    payload: {
      orgId: ORG_ID,
      channel: "email",
      to: "user@example.com",
      subject: "Test Subject",
      body: "Hello World",
      entityType: "case",
      entityId: "entity-1",
      ...overrides,
    },
    createdAt: "2026-04-06T00:00:00.000Z",
  };
}

type SqlCall = { sql: string; params?: unknown[] };

type PoolClientLike = {
  query: (
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: unknown[]; rowCount: number }>;
  release: () => void;
};

function makePool(queryFn?: PoolClientLike["query"]): {
  pool: Pool;
  calls: SqlCall[];
} {
  const calls: SqlCall[] = [];
  const defaultQueryFn: PoolClientLike["query"] = (sql, params) => {
    calls.push({ sql: sql.trim(), params });
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const pool = {
    connect: () =>
      Promise.resolve({
        query: queryFn
          ? (sql: string, params?: unknown[]) => {
              calls.push({ sql: sql.trim(), params });
              return queryFn(sql, params);
            }
          : defaultQueryFn,
        release: () => undefined,
      }),
  } as unknown as Pool;
  return { pool, calls };
}

type SendCall = { channel: string; to: string; body: string };

function makeAdapter(sendImpl?: NotificationAdapter["send"]): {
  adapter: NotificationAdapter;
  sendCalls: SendCall[];
} {
  const sendCalls: SendCall[] = [];
  const adapter: NotificationAdapter = {
    send:
      sendImpl ??
      ((payload) => {
        sendCalls.push({
          channel: payload.channel,
          to: payload.to,
          body: payload.body,
        });
        return Promise.resolve();
      }),
  };
  return { adapter, sendCalls };
}

/* ------------------------------------------------------------------ */
/*  正常路径 — email 发送 + Timeline 写入                               */
/* ------------------------------------------------------------------ */

void test("sends notification via adapter and writes timeline when entityType+entityId present", async () => {
  const { pool, calls } = makePool();
  const { adapter, sendCalls } = makeAdapter();

  await handleNotificationJob(pool, adapter, makeJob());

  // adapter.send 被调用
  assert.equal(sendCalls.length, 1);
  assert.equal(sendCalls[0]?.channel, "email");
  assert.equal(sendCalls[0]?.to, "user@example.com");
  assert.equal(sendCalls[0]?.body, "Hello World");

  // timeline 写入
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall, "should write timeline");
  const p = timelineCall.params ?? [];
  assert.equal(p[0], ORG_ID);
  assert.equal(p[1], "case");
  assert.equal(p[2], "entity-1");
  assert.equal(p[3], "notification_sent");
  assert.equal(p[4], null, "actor_user_id should be null");

  // payload JSON 包含 channel + to + subject
  const payloadJson = JSON.parse(p[5] as string) as Record<string, unknown>;
  assert.equal(payloadJson.channel, "email");
  assert.equal(payloadJson.to, "user@example.com");
  assert.equal(payloadJson.subject, "Test Subject");
});

/* ------------------------------------------------------------------ */
/*  无 entityType/entityId 时不写 Timeline                             */
/* ------------------------------------------------------------------ */

void test("does NOT write timeline when entityType is missing", async () => {
  const { pool, calls } = makePool();
  const { adapter, sendCalls } = makeAdapter();

  await handleNotificationJob(
    pool,
    adapter,
    makeJob({ entityType: undefined, entityId: undefined }),
  );

  assert.equal(sendCalls.length, 1, "adapter.send should still be called");
  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.equal(timelineCall, undefined, "should NOT write timeline");
});

void test("does NOT write timeline when entityId is missing", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter();

  await handleNotificationJob(
    pool,
    adapter,
    makeJob({ entityType: "case", entityId: undefined }),
  );

  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.equal(
    timelineCall,
    undefined,
    "should NOT write timeline without entityId",
  );
});

/* ------------------------------------------------------------------ */
/*  发送失败 — 异常上抛                                                 */
/* ------------------------------------------------------------------ */

void test("throws when adapter.send fails (lets worker retry)", async () => {
  const { pool } = makePool();
  const { adapter } = makeAdapter(() =>
    Promise.reject(new Error("SMTP connection refused")),
  );

  await assert.rejects(() => handleNotificationJob(pool, adapter, makeJob()), {
    message: "SMTP connection refused",
  });
});

void test("does NOT write timeline when adapter.send fails", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter(() =>
    Promise.reject(new Error("send failed")),
  );

  try {
    await handleNotificationJob(pool, adapter, makeJob());
  } catch {
    // expected
  }

  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.equal(
    timelineCall,
    undefined,
    "should NOT write timeline on send failure",
  );
});

/* ------------------------------------------------------------------ */
/*  各 channel 类型发送                                                 */
/* ------------------------------------------------------------------ */

void test("sends push notification correctly", async () => {
  const { pool } = makePool();
  const { adapter, sendCalls } = makeAdapter();

  await handleNotificationJob(
    pool,
    adapter,
    makeJob({ channel: "push", to: "device-token-123", subject: undefined }),
  );

  assert.equal(sendCalls.length, 1);
  assert.equal(sendCalls[0]?.channel, "push");
  assert.equal(sendCalls[0]?.to, "device-token-123");
});

void test("sends in_app notification correctly", async () => {
  const { pool } = makePool();
  const { adapter, sendCalls } = makeAdapter();

  await handleNotificationJob(
    pool,
    adapter,
    makeJob({ channel: "in_app", to: "user-id-abc" }),
  );

  assert.equal(sendCalls.length, 1);
  assert.equal(sendCalls[0]?.channel, "in_app");
  assert.equal(sendCalls[0]?.to, "user-id-abc");
});

/* ------------------------------------------------------------------ */
/*  payload 字段传递正确性                                              */
/* ------------------------------------------------------------------ */

void test("passes subject to adapter when present", async () => {
  const { pool } = makePool();
  const captured: unknown[] = [];
  const adapter: NotificationAdapter = {
    send: (p) => {
      captured.push(p);
      return Promise.resolve();
    },
  };

  await handleNotificationJob(pool, adapter, makeJob({ subject: "Important" }));

  const sent = captured[0] as Record<string, unknown>;
  assert.equal(sent.subject, "Important");
});

void test("does NOT include subject in adapter payload when undefined", async () => {
  const { pool } = makePool();
  const captured: unknown[] = [];
  const adapter: NotificationAdapter = {
    send: (p) => {
      captured.push(p);
      return Promise.resolve();
    },
  };

  await handleNotificationJob(pool, adapter, makeJob({ subject: undefined }));

  const sent = captured[0] as Record<string, unknown>;
  assert.equal("subject" in sent, false, "subject key should not be present");
});

void test("passes metadata to adapter when present", async () => {
  const { pool } = makePool();
  const captured: unknown[] = [];
  const adapter: NotificationAdapter = {
    send: (p) => {
      captured.push(p);
      return Promise.resolve();
    },
  };

  await handleNotificationJob(
    pool,
    adapter,
    makeJob({ metadata: { priority: "high", ref: 42 } }),
  );

  const sent = captured[0] as Record<string, unknown>;
  const meta = sent.metadata as Record<string, unknown>;
  assert.equal(meta.priority, "high");
  assert.equal(meta.ref, 42);
});

void test("does NOT include metadata in adapter payload when undefined", async () => {
  const { pool } = makePool();
  const captured: unknown[] = [];
  const adapter: NotificationAdapter = {
    send: (p) => {
      captured.push(p);
      return Promise.resolve();
    },
  };

  await handleNotificationJob(pool, adapter, makeJob({ metadata: undefined }));

  const sent = captured[0] as Record<string, unknown>;
  assert.equal("metadata" in sent, false, "metadata key should not be present");
});

/* ------------------------------------------------------------------ */
/*  Tenant 隔离 — createTenantDb 使用正确 orgId                        */
/* ------------------------------------------------------------------ */

void test("sets tenant org_id via set_config for RLS isolation", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter();

  await handleNotificationJob(pool, adapter, makeJob());

  const setConfigCall = calls.find((c) =>
    c.sql.includes("set_config('app.org_id'"),
  );
  assert.ok(setConfigCall, "should set org_id via set_config");
  assert.equal(setConfigCall.params?.[0], ORG_ID);
});

/* ------------------------------------------------------------------ */
/*  Timeline payload 不包含 body（避免敏感数据泄漏）                    */
/* ------------------------------------------------------------------ */

void test("timeline payload does NOT include body content", async () => {
  const { pool, calls } = makePool();
  const { adapter } = makeAdapter();

  await handleNotificationJob(
    pool,
    adapter,
    makeJob({ body: "Sensitive user data here" }),
  );

  const timelineCall = calls.find((c) =>
    c.sql.includes("insert into timeline_logs"),
  );
  assert.ok(timelineCall);
  const payloadJson = JSON.parse(timelineCall.params?.[5] as string) as Record<
    string,
    unknown
  >;
  assert.equal(
    "body" in payloadJson,
    false,
    "timeline payload should NOT contain body to avoid data leakage",
  );
});

/* ------------------------------------------------------------------ */
/*  Timeline 写入失败时异常上抛                                         */
/* ------------------------------------------------------------------ */

void test("throws when timeline write fails", async () => {
  const queryFn: PoolClientLike["query"] = (sql) => {
    if (sql.includes("insert into timeline_logs")) {
      return Promise.reject(new Error("DB write failed"));
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  };
  const { pool } = makePool(queryFn);
  const { adapter } = makeAdapter();

  await assert.rejects(() => handleNotificationJob(pool, adapter, makeJob()), {
    message: "DB write failed",
  });
});

/* ------------------------------------------------------------------ */
/*  空 body — 仍然调用 adapter                                         */
/* ------------------------------------------------------------------ */

void test("sends notification even when body is empty string", async () => {
  const { pool } = makePool();
  const { adapter, sendCalls } = makeAdapter();

  await handleNotificationJob(pool, adapter, makeJob({ body: "" }));

  assert.equal(sendCalls.length, 1);
  assert.equal(sendCalls[0]?.body, "");
});
