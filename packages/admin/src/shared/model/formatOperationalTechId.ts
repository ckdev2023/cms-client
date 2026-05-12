const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 判断字符串是否为常见 UUID 形态（大小写不敏感，含连字符）。
 *
 * @param id - 待判断的标识字符串
 * @returns 符合 UUID 形态时为 `true`
 */
export function isUuidLikeId(id: string): boolean {
  return UUID_LIKE.test(id.trim());
}

/**
 * 为运营展示可读的技术编号尾缀：UUID 取去连字符后末 8 位；其它长度大于 12 的字符串取末 8 字符。
 * 较短的人工编号（如 SUB-001）返回 `null`，由界面完整展示。
 *
 * @param id - 技术主键或业务编号
 * @returns 可展示的尾缀；无需缩略时返回 `null`
 */
export function techIdSuffixForOps(id: string): string | null {
  const t = id.trim();
  if (!t) return null;
  if (isUuidLikeId(t)) return t.replace(/-/g, "").slice(-8);
  if (t.length > 12) return t.slice(-8);
  return null;
}
