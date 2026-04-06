/** 匹配 RFC 4122 v1–v5 UUID 格式（原名 UUID_V4_REGEX 存在误导，已更正）。 */
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * 判断字符串是否为 UUID。
 *
 * @param value 值
 * @returns 是否为 UUID
 */
export function isUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}
