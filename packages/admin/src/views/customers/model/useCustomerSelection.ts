import { ref, computed } from "vue";
import type { CustomerSummary } from "../types";

/**
 * 客户列表行选择状态管理：全选/单选/indeterminate。
 *
 * @returns 选择状态与操作方法
 */
export function useCustomerSelection() {
  const selectedIds = ref<Set<string>>(new Set());

  const selectedCount = computed(() => selectedIds.value.size);

  function toggleAll(customers: CustomerSummary[], checked: boolean) {
    selectedIds.value = checked
      ? new Set(customers.map((c) => c.id))
      : new Set();
  }

  function toggleRow(id: string, checked: boolean) {
    const next = new Set(selectedIds.value);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    selectedIds.value = next;
  }

  function clearSelection() {
    selectedIds.value = new Set();
  }

  function isAllSelected(customers: CustomerSummary[]): boolean {
    return (
      customers.length > 0 &&
      customers.every((c) => selectedIds.value.has(c.id))
    );
  }

  function isIndeterminate(customers: CustomerSummary[]): boolean {
    const count = customers.filter((c) => selectedIds.value.has(c.id)).length;
    return count > 0 && count < customers.length;
  }

  return {
    selectedIds,
    selectedCount,
    toggleAll,
    toggleRow,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  };
}
