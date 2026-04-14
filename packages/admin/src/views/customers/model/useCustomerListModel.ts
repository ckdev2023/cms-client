import { computed, reactive, ref } from "vue";
import type {
  CustomerActiveCasesFilter,
  CustomerFiltersState,
  CustomerGroupFilter,
  CustomerOwnerFilter,
  CustomerScope,
  CustomerSummary,
  SelectOption,
} from "../types";
import { GROUP_OPTIONS, OWNER_OPTIONS } from "../fixtures";

const DEFAULT_FILTERS: CustomerFiltersState = {
  scope: "mine",
  search: "",
  group: "",
  owner: "",
  activeCases: "",
};

function resolveOptionLabel(
  options: readonly SelectOption[],
  value: string,
): string | undefined {
  return options.find((o) => o.value === value)?.label;
}

function matchesSearch(c: CustomerSummary, query: string): boolean {
  const q = query.toLowerCase();
  return [c.displayName, c.furigana, c.phone, c.email]
    .join(" ")
    .toLowerCase()
    .includes(q);
}

function matchesGroup(c: CustomerSummary, filterValue: string): boolean {
  if (!filterValue) return true;
  const label = resolveOptionLabel(GROUP_OPTIONS, filterValue);
  return !!label && c.group === label;
}

function matchesOwner(c: CustomerSummary, filterValue: string): boolean {
  if (!filterValue) return true;
  const label = resolveOptionLabel(OWNER_OPTIONS, filterValue);
  return !!label && c.owner.name === label;
}

function matchesActiveCases(c: CustomerSummary, value: string): boolean {
  if (value === "yes") return c.activeCases > 0;
  if (value === "no") return c.activeCases === 0;
  return true;
}

/**
 * 判断单条客户是否满足当前筛选条件。
 *
 * @param customer - 待判断的客户记录
 * @param filters - 当前筛选状态
 * @returns 是否通过所有筛选
 */
export function matchesFilters(
  customer: CustomerSummary,
  filters: CustomerFiltersState,
): boolean {
  if (filters.search && !matchesSearch(customer, filters.search)) return false;
  if (!matchesGroup(customer, filters.group)) return false;
  if (!matchesOwner(customer, filters.owner)) return false;
  return matchesActiveCases(customer, filters.activeCases);
}

function createFilterSetters(filters: CustomerFiltersState) {
  return {
    setScope(scope: CustomerScope) {
      filters.scope = scope;
    },
    setSearch(value: string) {
      filters.search = value;
    },
    setGroup(value: CustomerGroupFilter) {
      filters.group = value;
    },
    setOwner(value: CustomerOwnerFilter) {
      filters.owner = value;
    },
    setActiveCases(value: CustomerActiveCasesFilter) {
      filters.activeCases = value;
    },
  };
}

function createSelectionActions(
  filters: CustomerFiltersState,
  filteredCustomers: { value: CustomerSummary[] },
  selectedIds: { value: Set<string> },
) {
  function clearSelection() {
    selectedIds.value = new Set();
  }

  return {
    resetFilters() {
      Object.assign(filters, { ...DEFAULT_FILTERS });
      clearSelection();
    },
    toggleSelectAll(checked: boolean) {
      const next = new Set(selectedIds.value);
      for (const c of filteredCustomers.value) {
        if (checked) next.add(c.id);
        else next.delete(c.id);
      }
      selectedIds.value = next;
    },
    toggleSelectRow(id: string, checked: boolean) {
      const next = new Set(selectedIds.value);
      if (checked) next.add(id);
      else next.delete(id);
      selectedIds.value = next;
    },
    clearSelection,
  };
}

/**
 * 客户列表页核心 Model：筛选 + 选择。
 *
 * @param allCustomers - 返回完整客户数组的取值函数
 * @returns 筛选状态、过滤结果、选择状态与操作方法
 */
export function useCustomerListModel(allCustomers: () => CustomerSummary[]) {
  const filters = reactive<CustomerFiltersState>({ ...DEFAULT_FILTERS });
  const selectedIds = ref<Set<string>>(new Set());

  const filteredCustomers = computed(() =>
    allCustomers().filter((c) => matchesFilters(c, filters)),
  );

  const rows = () => filteredCustomers.value;

  const isAllSelected = computed(() => {
    const r = rows();
    return r.length > 0 && r.every((c) => selectedIds.value.has(c.id));
  });

  const isIndeterminate = computed(() => {
    const r = rows();
    const count = r.filter((c) => selectedIds.value.has(c.id)).length;
    return count > 0 && count < r.length;
  });

  const selectedCount = computed(
    () => rows().filter((c) => selectedIds.value.has(c.id)).length,
  );

  return {
    filters,
    filteredCustomers,
    selectedIds,
    selectedCount,
    isAllSelected,
    isIndeterminate,
    ...createFilterSetters(filters),
    ...createSelectionActions(filters, filteredCustomers, selectedIds),
  };
}
