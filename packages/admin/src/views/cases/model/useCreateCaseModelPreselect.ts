import type { Ref } from "vue";
import type { CaseCreateCustomerOption } from "../types";

/**
 * 创建一个用于异步预选主申请人的函数。
 *
 * 用于修复 BUG-092：建案向导挂载时下拉客户数据还在 fetch 中，导致
 * `?customerId=...` 无法预选；下拉返回后由视图层 watch 调用本函数补齐预选。
 *
 * 行为：
 *  - 无 customerId / 已被用户改选其他客户 / 列表中找不到匹配项 → 不动作。
 *  - 当前 primary 为 null 或为同 id 的合成版本（来自 URL 默认值）→ 升级为
 *    列表中的真实记录（包含 contact、bmv* 等更完整字段）。
 *  - 一旦完成升级，后续重复调用（dropdown 重新拉取等）不再覆盖。
 *
 * @param sourceId - 来源上下文中的客户 id（即 sourceContext.customerId）
 * @param primaryCustomer - 主申请人 ref
 * @param setPrimary - 主申请人写入器（应触发 syncInheritedGroup）
 * @returns 接受最新下拉列表的预选函数；返回是否实际更新
 */
export function createTryPreselectPrimary(
  sourceId: string | undefined,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  setPrimary: (c: CaseCreateCustomerOption) => void,
) {
  let applied = false;
  return function tryPreselectPrimary(
    customers: readonly CaseCreateCustomerOption[],
  ): boolean {
    if (applied) return false;
    if (!sourceId) return false;
    const current = primaryCustomer.value;
    if (current && current.id !== sourceId) return false;
    const matched = customers.find((c) => c.id === sourceId);
    if (!matched) return false;
    setPrimary(matched);
    applied = true;
    return true;
  };
}
