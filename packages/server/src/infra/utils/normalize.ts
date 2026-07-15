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

/**
 * 规范化可选字符串：非字符串或空白串一律视为缺失。
 *
 * 位置沿革：原在 `core/customers/customers.utils.ts`。S5 解 cases ↔ customers
 * 环时，BMV 档案解析链移入共享内核 `core/model/customerBmvProfile.ts`，该文件
 * 须保持叶子属性（不得 import 业务模块），故本函数与 `pickOptionalString`
 * 一并归位到 infra —— 两者都是零领域含义的通用读取器，与 `normalizeObject`
 * 本就同源。
 *
 * @param value 任意输入值
 * @returns 去空白后的非空字符串；否则 `null`
 */
export function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 按字段优先级从 JSONB 记录中取第一个非空字符串。
 *
 * 用于兼容同一语义的 camelCase / snake_case 双写键（如 `signedAt` 与
 * `signed_at`），字段顺序即优先级。
 *
 * @param record JSONB 记录
 * @param fields 候选字段名，按优先级排列
 * @returns 命中的第一个非空字符串；全部缺失时 `null`
 */
export function pickOptionalString(
  record: Record<string, unknown>,
  fields: readonly string[],
): string | null {
  for (const field of fields) {
    const value = normalizeOptionalString(record[field]);
    if (value) return value;
  }
  return null;
}
