import { ref, computed, type Ref } from "vue";
import type { CustomerDetail, DetailTab } from "../types";
import { SAMPLE_CUSTOMER_DETAILS } from "../fixtures";

/**
 * 客户详情页整体状态编排，管理当前客户数据与激活的 Tab。
 *
 * @param customerId 路由传入的客户 ID（响应式）
 * @returns 详情页状态：客户数据、激活 Tab、切换 Tab 方法等
 */
export function useCustomerDetailModel(customerId: Ref<string>) {
  const activeTab = ref<DetailTab>("basic");

  const customer = computed<CustomerDetail | null>(
    () => SAMPLE_CUSTOMER_DETAILS[customerId.value] ?? null,
  );

  const notFound = computed(() => customer.value === null);

  const avatarInitials = computed(() => {
    const c = customer.value;
    if (!c) return "?";
    return c.displayName.slice(0, 1);
  });

  function switchTab(tab: DetailTab): void {
    activeTab.value = tab;
  }

  return {
    activeTab,
    customer,
    notFound,
    avatarInitials,
    switchTab,
  };
}
