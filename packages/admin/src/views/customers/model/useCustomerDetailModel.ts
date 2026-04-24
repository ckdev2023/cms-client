import { computed, ref, watch, type Ref } from "vue";
import type { CustomerDetail, DetailTab } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

type DetailRepository = Pick<CustomerRepository, "getCustomerDetail">;

type CustomerDetailModelErrorCode =
  | "unauthorized"
  | "notFound"
  | "requestFailed";

type UseCustomerDetailModelInput = {
  customerId: Ref<string>;
  repository: DetailRepository;
};

function mapCustomerDetailError(error: unknown): CustomerDetailModelErrorCode {
  if (error instanceof CustomerRepositoryError) {
    if (error.code === "UNAUTHORIZED") return "unauthorized";
    if (error.status === 404) return "notFound";
  }
  return "requestFailed";
}

function useCustomerDetailLoader(input: UseCustomerDetailModelInput) {
  const customer = ref<CustomerDetail | null>(null);
  const loading = ref(false);
  const errorCode = ref<CustomerDetailModelErrorCode | null>(null);
  let requestVersion = 0;

  async function loadCustomer(): Promise<void> {
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      customer.value = null;
      errorCode.value = "notFound";
      loading.value = false;
      return;
    }

    const activeRequest = ++requestVersion;
    loading.value = true;
    errorCode.value = null;
    try {
      const detail = await input.repository.getCustomerDetail(nextCustomerId);
      if (activeRequest !== requestVersion) return;
      customer.value = detail;
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      customer.value = null;
      errorCode.value = mapCustomerDetailError(error);
    } finally {
      if (activeRequest === requestVersion) loading.value = false;
    }
  }

  watch(
    input.customerId,
    () => {
      void loadCustomer();
    },
    { immediate: true },
  );

  return { customer, loading, errorCode, retry: loadCustomer };
}

/**
 * 客户详情页整体状态编排，管理当前客户数据与激活 Tab。
 *
 * @param input - 详情页依赖项
 * @param input.customerId - 当前路由中的客户 ID
 * @param input.repository - 客户详情读取仓储
 * @returns 详情页状态与交互方法
 */
export function useCustomerDetailModel(input: UseCustomerDetailModelInput) {
  const activeTab = ref<DetailTab>("basic");
  const detail = useCustomerDetailLoader(input);
  const notFound = computed(() => detail.errorCode.value === "notFound");
  const avatarInitials = computed(
    () => detail.customer.value?.displayName.slice(0, 1) ?? "?",
  );

  return {
    activeTab,
    customer: computed(() => detail.customer.value),
    loading: computed(() => detail.loading.value),
    errorCode: computed(() => detail.errorCode.value),
    notFound,
    avatarInitials,
    switchTab(tab: DetailTab): void {
      activeTab.value = tab;
    },
    retry: detail.retry,
  };
}
