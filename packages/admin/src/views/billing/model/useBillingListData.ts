import { ref, computed, watch, type Ref } from "vue";
import type {
  BillingSummaryData,
  CaseBillingRow,
  BillingStatusFilter,
  BillingGroupFilter,
  BillingOwnerFilter,
} from "../types";
import type { BillingListResult } from "./BillingAdapters";
import type {
  BillingListFilters,
  BillingSummaryFilters,
} from "./BillingAdapterUrls";

const SEARCH_DEBOUNCE_MS = 250;

const EMPTY_SUMMARY: BillingSummaryData = {
  totalDue: 0,
  totalReceived: 0,
  totalOutstanding: 0,
  overdueAmount: 0,
};

/**
 * 账单列表数据源——仅包含 list + summary 两个拉取方法。
 */
export interface BillingListDataSource {
  /**
   * 获取列表。
   */
  getList(filters?: BillingListFilters): Promise<BillingListResult>;
  /**
   * 获取摘要。
   */
  getSummary(filters?: BillingSummaryFilters): Promise<BillingSummaryData>;
}

/**
 * 账单列表 hook 依赖。
 */
export interface UseBillingListDataDeps {
  /**
   * 状态筛选。
   */
  statusFilter: Ref<BillingStatusFilter>;
  /**
   * 分组筛选。
   */
  groupFilter: Ref<BillingGroupFilter>;
  /**
   * 负责人筛选。
   */
  ownerFilter: Ref<BillingOwnerFilter>;
  /**
   * 搜索关键字。
   */
  search: Ref<string>;
  /**
   * 数据源（通常为 BillingRepository 子集）。
   */
  dataSource: BillingListDataSource;
}

function useDebouncedSearch(source: Ref<string>) {
  const debounced = ref(source.value);
  watch(source, (val, _old, onCleanup) => {
    const timer = setTimeout(() => {
      debounced.value = val;
    }, SEARCH_DEBOUNCE_MS);
    onCleanup(() => clearTimeout(timer));
  });
  return debounced;
}

/**
 * 账单列表 + 摘要数据拉取。watch filters 变化自动刷新；search 250ms 防抖。
 *
 * @param deps - 响应式筛选状态与数据源
 * @returns 行数据、摘要、分页、加载/错误状态与手动刷新方法
 */
export function useBillingListData(deps: UseBillingListDataDeps) {
  const page = ref(1);
  const limit = ref(20);
  const rows = ref<CaseBillingRow[]>([]);
  const summary = ref<BillingSummaryData>(EMPTY_SUMMARY);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const debouncedSearch = useDebouncedSearch(deps.search);

  const filterParams = computed(() => ({
    status: deps.statusFilter.value || undefined,
    groupId: deps.groupFilter.value || undefined,
    ownerId: deps.ownerFilter.value || undefined,
    q: debouncedSearch.value || undefined,
  }));

  watch(filterParams, () => {
    page.value = 1;
  });

  const requestParams = computed(() => ({
    ...filterParams.value,
    page: page.value,
    limit: limit.value,
  }));

  let fetchVersion = 0;

  async function refresh() {
    const version = ++fetchVersion;
    loading.value = true;
    error.value = null;
    try {
      const params = requestParams.value;
      const [listResult, summaryResult] = await Promise.all([
        deps.dataSource.getList(params),
        deps.dataSource.getSummary(params),
      ]);
      if (version !== fetchVersion) return;
      rows.value = listResult.items;
      total.value = listResult.total;
      summary.value = summaryResult;
    } catch (e) {
      if (version !== fetchVersion) return;
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (version === fetchVersion) loading.value = false;
    }
  }

  watch(requestParams, () => refresh(), { immediate: true });

  return { rows, summary, total, page, limit, loading, error, refresh };
}
