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
export function normalizeObject(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

