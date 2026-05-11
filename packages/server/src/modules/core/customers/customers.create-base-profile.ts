import { mergeLocalizedNamesIntoProfile } from "./customers.localized-names";
import type { CustomerLocalizedNames } from "./customers.types";
import {
  applyDefaultCustomerOwnerIfMissing,
  validateBaseProfile,
} from "./customers.utils";

/**
 * 合并多语言名、补全默认负责人并校验，供 {@link CustomersService#create} 使用。
 *
 * @param type - 客户类型
 * @param baseProfile - 请求体 baseProfile
 * @param localizedNames - 可选多语言名称输入
 * @param actingUserId - 当前用户 ID（无显式负责人时写入为 owner）
 * @returns 校验通过后的 baseProfile（JSONB 持久化形态）
 */
export function buildValidatedNewCustomerBaseProfile(
  type: string,
  baseProfile: Record<string, unknown>,
  localizedNames: CustomerLocalizedNames | undefined,
  actingUserId: string,
): Record<string, unknown> {
  return validateBaseProfile(
    type,
    applyDefaultCustomerOwnerIfMissing(
      mergeLocalizedNamesIntoProfile(baseProfile, localizedNames),
      actingUserId,
    ),
  );
}
