import { ref, computed } from "vue";
import type { CaseBillingRow } from "../types";

/**
 * 收费列表行选择状态管理。
 *
 * 仅逾期（overdue）行可被勾选参与批量催款，其余状态 checkbox disabled。
 *
 * @returns 选择状态与操作方法
 */
export function useBillingSelection() {
  const selectedIds = ref<Set<string>>(new Set());

  const selectedCount = computed(() => selectedIds.value.size);

  function isRowSelectable(row: CaseBillingRow): boolean {
    return row.status === "overdue";
  }

  function selectableRows(rows: CaseBillingRow[]): CaseBillingRow[] {
    return rows.filter(isRowSelectable);
  }

  function toggleAll(rows: CaseBillingRow[], checked: boolean) {
    selectedIds.value = checked
      ? new Set(selectableRows(rows).map((r) => r.id))
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

  function isAllSelected(rows: CaseBillingRow[]): boolean {
    const selectable = selectableRows(rows);
    return (
      selectable.length > 0 &&
      selectable.every((r) => selectedIds.value.has(r.id))
    );
  }

  function isIndeterminate(rows: CaseBillingRow[]): boolean {
    const selectable = selectableRows(rows);
    const count = selectable.filter((r) => selectedIds.value.has(r.id)).length;
    return count > 0 && count < selectable.length;
  }

  return {
    selectedIds,
    selectedCount,
    isRowSelectable,
    selectableRows,
    toggleAll,
    toggleRow,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  };
}
