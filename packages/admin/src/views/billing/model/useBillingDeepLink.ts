import { ref, watch, type Ref } from "vue";

/**
 * deep-link 消费器依赖——由视图层注入路由相关的响应式值与回调。
 */
export interface UseBillingDeepLinkDeps {
  /** route.query.case 的响应式包装，空字符串表示无值。 */
  caseQuery: Ref<string>;
  /** route.query.billingPlan（可选），与 case 一并消费以预选收费节点。 */
  billingPlanQuery: Ref<string>;
  /** 搜索框绑定的 ref（直接写入即可驱动列表筛选）。 */
  search: Ref<string>;
  /** 打开回款登记弹窗。 */
  openPaymentModal: (caseId: string, billingPlanId?: string) => void;
  /** 消费完毕后清除 URL query，避免刷新重复触发。 */
  clearQuery: () => void;
}

/**
 * 消费 `/billing?case=XXX`（可选 `&billingPlan=YYY`）deep-link：写入搜索、打开 PaymentModal、清除 query。
 *
 * 使用 once-only 模式，同一页面生命周期内只消费一次，即使 caseQuery 再次变化
 * （例如 router.replace 清除 query 引起的二次 watch 触发）也不重复执行。
 *
 * @param deps 视图层注入的路由响应式值与回调
 * @returns consumed 标记是否已消费 deep-link
 */
export function useBillingDeepLink(deps: UseBillingDeepLinkDeps) {
  const consumed = ref(false);

  watch(
    () => deps.caseQuery.value,
    (caseId) => {
      if (!caseId || consumed.value) return;
      consumed.value = true;
      const billingPlanId = deps.billingPlanQuery.value || undefined;
      deps.search.value = caseId;
      if (billingPlanId) {
        deps.openPaymentModal(caseId, billingPlanId);
      } else {
        deps.openPaymentModal(caseId);
      }
      deps.clearQuery();
    },
    { immediate: true },
  );

  return { consumed };
}
