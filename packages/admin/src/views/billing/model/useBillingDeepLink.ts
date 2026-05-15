import { ref, watch, type Ref } from "vue";

/**
 * deep-link 消费器依赖——由视图层注入路由相关的响应式值与回调。
 */
export interface UseBillingDeepLinkDeps {
  /** route.query.case 的响应式包装，空字符串表示无值。 */
  caseQuery: Ref<string>;
  /** route.query.billingPlan（可选），与 case 一并消费以预选收费节点。 */
  billingPlanQuery: Ref<string>;
  /**
   * route.query.collect：`1` 时表示显式打开回款登记弹窗（登记回款入口）。
   * 仅有 `case` / `hint` 而无 `collect` 且无 `billingPlan` 时，只写入筛选关键字，不弹窗（例如「查看收据」）。
   */
  collectQuery: Ref<string>;
  /**
   * route.query.hint（可选）：写入搜索框的人类可读关键字（如案件编号），避免把 UUID 塞进搜索框。
   */
  searchHintQuery: Ref<string>;
  /** 搜索框绑定的 ref（直接写入即可驱动列表筛选）。 */
  search: Ref<string>;
  /** 打开回款登记弹窗。 */
  openPaymentModal: (caseId: string, billingPlanId?: string) => void;
  /** 消费完毕后清除 URL query，避免刷新重复触发。 */
  clearQuery: () => void;
}

/**
 * 消费 `/billing?case=XXX`（可选 `&billingPlan=YYY`、`&collect=1`、`&hint=可读关键字`）deep-link：
 * 将 hint 写入搜索框（若无 hint 则清空筛选关键字）；当 `collect=1` 或存在 `billingPlan` 时打开 PaymentModal；清除 query。
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
      deps.search.value = deps.searchHintQuery.value.trim();
      const openCollectExplicit = deps.collectQuery.value.trim() === "1";
      const shouldOpenModal = openCollectExplicit || Boolean(billingPlanId);
      if (shouldOpenModal) {
        deps.openPaymentModal(caseId, billingPlanId);
      }
      deps.clearQuery();
    },
    { immediate: true },
  );

  return { consumed };
}
