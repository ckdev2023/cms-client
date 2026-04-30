import { ref, computed } from "vue";
import type {
  CustomerScope,
  CustomerSummary,
  CustomerViewerContext,
  SelectOption,
} from "../types";
import { resolveGroupValue } from "../../../shared/model/useGroupOptions";
import { resolveOwnerValue } from "../../../shared/model/useOwnerOptions";

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

function matchesKnownOption(
  selectedValue: string,
  options: SelectOption[],
  currentValue: string,
  resolveValue: (value: string) => string | null,
): boolean {
  if (!selectedValue) return true;
  const known = options.some((option) => option.value === selectedValue);
  return !known || resolveValue(currentValue) === selectedValue;
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

// BUG-155：当客户 owner.name / group 不在静态 catalog 时（如服务端真实
// 用户名 "Local Admin" 或运营导入的自定义分组），`resolveOwnerValue` /
// `resolveGroupValue` 都会返回 `null`；旧实现 `null === null` 让两个
// 完全无关的非 catalog 名互相匹配 → 「我的」摘要卡与 scope=mine 列表
// 计数对不上。这里在两侧都 miss 时回退到 trim 后字面量等值。
function viewerNameEquals(
  customerValue: string,
  viewerValue: string,
  resolve: (value: string) => string | null,
): boolean {
  const customerSlug = resolve(customerValue);
  const viewerSlug = resolve(viewerValue);
  if (customerSlug !== null || viewerSlug !== null) {
    return customerSlug === viewerSlug;
  }
  return customerValue.trim() === viewerValue.trim();
}

function matchesViewerOwner(
  customer: CustomerSummary,
  viewer: CustomerViewerContext,
): boolean {
  return viewerNameEquals(
    customer.owner.name,
    viewer.ownerName,
    resolveOwnerValue,
  );
}

function matchesViewerGroup(
  customer: CustomerSummary,
  viewer: CustomerViewerContext,
): boolean {
  return viewerNameEquals(customer.group, viewer.group, resolveGroupValue);
}

function matchesScope(
  customer: CustomerSummary,
  currentScope: CustomerScope,
  viewer?: CustomerViewerContext,
): boolean {
  if (!viewer) return true;
  if (currentScope === "mine") return matchesViewerOwner(customer, viewer);
  if (currentScope === "group") return matchesViewerGroup(customer, viewer);
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
      if (!viewer || matchesViewerOwner(customer, viewer)) {
        stats.mine += 1;
      }
      if (!viewer || matchesViewerGroup(customer, viewer)) {
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

function matchesDropdownFilters(
  customer: CustomerSummary,
  deps: UseCustomerFiltersDeps,
  groupFilter: string,
  ownerFilter: string,
  activeCasesFilter: string,
): boolean {
  if (
    !matchesKnownOption(
      groupFilter,
      deps.groupOptions,
      customer.group,
      resolveGroupValue,
    )
  ) {
    return false;
  }
  if (
    !matchesKnownOption(
      ownerFilter,
      deps.ownerOptions,
      customer.owner.name,
      resolveOwnerValue,
    )
  ) {
    return false;
  }
  if (activeCasesFilter === "yes" && customer.activeCases === 0) return false;
  if (activeCasesFilter === "no" && customer.activeCases > 0) return false;
  return true;
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

  function applyFilters(
    customers: CustomerSummary[],
    viewer?: CustomerViewerContext,
  ): CustomerSummary[] {
    return customers.filter(
      (c) =>
        matchesScope(c, scope.value, viewer) &&
        (!search.value || matchesSearch(c, search.value)) &&
        matchesDropdownFilters(
          c,
          deps,
          groupFilter.value,
          ownerFilter.value,
          activeCasesFilter.value,
        ),
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
