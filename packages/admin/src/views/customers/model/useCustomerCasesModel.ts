import { computed, ref, watch, type Ref } from "vue";
import type { CaseFilter, CustomerCase } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

type CustomerCasesRepository = Pick<CustomerRepository, "listRelatedCases">;

type CustomerCasesModelErrorCode = "unauthorized" | "requestFailed";

type UseCustomerCasesModelInput = {
  customerId: Ref<string>;
  repository: CustomerCasesRepository;
};

function mapCustomerCasesError(error: unknown): CustomerCasesModelErrorCode {
  if (
    error instanceof CustomerRepositoryError &&
    error.code === "UNAUTHORIZED"
  ) {
    return "unauthorized";
  }
  return "requestFailed";
}

function createFilterOptions(allCases: Readonly<Ref<CustomerCase[]>>) {
  return computed(() => [
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
}

function createCasesLoader(input: {
  customerId: Ref<string>;
  repository: CustomerCasesRepository;
  cases: Ref<CustomerCase[]>;
  loading: Ref<boolean>;
  errorCode: Ref<CustomerCasesModelErrorCode | null>;
}) {
  let requestVersion = 0;

  return async (): Promise<void> => {
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      input.cases.value = [];
      input.errorCode.value = null;
      input.loading.value = false;
      return;
    }

    const activeRequest = ++requestVersion;
    input.loading.value = true;
    input.errorCode.value = null;

    try {
      const nextCases = await input.repository.listRelatedCases(nextCustomerId);
      if (activeRequest !== requestVersion) return;
      input.cases.value = nextCases;
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      input.cases.value = [];
      input.errorCode.value = mapCustomerCasesError(error);
    } finally {
      if (activeRequest === requestVersion) input.loading.value = false;
    }
  };
}

/**
 * 关联案件 Tab 的状态编排：筛选与列表。
 *
 * @param input - 关联案件 Tab 依赖
 * @param input.customerId - 路由传入的客户 ID（响应式）
 * @param input.repository - 关联案件查询仓储
 * @returns 筛选状态与案件列表
 */
export function useCustomerCasesModel(input: UseCustomerCasesModelInput) {
  const caseFilter = ref<CaseFilter>("all");
  const cases = ref<CustomerCase[]>([]);
  const loading = ref(false);
  const errorCode = ref<CustomerCasesModelErrorCode | null>(null);

  const allCases = computed<CustomerCase[]>(() => cases.value);

  const filteredCases = computed<CustomerCase[]>(() => {
    if (caseFilter.value === "all") return allCases.value;
    return allCases.value.filter((c) => c.status === caseFilter.value);
  });

  const filterOptions = createFilterOptions(allCases);
  const loadCases = createCasesLoader({
    customerId: input.customerId,
    repository: input.repository,
    cases,
    loading,
    errorCode,
  });

  function setCaseFilter(filter: CaseFilter): void {
    caseFilter.value = filter;
  }

  watch(
    input.customerId,
    () => {
      void loadCases();
    },
    { immediate: true },
  );

  return {
    caseFilter,
    allCases,
    filteredCases,
    filterOptions,
    loading,
    errorCode,
    setCaseFilter,
    retry: loadCases,
  };
}
