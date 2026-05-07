import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { Pool, QueryResultRow } from "pg";

import type { RequestContext } from "../tenancy/requestContext";
import type { TimelineService } from "../timeline/timeline.service";
import { ConversationsAdminService } from "./conversations.admin.service";

// ── Helpers ──

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const USER_ID = "00000000-0000-4000-8000-00000000000a";
const OWNER_ID = "00000000-0000-4000-8000-00000000000b";
const LEAD_ID = "00000000-0000-4000-8000-1ead00000001";
const CUSTOMER_ID = "00000000-0000-4000-8000-c057000000001";
const NOW = "2026-04-27T00:00:00.000Z";

function makeCtx(overrides?: Partial<RequestContext>): RequestContext {
  return {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff",
    ...overrides,
  };
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

function makeTimeline(): TimelineService {
  return {
    write: () => Promise.resolve(),
    list: () => Promise.resolve([]),
  } as unknown as TimelineService;
}

function makeSvc(pool: Pool): ConversationsAdminService {
  return new ConversationsAdminService(pool, makeTimeline());
}

function convListRow(overrides?: Record<string, unknown>) {
  return {
    id: "conv-001",
    lead_id: LEAD_ID,
    app_user_id: "app-user-1",
    org_id: ORG_ID,
    channel: "web",
    preferred_language: "zh",
    status: "open",
    owner_user_id: OWNER_ID,
    last_message_at: NOW,
    unread_count_staff_tenant: 1,
    unread_count_staff_owner: 0,
    unread_count_user: 0,
    customer_id: null,
    case_id: null,
    created_at: NOW,
    updated_at: NOW,
    lead_name: "张三",
    customer_base_profile: null,
    owner_display_name: "田中太郎",
    app_user_name: "AppUser 张三",
    ...overrides,
  };
}

// ── list — join fields ──

void describe("ConversationsAdminService.list — join fields", () => {
  void test("list_returns_joined_owner_and_lead_names", async () => {
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [convListRow()], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    assert.equal(result.total, 1);
    assert.equal(result.items.length, 1);

    const item = result.items[0];
    assert.equal(item.ownerDisplayName, "田中太郎");
    assert.equal(item.ownerLabel, "田中太郎");
    assert.equal(item.leadName, "张三");
    assert.equal(item.appUserName, "AppUser 张三");
  });

  void test("list_returns_customer_label_when_customerId_set", async () => {
    const row = convListRow({
      customer_id: CUSTOMER_ID,
      lead_id: null,
      lead_name: null,
      customer_base_profile: { name: "山田花子" },
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const item = result.items[0];
    assert.equal(item.customerName, "山田花子");
    assert.ok(item.linkedEntity);
    assert.equal(item.linkedEntity.type, "customer");
    assert.equal(item.linkedEntity.label, "山田花子");
    assert.equal(item.linkedEntity.id, CUSTOMER_ID);
  });

  void test("linkedEntity prefers case over customer over lead", async () => {
    const caseId = "00000000-0000-4000-8000-ca5e00000001";
    const row = convListRow({
      customer_id: CUSTOMER_ID,
      case_id: caseId,
      lead_id: LEAD_ID,
      lead_name: "リード名",
      customer_base_profile: { name: "山田" },
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const item = result.items[0];
    assert.ok(item.linkedEntity);
    assert.equal(item.linkedEntity.type, "case");
    assert.equal(item.linkedEntity.id, caseId);
  });

  void test("linkedEntity is lead when no customer/case", async () => {
    const row = convListRow();
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const item = result.items[0];
    assert.ok(item.linkedEntity);
    assert.equal(item.linkedEntity.type, "lead");
    assert.equal(item.linkedEntity.id, LEAD_ID);
    assert.equal(item.linkedEntity.label, "张三");
  });

  void test("linkedEntity is null when no lead/customer/case", async () => {
    const row = convListRow({
      lead_id: null,
      lead_name: null,
      customer_id: null,
      case_id: null,
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const item = result.items[0];
    assert.equal(item.linkedEntity, null);
  });

  void test("ownerLabel is empty when no owner", async () => {
    const row = convListRow({
      owner_user_id: null,
      owner_display_name: null,
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const item = result.items[0];
    assert.equal(item.ownerLabel, "");
    assert.equal(item.ownerDisplayName, null);
  });

  void test("list SQL includes left join for leads, customers, users, app_users", async () => {
    const calls: string[] = [];
    const pool = makePool((sql) => {
      calls.push(sql);
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await makeSvc(pool).list(makeCtx(), {});

    const selectCall = calls.find(
      (s) => s.includes("from conversations c") && !s.includes("count(*)"),
    );
    assert.ok(selectCall, "SELECT query must exist");
    assert.ok(
      selectCall.includes("left join leads l on l.id = c.lead_id"),
      "must join leads",
    );
    assert.ok(
      selectCall.includes("left join customers cu on cu.id = c.customer_id"),
      "must join customers",
    );
    assert.ok(
      selectCall.includes("left join users u on u.id = c.owner_user_id"),
      "must join users",
    );
    assert.ok(
      selectCall.includes("left join app_users au on au.id = c.app_user_id"),
      "must join app_users",
    );
  });

  void test("customer name extracted from base_profile lastName+firstName", async () => {
    const row = convListRow({
      customer_id: CUSTOMER_ID,
      customer_base_profile: { lastName: "田中", firstName: "太郎" },
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    assert.equal(result.items[0].customerName, "田中 太郎");
  });

  void test("customer name extracted from base_profile familyName+givenName", async () => {
    const row = convListRow({
      customer_id: CUSTOMER_ID,
      customer_base_profile: { familyName: "佐藤", givenName: "花子" },
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    assert.equal(result.items[0].customerName, "佐藤 花子");
  });
});

// ── list — lastMessagePreview ──

void describe("ConversationsAdminService.list — lastMessagePreview", () => {
  void test("list_returns_non_empty_lastMessagePreview_when_messages_exist", async () => {
    const row = convListRow({
      lm_original_text: "こんにちは、在留資格について相談したいです",
      lm_sender_role: "app_user",
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const item = result.items[0];
    assert.equal(
      item.lastMessagePreview,
      "客户：こんにちは、在留資格について相談したいです",
    );
  });

  void test("lastMessagePreview uses staff prefix for non-app_user sender", async () => {
    const row = convListRow({
      lm_original_text: "承知しました",
      lm_sender_role: "staff",
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    assert.equal(result.items[0].lastMessagePreview, "事務所：承知しました");
  });

  void test("lastMessagePreview is empty when no messages", async () => {
    const row = convListRow({
      lm_original_text: null,
      lm_sender_role: null,
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    assert.equal(result.items[0].lastMessagePreview, "");
  });

  void test("lastMessagePreview truncates to 60 chars", async () => {
    const longText = "あ".repeat(80);
    const row = convListRow({
      lm_original_text: longText,
      lm_sender_role: "app_user",
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    const preview = result.items[0].lastMessagePreview;
    assert.ok(preview.startsWith("客户："));
    assert.ok(preview.endsWith("…"));
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    const charCount = Array.from(seg.segment(preview)).length;
    assert.ok(charCount <= 3 + 60 + 1);
  });

  void test("lastMessagePreview strips newlines", async () => {
    const row = convListRow({
      lm_original_text: "行一\n行二\r\n行三",
      lm_sender_role: "app_user",
    });
    const pool = makePool((sql) => {
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "1" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [row], rowCount: 1 });
    });

    const result = await makeSvc(pool).list(makeCtx(), {});
    assert.equal(result.items[0].lastMessagePreview, "客户：行一 行二 行三");
  });

  void test("list SQL includes lateral join for messages", async () => {
    const calls: string[] = [];
    const pool = makePool((sql) => {
      calls.push(sql);
      if (sql.includes("count(*)")) {
        return Promise.resolve({ rows: [{ count: "0" }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await makeSvc(pool).list(makeCtx(), {});

    const selectCall = calls.find(
      (s) => s.includes("from conversations c") && !s.includes("count(*)"),
    );
    assert.ok(selectCall, "SELECT query must exist");
    if (!selectCall) return;
    assert.ok(
      selectCall.includes("left join lateral"),
      "must include lateral join",
    );
    assert.ok(
      selectCall.includes("lm_original_text"),
      "must select lm_original_text",
    );
  });
});
