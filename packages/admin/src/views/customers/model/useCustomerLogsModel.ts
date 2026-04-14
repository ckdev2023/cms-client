import { ref, computed, type Ref } from "vue";
import type { CustomerLog, LogFilter } from "../types";
import { SAMPLE_LOGS_BY_CUSTOMER } from "../fixtures";

const PAGE_SIZE = 10;

/**
 * 操作日志 Tab 的状态编排：类型筛选与分页。
 *
 * @param customerId 路由传入的客户 ID（响应式）
 * @returns 筛选、分页状态与日志列表
 */
export function useCustomerLogsModel(customerId: Ref<string>) {
  const logFilter = ref<LogFilter>("all");
  const currentPage = ref(1);

  const allLogs = computed<CustomerLog[]>(
    () => SAMPLE_LOGS_BY_CUSTOMER[customerId.value] ?? [],
  );

  const filteredLogs = computed<CustomerLog[]>(() => {
    if (logFilter.value === "all") return allLogs.value;
    return allLogs.value.filter((l) => l.type === logFilter.value);
  });

  const totalCount = computed(() => filteredLogs.value.length);
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalCount.value / PAGE_SIZE)),
  );

  const pagedLogs = computed<CustomerLog[]>(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE;
    return filteredLogs.value.slice(start, start + PAGE_SIZE);
  });

  function setLogFilter(filter: LogFilter): void {
    logFilter.value = filter;
    currentPage.value = 1;
  }

  function prevPage(): void {
    if (currentPage.value > 1) currentPage.value--;
  }

  function nextPage(): void {
    if (currentPage.value < totalPages.value) currentPage.value++;
  }

  return {
    logFilter,
    currentPage,
    allLogs,
    filteredLogs,
    pagedLogs,
    totalCount,
    totalPages,
    setLogFilter,
    prevPage,
    nextPage,
  };
}
