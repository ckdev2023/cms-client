/**
 * 将 ISO 时间戳格式化为 `HH:mm` 时分字符串。
 *
 * @param iso - ISO 8601 时间戳
 * @param locale - BCP 47 locale（如 `"ja-JP"`、`"zh-CN"`、`"en-US"`）
 * @returns 格式化后的时分字符串；无效输入返回 `""`
 */
export function formatTimeOnly(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}
