import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { CustomerLog, LogFilter } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

const PAGE_SIZE = 10;

type CustomerLogsRepository = Pick<CustomerRepository, "listLogs">;

type CustomerLogsModelErrorCode = "unauthorized" | "requestFailed";

type UseCustomerLogsModelInput = {
  customerId: Ref<string>;
  repository: CustomerLogsRepository;
};

function mapCustomerLogsError(error: unknown): CustomerLogsModelErrorCode {
  if (
    error instanceof CustomerRepositoryError &&
    error.code === "UNAUTHORIZED"
  ) {
    return "unauthorized";
  }
  return "requestFailed";
}

function createLogsLoader(input: {
  customerId: Ref<string>;
  repository: CustomerLogsRepository;
  logs: Ref<CustomerLog[]>;
  loading: Ref<boolean>;
  errorCode: Ref<CustomerLogsModelErrorCode | null>;
}) {
  let requestVersion = 0;

  return async (): Promise<void> => {
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      input.logs.value = [];
      input.errorCode.value = null;
      input.loading.value = false;
      return;
    }

    const activeRequest = ++requestVersion;
    input.loading.value = true;
    input.errorCode.value = null;

    try {
      const nextLogs = await input.repository.listLogs(nextCustomerId);
      if (activeRequest !== requestVersion) return;
      input.logs.value = nextLogs;
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      input.logs.value = [];
      input.errorCode.value = mapCustomerLogsError(error);
    } finally {
      if (activeRequest === requestVersion) input.loading.value = false;
    }
  };
}

function createLogPagination(filteredLogs: ComputedRef<CustomerLog[]>) {
  const currentPage = ref(1);
  const totalCount = computed(() => filteredLogs.value.length);
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)),
  );
  const pagedLogs = computed<CustomerLog[]>(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE;
    return filteredLogs.value.slice(start, start + PAGE_SIZE);
  });

  watch(totalPages, (nextTotalPages) => {
    if (currentPage.value > nextTotalPages) currentPage.value = nextTotalPages;
  });

  return {
    currentPage,
    totalCount,
    totalPages,
    pagedLogs,
    resetPage() {
      currentPage.value = 1;
    },
    prevPage() {
      if (currentPage.value > 1) currentPage.value--;
    },
    nextPage() {
      if (currentPage.value < totalPages.value) currentPage.value++;
    },
  };
}

/**
 * 操作日志 Tab 的状态编排：类型筛选与分页。
 *
 * @param input - 操作日志 Tab 依赖
 * @param input.customerId - 路由传入的客户 ID（响应式）
 * @param input.repository - 操作日志查询仓储
 * @returns 筛选、分页状态与日志列表
 */
export function useCustomerLogsModel(input: UseCustomerLogsModelInput) {
  const logFilter = ref<LogFilter>("all");
  const logs = ref<CustomerLog[]>([]);
  const loading = ref(false);
  const errorCode = ref<CustomerLogsModelErrorCode | null>(null);

  const allLogs = computed<CustomerLog[]>(() => logs.value);

  const filteredLogs = computed<CustomerLog[]>(() => {
    if (logFilter.value === "all") return allLogs.value;
    return allLogs.value.filter((l) => l.type === logFilter.value);
  });
  const pagination = createLogPagination(filteredLogs);

  const loadLogs = createLogsLoader({
    customerId: input.customerId,
    repository: input.repository,
    logs,
    loading,
    errorCode,
  });

  function setLogFilter(filter: LogFilter): void {
    logFilter.value = filter;
    pagination.resetPage();
  }

  watch(
    input.customerId,
    () => {
      pagination.resetPage();
      void loadLogs();
    },
    { immediate: true },
  );

  return {
    logFilter,
    currentPage: pagination.currentPage,
    allLogs,
    filteredLogs,
    pagedLogs: pagination.pagedLogs,
    totalCount: pagination.totalCount,
    totalPages: pagination.totalPages,
    loading,
    errorCode,
    setLogFilter,
    prevPage: pagination.prevPage,
    nextPage: pagination.nextPage,
    retry: loadLogs,
  };
}
