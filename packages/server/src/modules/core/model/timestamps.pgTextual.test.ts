/**
 * V13 走査回帰：PostgreSQL テキスト形式のタイムスタンプ文字列を ISO 8601 へ正規化する契約。
 *
 * 背景：Drizzle スキーマで `timestamp({ mode: "string" })` を使用している場合、
 * 駆動が以下のような PostgreSQL のテキスト形式を返すことがある：
 *   `"2026-05-08 18:43:06.783546+00"`
 * （T セパレータなし、マイクロ秒、コロンなしのタイムゾーン）。
 *
 * これは API 契約（ISO 8601）に違反し、フロントエンドの `formatDateTime` が
 * 正しく整形できず生文字列が UI に露出する。共通ヘルパーで正規化を担保する。
 */
import test from "node:test";
import assert from "node:assert/strict";

import { requireTimestampString, toTimestampStringOrNull } from "./timestamps";

const PG_TEXTUAL_TZ = "2026-05-08 18:43:06.783546+00";
const PG_TEXTUAL_TZ_HHMM = "2026-05-08 18:43:06.783546+00:00";
const ISO_NORMALIZED = "2026-05-08T18:43:06.783Z";

void test("requireTimestampString: PostgreSQL テキスト形式 (+00) → ISO 8601", () => {
  const result = requireTimestampString(PG_TEXTUAL_TZ, "created_at");
  assert.equal(result, ISO_NORMALIZED);
});

void test("requireTimestampString: PostgreSQL テキスト形式 (+00:00) → ISO 8601", () => {
  const result = requireTimestampString(PG_TEXTUAL_TZ_HHMM, "created_at");
  assert.equal(result, ISO_NORMALIZED);
});

void test("requireTimestampString: 既に ISO 形式の文字列は変更しない（passthrough）", () => {
  const result = requireTimestampString(ISO_NORMALIZED, "created_at");
  assert.equal(result, ISO_NORMALIZED);
});

void test("requireTimestampString: Date インスタンスは toISOString で正規化", () => {
  const result = requireTimestampString(new Date(ISO_NORMALIZED), "created_at");
  assert.equal(result, ISO_NORMALIZED);
});

void test("toTimestampStringOrNull: PostgreSQL テキスト形式 → ISO 8601", () => {
  assert.equal(toTimestampStringOrNull(PG_TEXTUAL_TZ), ISO_NORMALIZED);
});

void test("toTimestampStringOrNull: null/undefined はそのまま null", () => {
  assert.equal(toTimestampStringOrNull(null), null);
  assert.equal(toTimestampStringOrNull(undefined), null);
});

void test("toTimestampStringOrNull: パース不能な文字列はそのまま返す（破壊しない）", () => {
  assert.equal(toTimestampStringOrNull("not-a-date"), "not-a-date");
});
