import { ref, computed, type Ref } from "vue";
import type { CaseDetail, CaseDetailTab, CaseSampleKey } from "../types";
import { CASE_DETAIL_TABS, CASE_DETAIL_TAB_KEYS } from "../constants";
import type { CaseRepository } from "../repository";
import { createMockCaseRepository } from "../repository";

/**
 * Tab 标签上的计数器信息。
 */
export interface TabCounter {
  /** 显示文案（如 "8/16" 或 "卡点2"）。 */
  label: string;
  /** 语义色调。 */
  tone: "default" | "warning" | "danger";
}

function deriveTabCounters(
  d: CaseDetail,
): Partial<Record<CaseDetailTab, TabCounter>> {
  const result: Partial<Record<CaseDetailTab, TabCounter>> = {};

  if (d.docsCounter) {
    result.documents = { label: d.docsCounter, tone: "default" };
  }

  const blockingCount = d.validation.blocking.length;
  if (blockingCount > 0) {
    result.validation = {
      label: `卡点${blockingCount}`,
      tone: "danger",
    };
  }

  const pendingTasks = d.tasks.filter((t) => !t.done).length;
  if (pendingTasks > 0) {
    result.tasks = { label: `待办${pendingTasks}`, tone: "warning" };
  }

  const urgentDeadlines = d.deadlines.filter(
    (dl) => dl.severity === "danger" || dl.severity === "warning",
  ).length;
  if (urgentDeadlines > 0) {
    result.deadlines = { label: `${urgentDeadlines}`, tone: "warning" };
  }

  return result;
}

function isValidTab(value: unknown): value is CaseDetailTab {
  return (
    typeof value === "string" &&
    (CASE_DETAIL_TAB_KEYS as readonly string[]).includes(value)
  );
}

/**
 * 案件详情页状态编排。
 *
 * @param caseId - 路由传入的案件 ID（响应式）
 * @param deps - 可选依赖注入（主要用于测试）
 * @param deps.repo - 案件数据仓库实例
 * @param deps.initialTab - 初始激活 tab（来自 route query 等外部源）
 * @returns 详情页状态：案件数据、tab、readonly、counters 等
 */
export function useCaseDetailModel(
  caseId: Ref<string>,
  deps: { repo?: CaseRepository; initialTab?: string } = {},
) {
  const repo = deps.repo ?? createMockCaseRepository();
  const activeTab = ref<CaseDetailTab>(
    isValidTab(deps.initialTab) ? deps.initialTab : "overview",
  );

  const detail = computed<CaseDetail | null>(
    () => repo.getDetail(caseId.value) ?? null,
  );

  const notFound = computed(() => detail.value === null);
  const isReadonly = computed(() => detail.value?.readonly ?? false);

  const tabs = CASE_DETAIL_TABS;

  const tabCounters = computed<Partial<Record<CaseDetailTab, TabCounter>>>(
    () => (detail.value ? deriveTabCounters(detail.value) : {}),
  );

  const currentSampleKey = computed<CaseSampleKey | null>(() => {
    const item = repo.getCaseById(caseId.value);
    return (item?.sampleKey as CaseSampleKey) ?? null;
  });

  function switchTab(tab: CaseDetailTab): void {
    activeTab.value = tab;
  }

  function getSampleCaseId(key: CaseSampleKey): string | undefined {
    return repo.getCaseBySampleKey(key)?.id;
  }

  const showRiskModal = ref(false);

  function openRiskModal(): void {
    showRiskModal.value = true;
  }

  function closeRiskModal(): void {
    showRiskModal.value = false;
  }

  return {
    activeTab,
    tabs,
    detail,
    notFound,
    isReadonly,
    tabCounters,
    currentSampleKey,
    showRiskModal,
    switchTab,
    getSampleCaseId,
    openRiskModal,
    closeRiskModal,
  };
}
