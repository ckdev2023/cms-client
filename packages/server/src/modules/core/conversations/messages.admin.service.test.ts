import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Pool, QueryResultRow } from "pg";

import type { RedisClient } from "../../../infra/redis/createRedisClient";
import type { RequestContext } from "../tenancy/requestContext";
import type { TimelineService } from "../timeline/timeline.service";
import type { TimelineWriteInput } from "../timeline/timeline.service";
import type { ConversationsAdminService } from "./conversations.admin.service";
import { MessagesAdminService } from "./messages.admin.service";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const CONV_ID = "b1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d";
const MSG_ID = "c2d3e4f5-a6b7-4c8d-9e0f-1a2b3c4d5e6f";
const NOW = "2026-05-01T00:00:00.000Z";

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return { orgId: ORG_ID, userId: USER_ID, role: "staff", ...overrides };
}

function isTxSql(sql: string): boolean {
  return /^(begin|commit|rollback|select set_config)/i.test(sql.trim());
}

type QueryResultLike<T extends QueryResultRow = QueryResultRow> = {
  rows: T[];
  rowCount?: number;
};
type QueryFn = (sql: string, params?: unknown[]) => Promise<QueryResultLike>;

function makePool(queryFn: QueryFn): Pool {
  return {
    connect: () =>
      Promise.resolve({
        query: (sql: string, params?: unknown[]) =>
          isTxSql(sql)
            ? Promise.resolve({ rows: [], rowCount: 0 })
            : queryFn(sql, params),
        release: () => undefined,
      }),
  } as unknown as Pool;
}

function makeRedis(): RedisClient {
  return {
    isOpen: true,
    connect: () => Promise.resolve(),
    rPush: () => Promise.resolve(1),
    lPush: () => Promise.resolve(1),
  } as unknown as RedisClient;
}

function makeConvService(): ConversationsAdminService {
  return {
    clearUnread: () => Promise.resolve(),
  } as unknown as ConversationsAdminService;
}

function makeTimeline(): TimelineService & { calls: TimelineWriteInput[] } {
  const calls: TimelineWriteInput[] = [];
  return {
    calls,
    write: (_ctx: RequestContext, input: TimelineWriteInput) => {
      calls.push(input);
      return Promise.resolve();
    },
    list: () => Promise.resolve([]),
  } as unknown as TimelineService & { calls: TimelineWriteInput[] };
}

function messageRow(overrides?: Record<string, unknown>) {
  return {
    id: MSG_ID,
    conversation_id: CONV_ID,
    org_id: ORG_ID,
    sender_type: "staff",
    sender_id: USER_ID,
    original_language: "ja",
    original_text: "こんにちは",
    translated_text_ja: null,
    translated_text_zh: null,
    translated_text_en: null,
    translation_status: "pending",
    kind: "text",
    visible_scope: "client_visible",
    created_at: NOW,
    ...overrides,
  };
}

void describe("MessagesAdminService — timeline audit", () => {
  void test("send writes conversation.message_sent to timeline", async () => {
    const timeline = makeTimeline();
    const pool = makePool((sql) => {
      if (sql.includes("select id from conversations"))
        return Promise.resolve({ rows: [{ id: CONV_ID }] });
      if (sql.includes("insert into messages"))
        return Promise.resolve({ rows: [messageRow()] });
      return Promise.resolve({ rows: [], rowCount: 1 });
    });
    const svc = new MessagesAdminService(
      pool,
      makeRedis(),
      makeConvService(),
      timeline,
    );
    await svc.send(makeCtx(), CONV_ID, {
      originalLanguage: "ja",
      originalText: "こんにちは",
    });
    assert.equal(timeline.calls.length, 1, "timelineService.write called once");
    const call = timeline.calls[0];
    assert.equal(call.entityType, "conversation");
    assert.equal(call.entityId, CONV_ID);
    assert.equal(call.action, "conversation.message_sent");
    assert.equal(call.payload.messageId, MSG_ID);
    assert.equal(call.payload.senderType, "staff");
    assert.equal(call.payload.kind, "text");
    assert.equal(call.payload.visibleScope, "client_visible");
  });

  void test("retryTranslation writes conversation.message_translation_retried to timeline", async () => {
    const timeline = makeTimeline();
    const failedRow = messageRow({ translation_status: "failed" });
    const retriedRow = messageRow({ translation_status: "pending" });
    let selectCount = 0;
    const pool = makePool((sql) => {
      if (sql.includes("select") && sql.includes("from messages")) {
        selectCount++;
        return Promise.resolve({
          rows: [selectCount === 1 ? failedRow : retriedRow],
        });
      }
      return Promise.resolve({ rows: [], rowCount: 1 });
    });
    const svc = new MessagesAdminService(
      pool,
      makeRedis(),
      makeConvService(),
      timeline,
    );
    await svc.retryTranslation(makeCtx(), CONV_ID, MSG_ID);
    assert.equal(timeline.calls.length, 1, "timelineService.write called once");
    const call = timeline.calls[0];
    assert.equal(call.entityType, "conversation");
    assert.equal(call.entityId, CONV_ID);
    assert.equal(call.action, "conversation.message_translation_retried");
    assert.equal(call.payload.messageId, MSG_ID);
  });
});
