import { ref, computed, type Ref } from "vue";
import type { CommFilter, CustomerComm } from "../types";
import { SAMPLE_COMMS_BY_CUSTOMER } from "../fixtures";

/**
 * 沟通记录 Tab 的状态编排：可见范围筛选与列表。
 *
 * @param customerId 路由传入的客户 ID（响应式）
 * @returns 筛选状态与沟通记录列表
 */
export function useCustomerCommsModel(customerId: Ref<string>) {
  const commFilter = ref<CommFilter>("all");

  const allComms = computed<CustomerComm[]>(
    () => SAMPLE_COMMS_BY_CUSTOMER[customerId.value] ?? [],
  );

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

  function setCommFilter(filter: CommFilter): void {
    commFilter.value = filter;
  }

  return {
    commFilter,
    allComms,
    filteredComms,
    totalCount,
    internalCount,
    customerCount,
    setCommFilter,
  };
}
