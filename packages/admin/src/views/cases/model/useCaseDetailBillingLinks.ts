/**
 * 案件详情页 → 收费页的 deep-link 构造 —— 自 `CaseDetailView.vue` 抽出（B4）。
 *
 * 与弹窗编排分开成域的理由：这组只做「拼 query + 跳转」，不持有任何状态，
 * 依赖面也只有 caseId / detail.caseNo / router 三项，和 useCaseDetailModals
 * 的写操作编排是两个关注点。
 *
 * 逐字搬运，query 形态未变——`case` / `hint` / `billingPlan` / `collect` 四个
 * 键的取值与附带条件是收费页的既有约定，改动会破坏跳转后的预选与搜索行为。
 */
import type { Ref } from "vue";
import type { Router } from "vue-router";

import type { PaymentRow } from "../detail/tabs/billing/types";
import type { useCaseDetailModel } from "./useCaseDetailModel";

type DetailModel = ReturnType<typeof useCaseDetailModel>;

/** 收费 deep-link 构造所需依赖。 */
export interface UseCaseDetailBillingLinksDeps {
  /** 案件主键。 */
  caseId: Ref<string>;
  /** 详情聚合（读取 caseNo 作为人类可读 hint）。 */
  detail: DetailModel["detail"];
  /** 路由器。 */
  router: Router;
}

/**
 * 装配案件详情页跳转收费页的两个入口（登记回款 / 查看收据）。
 *
 * @param deps - caseId、详情聚合与路由器
 * @returns 两个跳转 handler，供模板直接绑定
 */
export function useCaseDetailBillingLinks(deps: UseCaseDetailBillingLinksDeps) {
  const { caseId, detail, router } = deps;

  /**
   * 构造 `/billing` deep-link：`case` 为案件主键；`hint` 为人类可读关键字（便于列表搜索框展示）；
   * `collect=1` 在显式登记回款时附带（或由 `billingPlan` 间接附带）。
   *
   * @param row - 收费表格行；来自 `plan` 时可带 `billingPlanId` 以预选节点。
   * @param options - 可选配置。
   * @param options.openCollectModal - 为 `true` 时在 query 中附加 `collect=1`，用于打开收费页的登记回款弹窗。
   * @returns 路由 query 对象
   */
  function billingDeepLinkQuery(
    row?: PaymentRow,
    options?: { openCollectModal?: boolean },
  ): Record<string, string> {
    const q: Record<string, string> = { case: caseId.value };
    const hint = detail.value?.caseNo?.trim();
    if (hint) {
      q.hint = hint;
    }
    if (row?.billingPlanId) {
      q.billingPlan = row.billingPlanId;
    }
    const openCollect =
      Boolean(options?.openCollectModal) || Boolean(row?.billingPlanId);
    if (openCollect) {
      q.collect = "1";
    }
    return q;
  }

  /**
   * 从案件详情 deep-link 打开回款登记（可选携带预选收费节点）。
   *
   * @param row - 收费表格行；来自 `plan` 时可带 `billingPlanId` 以预选节点。
   */
  function onOpenCollection(row?: PaymentRow): void {
    router.push({
      path: "/billing",
      query: billingDeepLinkQuery(row, { openCollectModal: true }),
    });
  }

  /** 跳转到收费页面，查看收据。 */
  function onViewReceipt(): void {
    router.push({ path: "/billing", query: billingDeepLinkQuery() });
  }

  return { onOpenCollection, onViewReceipt };
}
