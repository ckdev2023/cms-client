import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";
import { ConflictException } from "@nestjs/common";

import { MessagesService } from "./messages.service";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_MSG_ROW = {
  id: "msg-1",
  conversation_id: "conv-1",
  org_id: null,
  sender_type: "app_user",
  sender_id: "au-1",
  original_language: "zh",
  original_text: "你好",
  translated_text_ja: null,
  translated_text_zh: null,
  translated_text_en: null,
  translation_status: "pending",
  created_at: "2026-01-01T00:00:00.000Z",
};

type EnqueueCall = { queueName: string; job: unknown };

function makeMockRedis() {
  const enqueueCalls: EnqueueCall[] = [];
  const client = {
    isOpen: true,
    rPush: (key: string, value: string) => {
      enqueueCalls.push({ queueName: key, job: JSON.parse(value) as unknown });
      return Promise.resolve(1);
    },
    connect: () => Promise.resolve(),
  };
  return { client, enqueueCalls };
}

function createService(poolFn: QueryFn) {
  const pool = makePool(poolFn);
  const { client, enqueueCalls } = makeMockRedis();
  const svc = new (MessagesService as unknown as new (
    pool: Pool,
    redis: unknown,
  ) => MessagesService)(pool, client);
  return { svc, enqueueCalls };
}

// ── send ──

void test("MessagesService.send inserts message with pending translationStatus", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc, enqueueCalls } = createService((sql, params) => {
    calls.push({ sql, params });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  const result = await svc.send({
    conversationId: "conv-1",
    senderType: "app_user",
    senderId: "au-1",
    originalLanguage: "zh",
    originalText: "你好",
  });

  assert.equal(result.translationStatus, "pending");
  assert.equal(result.originalText, "你好");
  assert.ok(calls.some((c) => c.sql.includes("insert into messages")));
  assert.equal(enqueueCalls.length, 1);
  assert.equal(enqueueCalls[0].queueName, "queue:translation_jobs");
});

void test("MessagesService.send enqueues translation_job excluding originalLanguage", async () => {
  const { svc, enqueueCalls } = createService(() =>
    Promise.resolve({ rows: [SAMPLE_MSG_ROW] }),
  );

  await svc.send({
    conversationId: "conv-1",
    senderType: "app_user",
    senderId: "au-1",
    originalLanguage: "zh",
    originalText: "你好",
  });

  const job = enqueueCalls[0].job as { payload: { targetLanguages: string[] } };
  assert.ok(!job.payload.targetLanguages.includes("zh"));
  assert.ok(job.payload.targetLanguages.includes("ja"));
  assert.ok(job.payload.targetLanguages.includes("en"));
});

// ── get ──

void test("MessagesService.get returns message", async () => {
  const { svc } = createService(() =>
    Promise.resolve({ rows: [SAMPLE_MSG_ROW] }),
  );
  const result = await svc.get("msg-1");
  assert.ok(result);
  assert.equal(result.id, "msg-1");
});

// ── list ──

void test("MessagesService.list filters by conversationId", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  const result = await svc.list({ conversationId: "conv-1" });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
  assert.ok(calls.some((c) => c.params?.includes("conv-1")));
});

// ── send: closed conversation → 409 ──

void test("MessagesService.send throws ConflictException when conversation is closed", async () => {
  const { svc } = createService((sql) => {
    if (sql.includes("select status from conversations"))
      return Promise.resolve({ rows: [{ status: "closed" }] });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  await assert.rejects(
    () =>
      svc.send({
        conversationId: "conv-closed",
        senderType: "app_user",
        senderId: "au-1",
        originalLanguage: "zh",
        originalText: "hello",
      }),
    (err: unknown) => {
      assert.ok(err instanceof ConflictException);
      return true;
    },
  );
});

void test("MessagesService.send succeeds when conversation is open", async () => {
  const { svc } = createService((sql) => {
    if (sql.includes("select status from conversations"))
      return Promise.resolve({ rows: [{ status: "open" }] });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  const result = await svc.send({
    conversationId: "conv-1",
    senderType: "app_user",
    senderId: "au-1",
    originalLanguage: "zh",
    originalText: "hello",
  });
  assert.equal(result.id, "msg-1");
});

void test("MessagesService.send throws when conversation not found", async () => {
  const { svc } = createService((sql) => {
    if (sql.includes("select status from conversations"))
      return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  await assert.rejects(
    () =>
      svc.send({
        conversationId: "conv-missing",
        senderType: "app_user",
        senderId: "au-1",
        originalLanguage: "zh",
        originalText: "hello",
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("Conversation not found"));
      return true;
    },
  );
});

// ── list: markReadFor clears unread_count_user ──

void test("MessagesService.list clears unread_count_user when markReadFor=user", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    if (sql.includes("update conversations"))
      return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  await svc.list({ conversationId: "conv-1", markReadFor: "user" });

  const updateCall = calls.find((c) => c.sql.includes("update conversations"));
  assert.ok(updateCall, "should issue UPDATE to clear unread_count_user");
  assert.ok(updateCall.sql.includes("unread_count_user = 0"));
  assert.ok(!updateCall.sql.includes("unread_count_staff"));
  assert.deepEqual(updateCall.params, ["conv-1"]);
});

void test("MessagesService.list does not clear any unread count when markReadFor is omitted", async () => {
  const calls: { sql: string; params?: unknown[] }[] = [];
  const { svc } = createService((sql, params) => {
    calls.push({ sql, params });
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "1" }] });
    return Promise.resolve({ rows: [SAMPLE_MSG_ROW] });
  });

  await svc.list({ conversationId: "conv-1" });

  const updateCall = calls.find((c) => c.sql.includes("update conversations"));
  assert.equal(
    updateCall,
    undefined,
    "should NOT issue UPDATE when markReadFor is omitted",
  );
});
