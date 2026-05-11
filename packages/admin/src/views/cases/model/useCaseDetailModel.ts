import { ref, computed, watch, type Ref } from "vue";
import type { CaseDetail, CaseDetailTab } from "../types";
import type { FormTemplate } from "../types-detail";
import { CASE_DETAIL_TABS } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import { createCaseRepository } from "./CaseRepository";
import { resolveDetailTab } from "../query";
import { createWriteActions } from "./useCaseDetailWriteActions";
import type { RefetchTag } from "./useCaseDetailRefetchTags";
import { ALL_TAB_TAGS } from "./useCaseDetailRefetchTags";
import { buildOverviewTimelineFromLog } from "./CaseCommsLogsAdapter";
import { useCaseFormTemplates } from "./useCaseFormTemplates";
import {
  useCasePhaseTransitionMenu,
  isTerminalPhase,
  type PhaseTransitionMenuState,
} from "./useCasePhaseTransitionMenu";
export type { WriteActionFeedback } from "./useCaseDetailWriteActions";
export type { RefetchTag } from "./useCaseDetailRefetchTags";
export { isTerminalPhase } from "./useCasePhaseTransitionMenu";
export type { NotFoundReason } from "./useCaseDetailErrorStatus";
import {
  extractErrorStatus,
  deriveNotFoundReason,
  type NotFoundReason,
} from "./useCaseDetailErrorStatus";

export type { TabCounter } from "./caseDetailTabCounter";
import type { TabCounter } from "./caseDetailTabCounter";

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
      label: `卡点 ${blockingCount}`,
      i18nKey: "cases.constants.tabCounters.blocking",
      i18nParams: { count: blockingCount },
      tone: "danger",
    };
  }

  const pendingTasks = d.tasks.filter((tk) => !tk.done).length;
  if (pendingTasks > 0) {
    result.tasks = {
      label: `待办 ${pendingTasks}`,
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
  const errorStatus = ref<number | null>(null);
  const customerId = ref("");
  const notFound = computed(() => !loading.value && detail.value === null);
  const isReadonly = computed(() => detail.value?.readonly ?? false);
  const tabCounters = computed<Partial<Record<CaseDetailTab, TabCounter>>>(
    () => (detail.value ? deriveTabCounters(detail.value) : {}),
  );
  const notFoundReason = computed<NotFoundReason>(() =>
    deriveNotFoundReason(
      loading.value,
      detail.value !== null,
      errorStatus.value,
    ),
  );

  return {
    activeTab,
    detail,
    loading,
    error,
    errorStatus,
    customerId,
    notFound,
    notFoundReason,
    isReadonly,
    tabs: CASE_DETAIL_TABS,
    tabCounters,
  };
}

type TabFetchEntry = [
  keyof DetailTabDataBundle,
  RefetchTag,
  () => Promise<DetailTabDataBundle[keyof DetailTabDataBundle]>,
];

function buildTabFetchEntries(
  repo: CaseRepository,
  caseId: string,
  locale: string | undefined,
): TabFetchEntry[] {
  return [
    [
      "documents",
      "documents",
      () => repo.getDocumentItems(caseId).catch(() => []),
    ],
    [
      "forms",
      "forms",
      () => repo.getGeneratedDocuments(caseId, locale).catch(() => EMPTY_FORMS),
    ],
    [
      "validation",
      "validation",
      () => repo.getValidationData(caseId).catch(() => EMPTY_VALIDATION),
    ],
    [
      "billing",
      "billing",
      () => repo.getBillingData(caseId).catch(() => EMPTY_BILLING),
    ],
    [
      "submissionPackages",
      "submissionPackages",
      () => repo.getSubmissionPackages(caseId).catch(() => []),
    ],
    [
      "doubleReview",
      "doubleReview",
      () => repo.getDoubleReviewEntries(caseId).catch(() => []),
    ],
    [
      "messages",
      "messages",
      () => repo.getMessages(caseId, locale).catch(() => []),
    ],
    [
      "logEntries",
      "logEntries",
      () => repo.getLogEntries(caseId).catch(() => []),
    ],
    ["tasks", "tasks", () => repo.getTasks(caseId).catch(() => [])],
    ["deadlines", "deadlines", () => repo.getDeadlines(caseId).catch(() => [])],
  ];
}

async function loadTabData(
  repo: CaseRepository,
  caseId: string,
  locale?: string,
  tags?: ReadonlySet<RefetchTag>,
): Promise<Partial<DetailTabDataBundle>> {
  const active = tags ?? ALL_TAB_TAGS;
  const entries = buildTabFetchEntries(repo, caseId, locale).filter(([, tag]) =>
    active.has(tag),
  );
  const values = await Promise.all(entries.map(([, , fn]) => fn()));
  const result: Partial<DetailTabDataBundle> = {};
  entries.forEach(([key], i) => {
    (result as Record<string, unknown>)[key] = values[i];
  });
  return result;
}

interface DetailLoaderInput {
  caseId: Ref<string>;
  repo: CaseRepository;
  detail: Ref<CaseDetail | null>;
  customerId: Ref<string>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  errorStatus: Ref<number | null>;
  locale?: Ref<string>;
}

function applyTabData(
  detail: CaseDetail,
  tabData: Partial<DetailTabDataBundle>,
): CaseDetail {
  const merged = { ...detail, ...tabData };
  if (tabData.logEntries) {
    merged.timeline = buildOverviewTimelineFromLog(tabData.logEntries);
  }
  return merged;
}

function createDetailLoader(input: DetailLoaderInput) {
  let fetchGeneration = 0;

  async function fetchTabData(
    gen: number,
    tags?: ReadonlySet<RefetchTag>,
  ): Promise<void> {
    const tabData = await loadTabData(
      input.repo,
      input.caseId.value,
      input.locale?.value,
      tags,
    ).catch(() => null);
    if (gen !== fetchGeneration || !input.detail.value || !tabData) return;
    input.detail.value = applyTabData(input.detail.value, tabData);
  }

  async function fetchDetail(): Promise<void> {
    const gen = ++fetchGeneration;
    input.loading.value = true;
    input.error.value = null;
    input.errorStatus.value = null;
    try {
      const result = await input.repo.getDetailAggregate(input.caseId.value);
      if (gen !== fetchGeneration) return;
      input.detail.value = result?.detail ?? null;
      input.customerId.value = result?.customerId ?? "";
    } catch (e) {
      if (gen !== fetchGeneration) return;
      input.error.value = e instanceof Error ? e.message : String(e);
      input.errorStatus.value = extractErrorStatus(e);
      input.detail.value = null;
      input.customerId.value = "";
    } finally {
      if (gen === fetchGeneration) input.loading.value = false;
    }
    if (gen === fetchGeneration && input.detail.value) {
      await fetchTabData(gen);
    }
  }

  async function fetchPartial(tags: ReadonlySet<RefetchTag>): Promise<void> {
    if (tags.has("detail")) return fetchDetail();
    await fetchTabData(fetchGeneration, tags);
  }

  return { fetchDetail, fetchPartial };
}

function createRiskModalController() {
  const showRiskModal = ref(false);
  const openRiskModal = (): void => {
    showRiskModal.value = true;
  };
  const closeRiskModal = (): void => {
    showRiskModal.value = false;
  };
  return { showRiskModal, openRiskModal, closeRiskModal };
}

interface UseCaseDetailModelDeps {
  repo?: CaseRepository;
  routeTab?: Ref<string | undefined>;
  initialTab?: string;
  onTabChange?: (tab: CaseDetailTab) => void;
  /** R39-A: 文書テンプレートのコンテンツ言語（`listDocumentTemplates` 専用、UI locale と分離）。 */
  templateLanguage?: Ref<string>;
  /** 表示 locale（BCP 47）。`getMessages` / `getGeneratedDocuments` の整形に使用。 */
  displayLocale?: Ref<string>;
}

function createFormTemplatesSlice(
  repo: CaseRepository,
  detail: Ref<CaseDetail | null>,
  isReadonly: Ref<boolean>,
  templateLanguage?: Ref<string>,
) {
  const effectiveCaseType = computed(() =>
    isReadonly.value ? "" : (detail.value?.caseType ?? ""),
  );
  const { templates: formTemplates } = useCaseFormTemplates({
    repo,
    caseType: effectiveCaseType,
    language: templateLanguage,
  });

  const enrichedDetail = computed<CaseDetail | null>(() => {
    const d = detail.value;
    if (!d) return null;
    return { ...d, forms: { ...d.forms, templates: formTemplates.value } };
  });

  return { formTemplates, enrichedDetail };
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
  if (routeTab) {
    watch(routeTab, (raw) => {
      const resolved = resolveDetailTab(raw);
      if (activeTab.value !== resolved) activeTab.value = resolved;
    });
  }
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
  phaseMenu: PhaseTransitionMenuState;
  formTemplates: Ref<FormTemplate[]>;
  enrichedDetail: Ref<CaseDetail | null>;
}) {
  const isBmvCase = computed(
    () =>
      input.state.detail.value?.workflowStep != null ||
      input.state.detail.value?.visaPlan != null,
  );
  return {
    activeTab: input.state.activeTab,
    tabs: input.state.tabs,
    detail: input.state.detail,
    enrichedDetail: input.enrichedDetail,
    formTemplates: input.formTemplates,
    notFound: input.state.notFound,
    notFoundReason: input.state.notFoundReason,
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
    publishMessageSuccessNonce: input.writeActions.publishMessageSuccessNonce,
    clearWriteFeedback: input.writeActions.clearWriteFeedback,
    isBmvCase,
    transitionStage: input.writeActions.transitionStage,
    transitionWorkflowStep: input.writeActions.transitionWorkflowStep,
    advancePostApprovalStage: input.writeActions.advancePostApprovalStage,
    acknowledgeBillingRisk: input.writeActions.acknowledgeBillingRisk,
    updateCaseFields: input.writeActions.updateCaseFields,
    retryReminderCreation: input.writeActions.retryReminderCreation,
    failureClose: input.writeActions.failureClose,
    createSubmissionPackage: input.writeActions.createSubmissionPackage,
    publishMessage: input.writeActions.publishMessage,
    createReminder: input.writeActions.createReminder,
    createGeneratedDocument: input.writeActions.createGeneratedDocument,
    finalizeGeneratedDocument: input.writeActions.finalizeGeneratedDocument,
    exportGeneratedDocument: input.writeActions.exportGeneratedDocument,
    createTask: input.writeActions.createTask,
    completeTask: input.writeActions.completeTask,

    phaseMenu: input.phaseMenu,
    isTerminalPhase: computed(() =>
      isTerminalPhase(input.state.detail.value?.businessPhase ?? ""),
    ),
  };
}

/**
 * 案件详情页状态编排。
 *
 * @param caseId - 路由传入的案件 ID（响应式）
 * @param deps - 可选依赖注入
 * @returns 详情页状态
 */
export function useCaseDetailModel(
  caseId: Ref<string>,
  deps: UseCaseDetailModelDeps = {},
) {
  const repo = deps.repo ?? createCaseRepository();
  const state = createDetailState(deps.routeTab?.value ?? deps.initialTab);
  const { fetchDetail, fetchPartial } = createDetailLoader({
    caseId,
    repo,
    detail: state.detail,
    customerId: state.customerId,
    loading: state.loading,
    error: state.error,
    errorStatus: state.errorStatus,
    locale: deps.displayLocale ?? deps.templateLanguage,
  });
  const riskModal = createRiskModalController();
  const switchTab = createTabSwitcher(state.activeTab, deps.onTabChange);

  setupDetailLifecycle(caseId, fetchDetail, deps.routeTab, state.activeTab);

  const writeActions = createWriteActions({
    repo,
    getCaseId: () => caseId.value,
    getReadonly: () => state.isReadonly.value,
    onSuccess: fetchDetail,
    onPartialSuccess: fetchPartial,
    onRiskModalClose: () => riskModal.closeRiskModal(),
  });

  const { formTemplates, enrichedDetail } = createFormTemplatesSlice(
    repo,
    state.detail,
    state.isReadonly,
    deps.templateLanguage,
  );

  const phaseMenu = useCasePhaseTransitionMenu({
    detail: state.detail,
    repo,
    getCaseId: () => caseId.value,
    onSuccess: fetchDetail,
  });

  void fetchDetail();

  return createDetailModelResult({
    state,
    riskModal,
    switchTab,
    refetch: fetchDetail,
    writeActions,
    phaseMenu,
    formTemplates,
    enrichedDetail,
  });
}
