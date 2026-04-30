/**
 * DB 行の timestamp 値を ISO 文字列へ正規化する共有ヘルパー。
 *
 * pg ドライバは `timestamptz` を `Date` で返すこともあれば
 * `string` のまま返すこともあるため、両方を統一的に扱う。
 */

/**
 * null 許容の timestamp 変換。
 *
 * @param value DB から取得した値
 * @returns ISO 文字列、または null
 */
export function toTimestampStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
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
