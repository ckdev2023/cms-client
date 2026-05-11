/**
 * 将 ISO 时间戳格式化为当前 locale 的日期时间字符串。
 * 零外部依赖，仅使用 `Date.prototype.toLocaleString`。
 *
 * @param iso - ISO 8601 时间戳
 * @param locale - BCP 47 locale（如 `"ja-JP"`、`"zh-CN"`、`"en-US"`）
 * @returns 格式化后的日期时间；无效输入返回 `""`
 */
export function formatDateTime(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(locale, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * 将 ISO 时间戳格式化为指定 locale 的短日期（年 + 短月名 + 日）。
 *
 * @param iso - ISO 8601 **日期或时间**字符串
 * @param locale - BCP 47 locale（如 `ja-JP`、`zh-CN`、`en-US`）
 * @returns 格式化后的日期；空输入返回 `"—"`；无效日期则回退为原始 `iso`
 */
export function formatLocaleDateShort(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
