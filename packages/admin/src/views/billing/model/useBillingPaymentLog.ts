import { ref, computed, watch, type Ref } from "vue";
import type {
  PaymentLogEntry,
  BillingGroupFilter,
  BillingOwnerFilter,
} from "../types";
import type { PaymentLogResult } from "./BillingAdapters";
import type { PaymentLogFilters } from "./BillingAdapterUrls";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * 回款流水数据源——仅包含 getPaymentLog 拉取方法。
 */
export interface PaymentLogDataSource {
  /**
   * 获取流水列表。
   */
  getPaymentLog(filters?: PaymentLogFilters): Promise<PaymentLogResult>;
}

/**
 * 回款流水 hook 依赖。
 */
export interface UseBillingPaymentLogDeps {
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
  dataSource: PaymentLogDataSource;
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

function createPaymentLogRefresh(
  dataSource: PaymentLogDataSource,
  requestParams: { value: PaymentLogFilters },
  entries: Ref<PaymentLogEntry[]>,
  total: Ref<number>,
  loading: Ref<boolean>,
  error: Ref<string | null>,
) {
  let fetchVersion = 0;
  return async function refresh() {
    const version = ++fetchVersion;
    loading.value = true;
    error.value = null;
    try {
      const result = await dataSource.getPaymentLog(requestParams.value);
      if (version !== fetchVersion) return;
      entries.value = result.items;
      total.value = result.total;
    } catch (e) {
      if (version !== fetchVersion) return;
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      if (version === fetchVersion) loading.value = false;
    }
  };
}

/**
 * 回款流水分段数据拉取。recordStatus 默认 valid；search 250ms 防抖。
 *
 * @param deps - 响应式筛选状态与数据源
 * @returns 流水条目、分页、加载/错误状态与手动刷新方法
 */
export function useBillingPaymentLog(deps: UseBillingPaymentLogDeps) {
  const page = ref(1);
  const limit = ref(20);
  const recordStatus = ref<string>("valid");
  const from = ref<string>("");
  const to = ref<string>("");
  const entries = ref<PaymentLogEntry[]>([]);
  const total = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const debouncedSearch = useDebouncedSearch(deps.search);

  const filterParams = computed(() => ({
    recordStatus: recordStatus.value || undefined,
    groupId: deps.groupFilter.value || undefined,
    ownerId: deps.ownerFilter.value || undefined,
    q: debouncedSearch.value || undefined,
    from: from.value || undefined,
    to: to.value || undefined,
  }));

  watch(filterParams, () => {
    page.value = 1;
  });

  const requestParams = computed(() => ({
    ...filterParams.value,
    page: page.value,
    limit: limit.value,
  }));

  const refresh = createPaymentLogRefresh(
    deps.dataSource,
    requestParams,
    entries,
    total,
    loading,
    error,
  );
  watch(requestParams, () => refresh(), { immediate: true });

  return {
    entries,
    total,
    page,
    limit,
    recordStatus,
    from,
    to,
    loading,
    error,
    refresh,
  };
}
