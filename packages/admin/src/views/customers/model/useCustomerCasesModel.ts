import { ref, computed, type Ref } from "vue";
import type { CaseFilter, CustomerCase } from "../types";
import { SAMPLE_CASES_BY_CUSTOMER } from "../fixtures";

/**
 * 关联案件 Tab 的状态编排：筛选与列表。
 *
 * @param customerId 路由传入的客户 ID（响应式）
 * @returns 筛选状态与案件列表
 */
export function useCustomerCasesModel(customerId: Ref<string>) {
  const caseFilter = ref<CaseFilter>("all");

  const allCases = computed<CustomerCase[]>(
    () => SAMPLE_CASES_BY_CUSTOMER[customerId.value] ?? [],
  );

  const filteredCases = computed<CustomerCase[]>(() => {
    if (caseFilter.value === "all") return allCases.value;
    return allCases.value.filter((c) => c.status === caseFilter.value);
  });

  const filterOptions = computed(() => [
    { value: "all" as CaseFilter, label: "全部", count: allCases.value.length },
    {
      value: "active" as CaseFilter,
      label: "活跃",
      count: allCases.value.filter((c) => c.status === "active").length,
    },
    {
      value: "archived" as CaseFilter,
      label: "已归档",
      count: allCases.value.filter((c) => c.status === "archived").length,
    },
  ]);

  function setCaseFilter(filter: CaseFilter): void {
    caseFilter.value = filter;
  }

  return {
    caseFilter,
    allCases,
    filteredCases,
    filterOptions,
    setCaseFilter,
  };
}
