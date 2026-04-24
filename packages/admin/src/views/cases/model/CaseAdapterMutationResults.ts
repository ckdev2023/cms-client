import type { CaseMutationResult } from "./CaseAdapterTypes";
import { asRecord, readString } from "./CaseAdapterShared";

/**
 * 从写入响应中提取变更结果（id）。
 *
 * @param value - 创建/更新/流转接口返回的原始 JSON
 * @returns 包含 `id` 的变更结果，格式无效时返回 `null`
 */
export function adaptCaseMutationResult(
  value: unknown,
): CaseMutationResult | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  return id ? { id } : null;
}

/**
 * 提取流转结果——委托给变更结果适配器。
 *
 * @param value - 流转接口返回的原始 JSON
 * @returns 包含 `id` 的变更结果，格式无效时返回 `null`
 */
export function adaptCaseTransitionResult(
  value: unknown,
): CaseMutationResult | null {
  return adaptCaseMutationResult(value);
}

/**
 * 适配删除响应——DELETE 不返回实体，只需确认响应体可被解析。
 *
 * @param value - DELETE 接口返回的原始 JSON（通常为 `{ ok: true }` 或空体）
 * @returns 固定的成功标记对象，始终非 `null`
 */
export function adaptDeleteCaseResult(value: unknown): { ok: true } {
  void value;
  return { ok: true };
}
