import { computed, ref, watch, type Ref } from "vue";
import type { CommFilter, CustomerComm } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

type CustomerCommsRepository = Pick<CustomerRepository, "listComms">;

type CustomerCommsModelErrorCode = "unauthorized" | "requestFailed";

type UseCustomerCommsModelInput = {
  customerId: Ref<string>;
  repository: CustomerCommsRepository;
};

function mapCustomerCommsError(error: unknown): CustomerCommsModelErrorCode {
  if (
    error instanceof CustomerRepositoryError &&
    error.code === "UNAUTHORIZED"
  ) {
    return "unauthorized";
  }
  return "requestFailed";
}

function createCommsLoader(input: {
  customerId: Ref<string>;
  repository: CustomerCommsRepository;
  comms: Ref<CustomerComm[]>;
  loading: Ref<boolean>;
  errorCode: Ref<CustomerCommsModelErrorCode | null>;
}) {
  let requestVersion = 0;

  return async (): Promise<void> => {
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      input.comms.value = [];
      input.errorCode.value = null;
      input.loading.value = false;
      return;
    }

    const activeRequest = ++requestVersion;
    input.loading.value = true;
    input.errorCode.value = null;

    try {
      const nextComms = await input.repository.listComms(nextCustomerId);
      if (activeRequest !== requestVersion) return;
      input.comms.value = nextComms;
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      input.comms.value = [];
      input.errorCode.value = mapCustomerCommsError(error);
    } finally {
      if (activeRequest === requestVersion) input.loading.value = false;
    }
  };
}

/**
 * 沟通记录 Tab 的状态编排：可见范围筛选与列表。
 *
 * @param input - 沟通记录 Tab 依赖
 * @param input.customerId - 路由传入的客户 ID（响应式）
 * @param input.repository - 沟通记录查询仓储
 * @returns 筛选状态与沟通记录列表
 */
export function useCustomerCommsModel(input: UseCustomerCommsModelInput) {
  const commFilter = ref<CommFilter>("all");
  const comms = ref<CustomerComm[]>([]);
  const loading = ref(false);
  const errorCode = ref<CustomerCommsModelErrorCode | null>(null);

  const allComms = computed<CustomerComm[]>(() => comms.value);

  const filteredComms = computed<CustomerComm[]>(() => {
    if (commFilter.value === "all") return allComms.value;
    return allComms.value.filter((c) => c.visibility === commFilter.value);
  });

  const totalCount = computed(() => allComms.value.length);
  const internalCount = computed(
    () => allComms.value.filter((c) => c.visibility === "internal").length,
  );
  const customerCount = computed(
    () => allComms.value.filter((c) => c.visibility === "customer").length,
  );

  const loadComms = createCommsLoader({
    customerId: input.customerId,
    repository: input.repository,
    comms,
    loading,
    errorCode,
  });

  function setCommFilter(filter: CommFilter): void {
    commFilter.value = filter;
  }

  watch(
    input.customerId,
    () => {
      void loadComms();
    },
    { immediate: true },
  );

  return {
    commFilter,
    allComms,
    filteredComms,
    totalCount,
    internalCount,
    customerCount,
    loading,
    errorCode,
    setCommFilter,
    retry: loadComms,
  };
}
