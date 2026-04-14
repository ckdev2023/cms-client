import { ref, computed } from "vue";
import type { DocumentListItem } from "../types";
import { isSelectableForBatch } from "../validation";

type SelectableItem = Pick<DocumentListItem, "id" | "status">;

function isRowSelectable(item: Pick<DocumentListItem, "status">): boolean {
  return isSelectableForBatch(item.status);
}

function getSelectableFromList(
  items: readonly SelectableItem[],
): SelectableItem[] {
  return items.filter((item) => isRowSelectable(item));
}

/**
 * 资料列表行选择状态管理。
 *
 * approved/waived 行不可选；其余状态（pending/uploaded_reviewing/rejected/expired）可参与批量操作。
 *
 * @returns 选择状态与操作方法
 */
export function useDocumentSelection() {
  const selectedIds = ref<Set<string>>(new Set());
  const selectedCount = computed(() => selectedIds.value.size);

  function toggleAll(items: readonly SelectableItem[], checked: boolean) {
    selectedIds.value = checked
      ? new Set(getSelectableFromList(items).map((r) => r.id))
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

  function isAllSelected(items: readonly SelectableItem[]): boolean {
    const selectable = getSelectableFromList(items);
    return (
      selectable.length > 0 &&
      selectable.every((r) => selectedIds.value.has(r.id))
    );
  }

  function isIndeterminate(items: readonly SelectableItem[]): boolean {
    const selectable = getSelectableFromList(items);
    const count = selectable.filter((r) => selectedIds.value.has(r.id)).length;
    return count > 0 && count < selectable.length;
  }

  return {
    selectedIds,
    selectedCount,
    isRowSelectable,
    getSelectableFromList,
    toggleAll,
    toggleRow,
    clearSelection,
    isAllSelected,
    isIndeterminate,
  };
}
