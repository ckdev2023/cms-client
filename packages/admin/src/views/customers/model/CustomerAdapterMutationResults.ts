import type { CustomerBmvProfile } from "../types-bmv";
import { adaptBmvProfile } from "./CustomerAdapterMappers";
import { readCustomerBmvProfile } from "./CustomerAdapterReaders";
import { asRecord, readStringField } from "./CustomerAdapterShared";

/**
 * 解析新增/更新接口返回的主键结果。
 *
 * @param value - 变更接口响应体
 * @returns 成功时返回主键对象，失败时返回 `null`
 */
export function adaptCustomerMutationResult(
  value: unknown,
): { id: string } | null {
  const record = asRecord(value);
  const id = record ? readStringField(record, "id") : null;
  return id ? { id } : null;
}

/**
 * 解析 BMV 动作接口返回的客户主键与档案结果。
 *
 * @param value - BMV 动作接口响应体
 * @returns 成功时返回主键与 BMV 档案，失败时返回 `null`
 */
export function adaptCustomerBmvActionResult(
  value: unknown,
): { id: string; bmvProfile: CustomerBmvProfile | null } | null {
  const record = asRecord(value);
  const id = record ? readStringField(record, "id") : null;
  if (!id || !record) return null;

  return { id, bmvProfile: adaptBmvProfile(readCustomerBmvProfile(record)) };
}
