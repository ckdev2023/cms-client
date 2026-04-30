/**
 * 将日元金额格式化为带 `¥` 前缀和千分位的字符串。
 * 与 `BillingSummaryCards.formatJPY` 保持一致：千分位走 `ja-JP` locale。
 *
 * 入参可以是来自表单的字符串（允许已经带千分位逗号），
 * 或后端返回的 number。空值/非有限数值返回 `""`，
 * 让上层调用方决定 fallback（如 `notSet` 占位符）。
 *
 * @param value - 金额数值或表单字符串
 * @returns 形如 `¥180,000` 的字符串；无效输入返回 `""`
 */
export function formatJpyAmount(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return `¥${value.toLocaleString("ja-JP")}`;
  }
  const trimmed = value.trim();
  if (!trimmed) return "";
  const cleaned = trimmed.replace(/,/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  return `¥${n.toLocaleString("ja-JP")}`;
}
