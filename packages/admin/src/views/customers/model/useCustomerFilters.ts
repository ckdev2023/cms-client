import { ref, computed } from "vue";
import type {
  CustomerScope,
  CustomerSummary,
  CustomerViewerContext,
  SelectOption,
} from "../types";

/**
 *
 */
export interface UseCustomerFiltersDeps {
  /**
   *
   */
  groupOptions: SelectOption[];
  /**
   *
   */
  ownerOptions: SelectOption[];
}

function matchesSearch(c: CustomerSummary, query: string): boolean {
  const q = query.toLowerCase();
  return (
    c.displayName.toLowerCase().includes(q) ||
    c.legalName.toLowerCase().includes(q) ||
    c.furigana.toLowerCase().includes(q) ||
    c.phone.toLowerCase().includes(q) ||
    c.email.toLowerCase().includes(q)
  );
}

function resolveLabel(
  options: SelectOption[],
  value: string,
): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

function matchesScope(
  customer: CustomerSummary,
  currentScope: CustomerScope,
  viewer?: CustomerViewerContext,
): boolean {
  if (!viewer) return true;
  if (currentScope === "mine") return customer.owner.name === viewer.ownerName;
  if (currentScope === "group") return customer.group === viewer.group;
  return true;
}

/**
 * 根据完整客户集推导概览卡片统计值。
 *
 * @param customers - 当前可用于统计的客户列表
 * @param viewer - 当前查看人的负责人/分组上下文
 * @returns 我的客户、本组客户、有活跃案件、无活跃案件 4 项统计
 */
export function deriveCustomerSummaryStats(
  customers: CustomerSummary[],
  viewer?: CustomerViewerContext,
): Record<"mine" | "group" | "active" | "noActive", number> {
  return customers.reduce(
    (stats, customer) => {
      if (!viewer || customer.owner.name === viewer.ownerName) {
        stats.mine += 1;
      }
      if (!viewer || customer.group === viewer.group) {
        stats.group += 1;
      }
      if (customer.activeCases > 0) {
        stats.active += 1;
      } else {
        stats.noActive += 1;
      }
      return stats;
    },
    { mine: 0, group: 0, active: 0, noActive: 0 },
  );
}

/**
 * 客户列表筛选状态管理。
 *
 * @param deps - 筛选器依赖的下拉选项
 * @returns 筛选状态、重置方法与过滤函数
 */
export function useCustomerFilters(deps: UseCustomerFiltersDeps) {
  const scope = ref<CustomerScope>("mine");
  const search = ref("");
  const groupFilter = ref("");
  const ownerFilter = ref("");
  const activeCasesFilter = ref("");

  const isFilterActive = computed(
    () =>
      search.value !== "" ||
      groupFilter.value !== "" ||
      ownerFilter.value !== "" ||
      activeCasesFilter.value !== "",
  );

  function resetFilters() {
    search.value = "";
    groupFilter.value = "";
    ownerFilter.value = "";
    activeCasesFilter.value = "";
  }

  function matchesDropdowns(c: CustomerSummary): boolean {
    if (groupFilter.value) {
      const label = resolveLabel(deps.groupOptions, groupFilter.value);
      if (label && c.group !== label) return false;
    }
    if (ownerFilter.value) {
      const label = resolveLabel(deps.ownerOptions, ownerFilter.value);
      if (label && c.owner.name !== label) return false;
    }
    if (activeCasesFilter.value === "yes" && c.activeCases === 0) return false;
    if (activeCasesFilter.value === "no" && c.activeCases > 0) return false;
    return true;
  }

  function applyFilters(
    customers: CustomerSummary[],
    viewer?: CustomerViewerContext,
  ): CustomerSummary[] {
    return customers.filter(
      (c) =>
        matchesScope(c, scope.value, viewer) &&
        (!search.value || matchesSearch(c, search.value)) &&
        matchesDropdowns(c),
    );
  }

  return {
    scope,
    search,
    groupFilter,
    ownerFilter,
    activeCasesFilter,
    isFilterActive,
    resetFilters,
    applyFilters,
  };
}
