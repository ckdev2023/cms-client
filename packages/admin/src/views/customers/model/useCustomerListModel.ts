import { computed, reactive, ref, watch } from "vue";
import type {
  CustomerActiveCasesFilter,
  CustomerFiltersState,
  CustomerGroupFilter,
  CustomerOwnerFilter,
  CustomerScope,
  CustomerSummary,
} from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";
import { useCustomerSelection } from "./useCustomerSelection";

type ListRepository = Pick<
  CustomerRepository,
  "listCustomers" | "bulkAssignOwner" | "bulkChangeGroup"
>;

type UseCustomerListModelInput = {
  repository: ListRepository;
  pageSize?: number;
};

const DEFAULT_FILTERS: CustomerFiltersState = {
  scope: "mine",
  search: "",
  group: "",
  owner: "",
  activeCases: "",
};

const DEFAULT_PAGE_SIZE = 20;

type CustomerListModelErrorCode = "unauthorized" | "requestFailed";

function mapCustomerListError(error: unknown): CustomerListModelErrorCode {
  return error instanceof CustomerRepositoryError &&
    error.code === "UNAUTHORIZED"
    ? "unauthorized"
    : "requestFailed";
}

function keepOnlyVisibleSelections(
  customers: CustomerSummary[],
  selectedIds: Set<string>,
): Set<string> {
  const visibleIds = new Set(customers.map((customer) => customer.id));
  return new Set(
    [...selectedIds].filter((customerId) => visibleIds.has(customerId)),
  );
}

function createListState() {
  return {
    filters: reactive<CustomerFiltersState>({ ...DEFAULT_FILTERS }),
    customers: ref<CustomerSummary[]>([]),
    total: ref(0),
    page: ref(1),
    loading: ref(false),
    errorCode: ref<CustomerListModelErrorCode | null>(null),
    bulkLoading: ref(false),
    bulkErrorCode: ref<CustomerListModelErrorCode | null>(null),
  };
}

function createDerivedState(
  customers: Readonly<{ value: CustomerSummary[] }>,
  total: Readonly<{ value: number }>,
  loading: Readonly<{ value: boolean }>,
  errorCode: Readonly<{ value: CustomerListModelErrorCode | null }>,
  selection: ReturnType<typeof useCustomerSelection>,
  pageSize: number,
) {
  const filteredCustomers = computed(() => customers.value);
  const totalPages = computed(() =>
    total.value > 0 ? Math.ceil(total.value / pageSize) : 1,
  );
  return {
    filteredCustomers,
    totalPages,
    hasData: computed(() => customers.value.length > 0),
    isEmpty: computed(
      () =>
        !loading.value &&
        errorCode.value === null &&
        customers.value.length === 0,
    ),
    isAllSelected: computed(() => selection.isAllSelected(customers.value)),
    isIndeterminate: computed(() => selection.isIndeterminate(customers.value)),
  };
}

function createFilterActions(input: {
  filters: CustomerFiltersState;
  page: { value: number };
  totalPages: Readonly<{ value: number }>;
  clearSelection: () => void;
}) {
  function resetPaging() {
    input.page.value = 1;
    input.clearSelection();
  }

  return {
    setScope(scope: CustomerScope) {
      input.filters.scope = scope;
      resetPaging();
    },
    setSearch(value: string) {
      input.filters.search = value;
      resetPaging();
    },
    setGroup(value: CustomerGroupFilter) {
      input.filters.group = value;
      resetPaging();
    },
    setOwner(value: CustomerOwnerFilter) {
      input.filters.owner = value;
      resetPaging();
    },
    setActiveCases(value: CustomerActiveCasesFilter) {
      input.filters.activeCases = value;
      resetPaging();
    },
    setPage(value: number) {
      input.page.value = Math.min(Math.max(value, 1), input.totalPages.value);
      input.clearSelection();
    },
    resetFilters() {
      Object.assign(input.filters, { ...DEFAULT_FILTERS });
      resetPaging();
    },
  };
}

function createCustomerLoader(input: {
  repository: ListRepository;
  filters: CustomerFiltersState;
  page: { value: number };
  customers: { value: CustomerSummary[] };
  total: { value: number };
  loading: { value: boolean };
  errorCode: { value: CustomerListModelErrorCode | null };
  selectedIds: { value: Set<string> };
  pageSize: number;
  clearSelection: () => void;
}) {
  let requestVersion = 0;

  return async (): Promise<void> => {
    const activeRequest = ++requestVersion;
    input.loading.value = true;
    input.errorCode.value = null;
    try {
      const result = await input.repository.listCustomers({
        scope: input.filters.scope,
        search: input.filters.search,
        group: input.filters.group,
        owner: input.filters.owner,
        activeCases: input.filters.activeCases,
        page: input.page.value,
        limit: input.pageSize,
      });
      if (activeRequest !== requestVersion) return;
      input.customers.value = result.items;
      input.total.value = result.total;
      input.selectedIds.value = keepOnlyVisibleSelections(
        result.items,
        input.selectedIds.value,
      );
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      input.customers.value = [];
      input.total.value = 0;
      input.clearSelection();
      input.errorCode.value = mapCustomerListError(error);
    } finally {
      if (activeRequest === requestVersion) input.loading.value = false;
    }
  };
}

function createBulkActionRunner(input: {
  repository: ListRepository;
  selectedIds: { value: Set<string> };
  bulkLoading: { value: boolean };
  bulkErrorCode: { value: CustomerListModelErrorCode | null };
  clearSelection: () => void;
  reload: () => Promise<void>;
}) {
  async function runBulkMutation(
    action: () => Promise<unknown>,
  ): Promise<number> {
    if (input.bulkLoading.value || input.selectedIds.value.size === 0) return 0;

    input.bulkLoading.value = true;
    input.bulkErrorCode.value = null;
    try {
      await action();
      input.clearSelection();
      await input.reload();
      return 1;
    } catch (error) {
      input.bulkErrorCode.value = mapCustomerListError(error);
      return 0;
    } finally {
      input.bulkLoading.value = false;
    }
  }

  return {
    bulkAssignOwner(ownerId: string): Promise<number> {
      const normalizedOwnerId = ownerId.trim();
      if (!normalizedOwnerId) return Promise.resolve(0);
      return runBulkMutation(() =>
        input.repository.bulkAssignOwner(
          [...input.selectedIds.value],
          normalizedOwnerId,
        ),
      );
    },
    bulkChangeGroup(group: string): Promise<number> {
      const normalizedGroup = group.trim();
      if (!normalizedGroup) return Promise.resolve(0);
      return runBulkMutation(() =>
        input.repository.bulkChangeGroup(
          [...input.selectedIds.value],
          normalizedGroup,
        ),
      );
    },
  };
}

function watchCustomerList(
  state: ReturnType<typeof createListState>,
  loadCustomers: () => Promise<void>,
) {
  watch(
    [
      () => state.filters.scope,
      () => state.filters.search,
      () => state.filters.group,
      () => state.filters.owner,
      () => state.filters.activeCases,
      state.page,
    ],
    () => {
      void loadCustomers();
    },
    { immediate: true },
  );
}

function createCustomerListApi(input: {
  state: ReturnType<typeof createListState>;
  derived: ReturnType<typeof createDerivedState>;
  selection: ReturnType<typeof useCustomerSelection>;
  filters: ReturnType<typeof createFilterActions>;
  bulk: ReturnType<typeof createBulkActionRunner>;
  loadCustomers: () => Promise<void>;
  pageSize: number;
}) {
  return {
    filters: input.state.filters,
    filteredCustomers: input.derived.filteredCustomers,
    customers: input.derived.filteredCustomers,
    total: computed(() => input.state.total.value),
    page: computed(() => input.state.page.value),
    pageSize: input.pageSize,
    totalPages: input.derived.totalPages,
    loading: computed(() => input.state.loading.value),
    errorCode: computed(() => input.state.errorCode.value),
    hasData: input.derived.hasData,
    isEmpty: input.derived.isEmpty,
    selectedIds: input.selection.selectedIds,
    selectedCount: input.selection.selectedCount,
    isAllSelected: input.derived.isAllSelected,
    isIndeterminate: input.derived.isIndeterminate,
    bulkLoading: computed(() => input.state.bulkLoading.value),
    bulkErrorCode: computed(() => input.state.bulkErrorCode.value),
    ...input.filters,
    toggleSelectAll(checked: boolean) {
      input.selection.toggleAll(input.state.customers.value, checked);
    },
    toggleSelectRow: input.selection.toggleRow,
    clearSelection: input.selection.clearSelection,
    retry: input.loadCustomers,
    ...input.bulk,
  };
}

/**
 * 客户列表页核心 Model：筛选、远程加载、选择与批量操作。
 *
 * @param input - 列表页依赖项
 * @param input.repository - 列表加载与批量操作仓储
 * @param input.pageSize - 可选单页条数，默认 20
 * @returns 页面消费的响应式状态与操作方法
 */
export function useCustomerListModel(input: UseCustomerListModelInput) {
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const state = createListState();
  const selection = useCustomerSelection();
  const derived = createDerivedState(
    state.customers,
    state.total,
    state.loading,
    state.errorCode,
    selection,
    pageSize,
  );
  const loadCustomers = createCustomerLoader({
    repository: input.repository,
    filters: state.filters,
    page: state.page,
    customers: state.customers,
    total: state.total,
    loading: state.loading,
    errorCode: state.errorCode,
    selectedIds: selection.selectedIds,
    pageSize,
    clearSelection: selection.clearSelection,
  });
  const filters = createFilterActions({
    filters: state.filters,
    page: state.page,
    totalPages: derived.totalPages,
    clearSelection: selection.clearSelection,
  });
  const bulk = createBulkActionRunner({
    repository: input.repository,
    selectedIds: selection.selectedIds,
    bulkLoading: state.bulkLoading,
    bulkErrorCode: state.bulkErrorCode,
    clearSelection: selection.clearSelection,
    reload: loadCustomers,
  });

  watchCustomerList(state, loadCustomers);
  return createCustomerListApi({
    state,
    derived,
    selection,
    filters,
    bulk,
    loadCustomers,
    pageSize,
  });
}
