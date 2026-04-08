import test from "node:test";
import assert from "node:assert/strict";
import type { Pool } from "pg";

import { ConversationsService } from "./conversations.service";

type QueryFn = (
  sql: string,
  params?: unknown[],
) => Promise<{ rows: unknown[] }>;

function makePool(qf: QueryFn) {
  return { query: qf } as unknown as Pool;
}

const SAMPLE_CONV_ROW = {
  id: "conv-1",
  lead_id: "lead-1",
  app_user_id: "au-1",
  org_id: null,
  channel: "web",
  preferred_language: "ja",
  status: "open",
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

// ── create ──

void test("ConversationsService.create auto-fills preferredLanguage from AppUser", async () => {
  const calls: string[] = [];
  const pool = makePool((sql) => {
    calls.push(sql);
    if (sql.includes("app_users")) {
      return Promise.resolve({ rows: [{ preferred_language: "ja" }] });
    }
    return Promise.resolve({ rows: [SAMPLE_CONV_ROW] });
  });
  const svc = new ConversationsService(pool);
  const result = await svc.create({ appUserId: "au-1", leadId: "lead-1" });
  assert.equal(result.preferredLanguage, "ja");
  assert.ok(calls.some((s) => s.includes("app_users")));
});

void test("ConversationsService.create uses explicit preferredLanguage when provided", async () => {
  const pool = makePool(() =>
    Promise.resolve({
      rows: [{ ...SAMPLE_CONV_ROW, preferred_language: "zh" }],
    }),
  );
  const svc = new ConversationsService(pool);
  const result = await svc.create({
    appUserId: "au-1",
    preferredLanguage: "zh",
  });
  assert.equal(result.preferredLanguage, "zh");
});

// ── get ──

void test("ConversationsService.get returns conversation", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [SAMPLE_CONV_ROW] }));
  const svc = new ConversationsService(pool);
  const result = await svc.get("conv-1");
  assert.ok(result);
  assert.equal(result.id, "conv-1");
});

void test("ConversationsService.get returns null for missing", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new ConversationsService(pool);
  assert.equal(await svc.get("missing"), null);
});

// ── list ──

void test("ConversationsService.list returns items and total", async () => {
  const pool = makePool((sql) => {
    if (sql.includes("count(*)"))
      return Promise.resolve({ rows: [{ count: "2" }] });
    return Promise.resolve({
      rows: [SAMPLE_CONV_ROW, { ...SAMPLE_CONV_ROW, id: "conv-2" }],
    });
  });
  const svc = new ConversationsService(pool);
  const result = await svc.list({ appUserId: "au-1" });
  assert.equal(result.total, 2);
  assert.equal(result.items.length, 2);
});

// ── close ──

void test("ConversationsService.close sets status to closed", async () => {
  const closedRow = { ...SAMPLE_CONV_ROW, status: "closed" };
  const pool = makePool(() => Promise.resolve({ rows: [closedRow] }));
  const svc = new ConversationsService(pool);
  const result = await svc.close("conv-1");
  assert.equal(result.status, "closed");
});

void test("ConversationsService.close throws if not found", async () => {
  const pool = makePool(() => Promise.resolve({ rows: [] }));
  const svc = new ConversationsService(pool);
  await assert.rejects(() => svc.close("missing"), /not found/);
});
