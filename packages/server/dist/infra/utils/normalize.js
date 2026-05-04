/**
 * 将任意值规范化为 Record<string, unknown>。
 *
 * - null / undefined / 空值 → {}
 * - JSON 字符串 → 解析后若为 object 则返回，否则 {}
 * - plain object → 直接返回
 * - 其他类型 → {}
 *
 * @param value 任意值
 * @returns Record<string, unknown>
 */
export function normalizeObject(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}
//# sourceMappingURL=normalize.js.map
