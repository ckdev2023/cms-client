import { ref, computed } from "vue";
import type { LeadSummary } from "../types";

/**
 * 线索列表行选择状态管理：全选/单选/indeterminate。
 *
 * @returns 选择状态与操作方法
 */
export function useLeadSelection() {
  const selectedIds = ref<Set<string>>(new Set());

  const selectedCount = computed(() => selectedIds.value.size);

  function toggleAll(leads: LeadSummary[], checked: boolean) {
    selectedIds.value = checked ? new Set(leads.map((l) => l.id)) : new Set();
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

  function isAllSelected(leads: LeadSummary[]): boolean {
    return leads.length > 0 && leads.every((l) => selectedIds.value.has(l.id));
  }

  function isIndeterminate(leads: LeadSummary[]): boolean {
    const count = leads.filter((l) => selectedIds.value.has(l.id)).length;
    return count > 0 && count < leads.length;
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
