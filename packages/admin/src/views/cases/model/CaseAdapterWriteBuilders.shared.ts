import type {
  CaseBillingRiskAckInput,
  CaseCreateInput,
  CasePostApprovalInput,
  CaseTransitionInput,
  CaseWorkflowStepTransitionInput,
} from "./CaseAdapterTypes";

/** 写侧 builder 公共输入类型。 */
export type SharedWriteBuilderInput =
  | CaseCreateInput
  | CaseTransitionInput
  | CaseBillingRiskAckInput
  | CasePostApprovalInput
  | CaseWorkflowStepTransitionInput
  | Record<string, unknown>;

/**
 * 删除对象中的 `undefined` 字段，保留 `null` 与其他可序列化值。
 *
 * @param obj - 待清理的 payload
 * @returns 去除 `undefined` 后的新对象
 */
export function omitUndefined(
  obj: SharedWriteBuilderInput,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/**
 * 归一化可空字符串：`""` / 纯空白 → `null`，非空字符串 → trim。
 * 与 `CaseAdapterShared.readNullableString`（读取侧）对称。
 *
 * @param value - 原始字符串、`null` 或 `undefined`
 * @returns 归一化后的字符串、`null` 或 `undefined`
 */
export function normalizeNullableString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 归一化可选非空字符串：`""` / 纯空白 → `undefined`（省略），非空 → trim。
 *
 * @param value - 原始字符串或 `undefined`
 * @returns 归一化后的字符串或 `undefined`
 */
export function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * 将 UI 金额字符串解析为数值。
 * 忽略千位逗号；空值或无法解析的值返回 `undefined`（builder 层省略该字段）。
 *
 * @param amount - UI 表单中的金额文本
 * @returns 有限数值或 `undefined`
 */
export function parseQuotePrice(amount: string): number | undefined {
  if (!amount) return undefined;
  const cleaned = amount.replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}
