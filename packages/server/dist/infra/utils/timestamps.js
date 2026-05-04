/**
 * 将未知时间值规范化为 API 输出用的 ISO 8601 时间戳。
 *
 * - `Date` / `number` / 可解析时间字符串 -> ISO 字符串
 * - 空值 -> `null`
 * - 无法解析的非空字符串 -> 原样返回（避免读路径因脏数据直接报错）
 * @param value 待规范化的时间值
 * @returns ISO 时间戳、原始非空字符串或 `null`
 */
export function toIsoTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return toValidIsoOrNull(value);
  if (typeof value === "number") return toValidIsoOrNull(new Date(value));
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const normalized = toValidIsoOrNull(new Date(trimmed));
  return normalized ?? trimmed;
}
/**
 * 将未知时间值规范化为 API 输出用的 ISO 8601 时间戳；空值时返回空字符串。
 *
 * @param value 待规范化的时间值
 * @returns ISO 时间戳或空字符串
 */
export function toIsoTimestampString(value) {
  return toIsoTimestampStringOrNull(value) ?? "";
}
function toValidIsoOrNull(value) {
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}
/**
 * 将未知值规范化为 API 输出用的 ISO 8601 日期（`YYYY-MM-DD`）。
 *
 * - 已是 `YYYY-MM-DD` 形式的字符串 -> 取前 10 字符返回
 * - `Date` -> 取 ISO 字符串前 10 字符
 * - 空值 / 无法解析 -> `null`
 * @param value 待规范化的日期值
 * @returns 形如 `YYYY-MM-DD` 的日期字符串或 `null`
 */
export function toIsoDateStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    const iso = toValidIsoOrNull(value);
    return iso ? iso.slice(0, 10) : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    return trimmed.slice(0, 10);
  }
  return null;
}
//# sourceMappingURL=timestamps.js.map
