import { computed, type ComputedRef, type Ref } from "vue";
import type { DocumentGroup } from "../types-detail";
import type { CompletionRate } from "../../documents/types";
import type { CaseDocumentsViewState } from "./useCaseDocumentsTab";
import {
  computeProviderStat,
  computeCaseDocumentCompletionRate,
  computeDocumentStatusBreakdown,
  computeGroupsStatusBreakdown,
  isDocumentListEmpty,
  completionZeroDenominatorMessageKey,
} from "./caseDocumentStats";

/**
 * 案件资料 Tab 中与清单分组、完成率展示相关的派生状态。
 *
 * @param activeGroups - API 或 aggregate 回落后的资料分组
 * @param viewState - `useCaseDocumentsTab` 的空态 / 模板缺失等视图状态
 * @param apiCompletionRate - 后端汇总完成率（可为 null）
 * @returns 空态判定、`effectiveViewState`、整体与分组进度派生数据
 */
export function useCaseDocumentsTabDisplayDerived(
  activeGroups: ComputedRef<DocumentGroup[]>,
  viewState: ComputedRef<CaseDocumentsViewState>,
  apiCompletionRate: Ref<CompletionRate | null>,
) {
  const isEmpty = computed(() => isDocumentListEmpty(activeGroups.value));

  const effectiveViewState = computed(() =>
    isEmpty.value ? viewState.value : "ready",
  );

  const overallRate = computed(
    () =>
      apiCompletionRate.value ??
      computeCaseDocumentCompletionRate(activeGroups.value),
  );

  const overallBreakdown = computed(() =>
    computeGroupsStatusBreakdown(activeGroups.value),
  );

  const overallZeroLabelKey = computed(() =>
    overallRate.value.total !== 0
      ? null
      : completionZeroDenominatorMessageKey(overallBreakdown.value.waived > 0),
  );

  const groupStats = computed(() =>
    activeGroups.value.map((g) => {
      const stat = computeProviderStat(g);
      return {
        group: g,
        stat,
        breakdown: computeDocumentStatusBreakdown(g.items),
        zeroLabelKey:
          stat.total === 0
            ? completionZeroDenominatorMessageKey(g.items.length > 0)
            : null,
      };
    }),
  );

  return {
    isEmpty,
    effectiveViewState,
    overallRate,
    overallBreakdown,
    overallZeroLabelKey,
    groupStats,
  };
}
