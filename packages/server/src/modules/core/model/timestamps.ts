/**
 * DB 行の timestamp 値を ISO 8601 文字列へ正規化する共有ヘルパー。
 *
 * pg ドライバは `timestamptz` を `Date` で返すこともあれば
 * Drizzle の `mode: "string"` 設定下では `string`（PostgreSQL テキスト形式：
 * 例 `"2026-05-08 18:43:06.783546+00"`）のまま返すこともあるため、両方を
 * 統一的に ISO 8601（例 `"2026-05-08T18:43:06.783Z"`）へ正規化する。
 *
 * 既に ISO 形式（`T` セパレータ含み）の文字列はそのまま返す。
 */

function normalizeTimestampString(value: string): string {
  if (value.includes("T")) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString();
}

/**
 * null 許容の timestamp 変換。
 *
 * @param value DB から取得した値
 * @returns ISO 8601 文字列、または null
 */
export function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return normalizeTimestampString(value);
  return null;
}

/**
 * 必須 timestamp 変換。null/undefined なら例外を送出する。
 *
 * @param value DB から取得した値
 * @param field エラーメッセージに含めるフィールド名
 * @returns ISO 文字列
 */
export function requireTimestampString(value: unknown, field: string): string {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}
