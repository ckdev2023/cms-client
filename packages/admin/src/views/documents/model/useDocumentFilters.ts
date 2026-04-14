import { ref, computed } from "vue";
import type {
  DocumentListItem,
  DocumentProviderFilter,
  DocumentStatusFilter,
} from "../types";
import { sortDocumentsByDefault } from "../fixtures";

function matchesStatus(
  item: DocumentListItem,
  status: DocumentStatusFilter,
): boolean {
  if (!status) return true;
  if (status === "missing")
    return item.status === "pending" || item.status === "rejected";
  return item.status === status;
}

function matchesSearch(item: DocumentListItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    item.caseId.toLowerCase().includes(q) ||
    item.caseName.toLowerCase().includes(q)
  );
}

/**
 * 资料列表筛选/搜索/排序状态管理。
 *
 * @returns 筛选状态 refs、派生 computed、重置与过滤函数
 */
export function useDocumentFilters() {
  const status = ref<DocumentStatusFilter>("");
  const caseId = ref("");
  const provider = ref<DocumentProviderFilter>("");
  const search = ref("");

  const isFilterActive = computed(
    () =>
      status.value !== "" ||
      caseId.value !== "" ||
      provider.value !== "" ||
      search.value !== "",
  );

  function resetFilters() {
    status.value = "";
    caseId.value = "";
    provider.value = "";
    search.value = "";
  }

  function applyFilters(
    items: readonly DocumentListItem[],
  ): DocumentListItem[] {
    let result = [...items];

    if (status.value) {
      result = result.filter((d) => matchesStatus(d, status.value));
    }
    if (caseId.value) {
      const id = caseId.value;
      result = result.filter((d) => d.caseId === id);
    }
    if (provider.value) {
      const p = provider.value;
      result = result.filter((d) => d.provider === p);
    }
    if (search.value) {
      result = result.filter((d) => matchesSearch(d, search.value));
    }

    return sortDocumentsByDefault(result);
  }

  return {
    status,
    caseId,
    provider,
    search,
    isFilterActive,
    resetFilters,
    applyFilters,
  };
}
