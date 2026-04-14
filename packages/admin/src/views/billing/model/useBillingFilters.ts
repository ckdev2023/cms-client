import { ref, computed } from "vue";
import type {
  BillingSegment,
  BillingStatusFilter,
  BillingGroupFilter,
  BillingOwnerFilter,
  CaseBillingRow,
  SelectOption,
} from "../types";

/**
 * 筛选 composable 依赖——外部注入的下拉选项列表。
 */
export interface UseBillingFiltersDeps {
  /**
   * 回款状态选项。
   */
  statusOptions: SelectOption[];
  /**
   * Group 选项。
   */
  groupOptions: SelectOption[];
  /**
   * 负责人选项。
   */
  ownerOptions: SelectOption[];
}

/**
 * 收费列表筛选与分段视图状态管理。
 *
 * @param deps - 筛选器依赖的下拉选项
 * @returns 筛选状态、分段、重置方法与过滤函数
 */
export function useBillingFilters(deps: UseBillingFiltersDeps) {
  const segment = ref<BillingSegment>("billing-list");
  const statusFilter = ref<BillingStatusFilter>("");
  const groupFilter = ref<BillingGroupFilter>("");
  const ownerFilter = ref<BillingOwnerFilter>("");
  const search = ref("");

  const isFilterActive = computed(
    () =>
      statusFilter.value !== "" ||
      groupFilter.value !== "" ||
      ownerFilter.value !== "" ||
      search.value !== "",
  );

  function resetFilters() {
    statusFilter.value = "";
    groupFilter.value = "";
    ownerFilter.value = "";
    search.value = "";
  }

  function switchSegment(next: BillingSegment) {
    segment.value = next;
  }

  function applyFilters(rows: CaseBillingRow[]): CaseBillingRow[] {
    return rows.filter((row) => {
      if (statusFilter.value && row.status !== statusFilter.value) return false;
      if (groupFilter.value && row.group !== groupFilter.value) return false;
      if (ownerFilter.value && row.owner !== ownerFilter.value) return false;
      if (search.value) {
        const q = search.value.toLowerCase();
        const haystack = [row.caseName, row.client.name, row.caseNo]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }

  return {
    statusOptions: deps.statusOptions,
    groupOptions: deps.groupOptions,
    ownerOptions: deps.ownerOptions,
    segment,
    statusFilter,
    groupFilter,
    ownerFilter,
    search,
    isFilterActive,
    resetFilters,
    switchSegment,
    applyFilters,
  };
}
