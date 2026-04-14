import { ref, computed, type Ref } from "vue";
import type { CustomerRelation } from "../types";
import { SAMPLE_RELATIONS_BY_CUSTOMER } from "../fixtures";

function matchesSearch(r: CustomerRelation, query: string): boolean {
  const haystack = [r.name, r.kana, r.phone, r.email, r.tags.join(" "), r.note]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

/**
 * 关联人 Tab 的状态编排：搜索、选择与列表。
 *
 * @param customerId 路由传入的客户 ID（响应式）
 * @returns 搜索、选择状态与关联人列表
 */
export function useCustomerContactsModel(customerId: Ref<string>) {
  const searchQuery = ref("");
  const selectedIds = ref<Record<string, boolean>>({});

  const allRelations = computed<CustomerRelation[]>(
    () => SAMPLE_RELATIONS_BY_CUSTOMER[customerId.value] ?? [],
  );

  const filteredRelations = computed<CustomerRelation[]>(() => {
    const query = searchQuery.value.trim().toLowerCase();
    if (!query) return allRelations.value;
    return allRelations.value.filter((r) => matchesSearch(r, query));
  });

  const selectedCount = computed(
    () => filteredRelations.value.filter((r) => selectedIds.value[r.id]).length,
  );
  const isAllSelected = computed(
    () =>
      filteredRelations.value.length > 0 &&
      selectedCount.value === filteredRelations.value.length,
  );
  const isIndeterminate = computed(
    () => selectedCount.value > 0 && !isAllSelected.value,
  );
  const hasSelection = computed(() => selectedCount.value > 0);

  function toggleSelectAll(): void {
    const next = !isAllSelected.value;
    const nextMap: Record<string, boolean> = {};
    for (const r of filteredRelations.value) nextMap[r.id] = next;
    selectedIds.value = nextMap;
  }

  function toggleSelect(id: string): void {
    selectedIds.value = { ...selectedIds.value, [id]: !selectedIds.value[id] };
  }

  function setSearch(query: string): void {
    searchQuery.value = query;
  }

  return {
    searchQuery,
    selectedIds,
    allRelations,
    filteredRelations,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    hasSelection,
    toggleSelectAll,
    toggleSelect,
    setSearch,
  };
}
