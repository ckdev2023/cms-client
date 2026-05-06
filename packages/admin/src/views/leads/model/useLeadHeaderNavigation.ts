import type { Ref } from "vue";
import type { Router } from "vue-router";
import type { LeadDetail } from "../types";

/**
 * 头部「查看客户 / 查看案件」跳转所需依赖。
 *
 * @remarks
 * - `lead` 沿用 `useLeadDetailModel` 暴露的同名响应式引用；
 * - `router` 由 view 层 `useRouter()` 注入，避免组合式函数自身耦合具体实例。
 */
export interface LeadHeaderNavigationDeps {
  /**
   * 当前线索详情；为 null 表示尚未加载或线索不存在。
   */
  lead: Ref<LeadDetail | null>;
  /**
   * vue-router 实例
   */
  router: Pick<Router, "push">;
}

/**
 * 头部跳转处理（R2-B-6）。
 *
 * @param deps lead 引用与 router 实例
 * @returns 两个跳转处理函数
 */
export function useLeadHeaderNavigation(deps: LeadHeaderNavigationDeps): {
  handleViewCustomer: () => void;
  handleViewCase: () => void;
} {
  function handleViewCustomer(): void {
    const customerId = deps.lead.value?.conversion.convertedCustomer?.id;
    if (!customerId) return;
    void deps.router.push({
      name: "customer-detail",
      params: { id: customerId },
    });
  }

  function handleViewCase(): void {
    const caseId = deps.lead.value?.conversion.convertedCase?.id;
    if (!caseId) return;
    void deps.router.push({
      name: "case-detail",
      params: { id: caseId },
    });
  }

  return { handleViewCustomer, handleViewCase };
}
