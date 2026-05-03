import { ref, computed, watch, type Ref } from "vue";
import type { CaseDetail, CaseDetailTab } from "../types";
import { CASE_DETAIL_TABS } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import { createCaseRepository } from "./CaseRepository";
import { resolveDetailTab } from "../query";
import { createWriteActions } from "./useCaseDetailWriteActions";
import { buildOverviewTimelineFromLog } from "./CaseCommsLogsAdapter";
import {
  useCasePhaseTransitionMenu,
  isTerminalPhase,
  type PhaseTransitionMenuState,
} from "./useCasePhaseTransitionMenu";
export type { WriteActionFeedback } from "./useCaseDetailWriteActions";
export { isTerminalPhase } from "./useCasePhaseTransitionMenu";

/**
 * Tab 标签上的计数器信息。
 */
export interface TabCounter {
  /** fallback 显示文案（如 "8/16" 或 "卡点2"）。 */
  label: string;
  /** 语义色调。 */
  tone: "default" | "warning" | "danger";
  /** i18n key — 供 `t(counter.i18nKey, counter.i18nParams)` 翻译。 */
  i18nKey?: string;
  /** i18n 插值参数。 */
  i18nParams?: Record<string, unknown>;
}

interface DetailTabDataBundle {
  documents: CaseDetail["documents"];
  forms: CaseDetail["forms"];
  validation: CaseDetail["validation"];
  billing: CaseDetail["billing"];
  submissionPackages: CaseDetail["submissionPackages"];
  doubleReview: CaseDetail["doubleReview"];
  messages: CaseDetail["messages"];
  logEntries: CaseDetail["logEntries"];
  tasks: CaseDetail["tasks"];
  deadlines: CaseDetail["deadlines"];
}

const EMPTY_FORMS: CaseDetail["forms"] = { templates: [], generated: [] };
const EMPTY_VALIDATION: CaseDetail["validation"] = {
  lastTime: "",
  blocking: [],
  warnings: [],
  info: [],
};
const EMPTY_BILLING: CaseDetail["billing"] = {
  total: "—",
  received: "¥0",
  outstanding: "¥0",
  payments: [],
};

type DetailState = ReturnType<typeof createDetailState>;
type RiskModalController = ReturnType<typeof createRiskModalController>;
type DetailWriteActions = ReturnType<typeof createWriteActions>;

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
      i18nKey: "cases.constants.tabCounters.blocking",
      i18nParams: { count: blockingCount },
      tone: "danger",
    };
  }

  const pendingTasks = d.tasks.filter((tk) => !tk.done).length;
  if (pendingTasks > 0) {
    result.tasks = {
      label: `待办${pendingTasks}`,
      i18nKey: "cases.constants.tabCounters.pending",
      i18nParams: { count: pendingTasks },
      tone: "warning",
    };
  }

  const urgentDeadlines = d.deadlines.filter(
    (dl) => dl.severity === "danger" || dl.severity === "warning",
  ).length;
  if (urgentDeadlines > 0) {
    result.deadlines = { label: `${urgentDeadlines}`, tone: "warning" };
  }

  const messageCount = d.messages.length;
  if (messageCount > 0) {
    result.messages = { label: `${messageCount}`, tone: "default" };
  }

  return result;
}

function createDetailState(initialTab: string | undefined) {
  const activeTab = ref<CaseDetailTab>(resolveDetailTab(initialTab));
  const detail = ref<CaseDetail | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const customerId = ref("");
  const notFound = computed(() => !loading.value && detail.value === null);
  const isReadonly = computed(() => detail.value?.readonly ?? false);
  const tabCounters = computed<Partial<Record<CaseDetailTab, TabCounter>>>(
    () => (detail.value ? deriveTabCounters(detail.value) : {}),
  );

  return {
    activeTab,
    detail,
    loading,
    error,
    customerId,
    notFound,
    isReadonly,
    tabs: CASE_DETAIL_TABS,
    tabCounters,
  };
}

async function loadTabData(
  repo: CaseRepository,
  caseId: string,
  locale?: string,
): Promise<DetailTabDataBundle> {
  const [
    documents,
    forms,
    validation,
    billing,
    submissionPackages,
    doubleReview,
    messages,
    logEntries,
    tasks,
    deadlines,
  ] = await Promise.all([
    repo.getDocumentItems(caseId).catch(() => []),
    repo.getGeneratedDocuments(caseId, locale).catch(() => EMPTY_FORMS),
    repo.getValidationData(caseId).catch(() => EMPTY_VALIDATION),
    repo.getBillingData(caseId).catch(() => EMPTY_BILLING),
    repo.getSubmissionPackages(caseId).catch(() => []),
    repo.getDoubleReviewEntries(caseId).catch(() => []),
    repo.getMessages(caseId, locale).catch(() => []),
    repo.getLogEntries(caseId).catch(() => []),
    repo.getTasks(caseId).catch(() => []),
    repo.getDeadlines(caseId).catch(() => []),
  ]);

  return {
    documents,
    forms,
    validation,
    billing,
    submissionPackages,
    doubleReview,
    messages,
    logEntries,
    tasks,
    deadlines,
  };
}

function createDetailLoader(input: {
  caseId: Ref<string>;
  repo: CaseRepository;
  detail: Ref<CaseDetail | null>;
  customerId: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  locale?: Ref<string>;
}) {
  let fetchGeneration = 0;

  async function fetchTabData(gen: number): Promise<void> {
    const tabData = await loadTabData(
      input.repo,
      input.caseId.value,
      input.locale?.value,
    ).catch(() => null);
    if (gen !== fetchGeneration || !input.detail.value || !tabData) return;
    input.detail.value = {
      ...input.detail.value,
      ...tabData,
      timeline: buildOverviewTimelineFromLog(tabData.logEntries),
    };
  }

  async function fetchDetail(): Promise<void> {
    const gen = ++fetchGeneration;
    input.loading.value = true;
    input.error.value = null;
    try {
      const result = await input.repo.getDetailAggregate(input.caseId.value);
      if (gen !== fetchGeneration) return;
      input.detail.value = result?.detail ?? null;
      input.customerId.value = result?.customerId ?? "";
    } catch (e) {
      if (gen !== fetchGeneration) return;
      input.error.value = e instanceof Error ? e.message : String(e);
      input.detail.value = null;
      input.customerId.value = "";
    } finally {
      if (gen === fetchGeneration) input.loading.value = false;
    }

    if (gen === fetchGeneration && input.detail.value) {
      await fetchTabData(gen);
    }
  }

  return { fetchDetail };
}

function syncRouteTab(
  routeTab: Ref<string | undefined> | undefined,
  activeTab: Ref<CaseDetailTab>,
): void {
  if (!routeTab) return;
  watch(routeTab, (raw) => {
    const resolved = resolveDetailTab(raw);
    if (activeTab.value !== resolved) {
      activeTab.value = resolved;
    }
  });
}

function createRiskModalController() {
  const showRiskModal = ref(false);
  function openRiskModal(): void {
    showRiskModal.value = true;
  }
  function closeRiskModal(): void {
    showRiskModal.value = false;
  }

  return { showRiskModal, openRiskModal, closeRiskModal };
}

interface UseCaseDetailModelDeps {
  repo?: CaseRepository;
  routeTab?: Ref<string | undefined>;
  initialTab?: string;
  onTabChange?: (tab: CaseDetailTab) => void;
  locale?: Ref<string>;
}

function setupDetailLifecycle(
  caseId: Ref<string>,
  fetchDetail: () => Promise<void>,
  routeTab: Ref<string | undefined> | undefined,
  activeTab: Ref<CaseDetailTab>,
): void {
  watch(caseId, () => {
    void fetchDetail();
  });
  syncRouteTab(routeTab, activeTab);
}

function createTabSwitcher(
  activeTab: Ref<CaseDetailTab>,
  onTabChange?: (tab: CaseDetailTab) => void,
) {
  return (tab: CaseDetailTab): void => {
    if (activeTab.value === tab) return;
    activeTab.value = tab;
    onTabChange?.(tab);
  };
}

function createDetailModelResult(input: {
  state: DetailState;
  riskModal: RiskModalController;
  switchTab: (tab: CaseDetailTab) => void;
  refetch: () => Promise<void>;
  writeActions: DetailWriteActions;
  isBmvCase: Ref<boolean>;
  phaseMenu: PhaseTransitionMenuState;
  isTerminalPhaseComputed: Ref<boolean>;
}) {
  return {
    activeTab: input.state.activeTab,
    tabs: input.state.tabs,
    detail: input.state.detail,
    notFound: input.state.notFound,
    isReadonly: input.state.isReadonly,
    tabCounters: input.state.tabCounters,
    customerId: input.state.customerId,
    loading: input.state.loading,
    error: input.state.error,
    showRiskModal: input.riskModal.showRiskModal,
    switchTab: input.switchTab,
    openRiskModal: input.riskModal.openRiskModal,
    closeRiskModal: input.riskModal.closeRiskModal,
    refetch: input.refetch,

    writeFeedback: input.writeActions.writeFeedback,
    clearWriteFeedback: input.writeActions.clearWriteFeedback,
    isBmvCase: input.isBmvCase,
    transitionStage: input.writeActions.transitionStage,
    transitionWorkflowStep: input.writeActions.transitionWorkflowStep,
    advancePostApprovalStage: input.writeActions.advancePostApprovalStage,
    acknowledgeBillingRisk: input.writeActions.acknowledgeBillingRisk,
    updateCaseFields: input.writeActions.updateCaseFields,
    retryReminderCreation: input.writeActions.retryReminderCreation,
    failureClose: input.writeActions.failureClose,
    publishMessage: input.writeActions.publishMessage,
    createReminder: input.writeActions.createReminder,
    createGeneratedDocument: input.writeActions.createGeneratedDocument,
    createTask: input.writeActions.createTask,
    completeTask: input.writeActions.completeTask,

    phaseMenu: input.phaseMenu,
    isTerminalPhase: input.isTerminalPhaseComputed,
  };
}

/**
 * 案件详情页状态编排。
 *
 * 依赖注入真实 CaseRepository（默认 `createCaseRepository()`），
 * 通过 `getDetailAggregate` 异步加载案件详情与 deep-link 字段。
 *
 * @param caseId - 路由传入的案件 ID（响应式）
 * @param deps - 可选依赖注入
 * @param deps.repo - 案件数据仓库实例（默认真实 HTTP 仓储）
 * @param deps.routeTab - 响应式路由 tab 值（由 view 层从 route.query.tab 传入）;
 *   当 URL 因浏览器前进/后退或外部导航变更时，model 自动同步 activeTab，
 *   而不回调 onTabChange（URL 已是真相源）。
 * @param deps.initialTab - 初始激活 tab（测试用；若同时提供 routeTab，以 routeTab 优先）
 * @param deps.onTabChange - tab 切换后回调（由 view 层提供，用于同步 URL query）;
 *   仅在 UI 主动切换 tab 时触发，route 变更驱动的同步不会触发。
 * @returns 详情页状态：案件数据、tab、readonly、counters、customerId 等
 */
export function useCaseDetailModel(
  caseId: Ref<string>,
  deps: UseCaseDetailModelDeps = {},
) {
  const repo = deps.repo ?? createCaseRepository();
  const state = createDetailState(deps.routeTab?.value ?? deps.initialTab);
  const { fetchDetail } = createDetailLoader({
    caseId,
    repo,
    detail: state.detail,
    customerId: state.customerId,
    loading: state.loading,
    error: state.error,
    locale: deps.locale,
  });
  const riskModal = createRiskModalController();
  const switchTab = createTabSwitcher(state.activeTab, deps.onTabChange);

  setupDetailLifecycle(caseId, fetchDetail, deps.routeTab, state.activeTab);

  const writeActions = createWriteActions({
    repo,
    getCaseId: () => caseId.value,
    getReadonly: () => state.isReadonly.value,
    onSuccess: fetchDetail,
    onRiskModalClose: () => riskModal.closeRiskModal(),
  });

  /** 当前案件是否为 BMV（经营管理签）案件。 */
  const isBmvCase = computed(
    () =>
      state.detail.value?.workflowStep != null ||
      state.detail.value?.visaPlan != null,
  );

  const phaseMenu = useCasePhaseTransitionMenu({
    detail: state.detail,
    repo,
    getCaseId: () => caseId.value,
    onSuccess: fetchDetail,
  });

  const isTerminalPhaseComputed = computed(() =>
    isTerminalPhase(state.detail.value?.businessPhase ?? ""),
  );

  void fetchDetail();

  return createDetailModelResult({
    state,
    riskModal,
    switchTab,
    refetch: fetchDetail,
    writeActions,
    isBmvCase,
    phaseMenu,
    isTerminalPhaseComputed,
  });
}
