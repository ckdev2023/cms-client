<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "../../shared/model/useToast";
import CaseDetailHeader from "./detail/CaseDetailHeader.vue";
import CaseDetailStatusBanners from "./detail/CaseDetailStatusBanners.vue";
import CaseDetailTabBar from "./detail/CaseDetailTabBar.vue";
import CaseRiskConfirmModal from "./components/CaseRiskConfirmModal.vue";
import CaseEditModal from "./components/CaseEditModal.vue";
import CaseDeadlineCreateModal from "./detail/tabs/deadlines/CaseDeadlineCreateModal.vue";
import CaseFormGenerateModal from "./detail/tabs/forms/CaseFormGenerateModal.vue";
import CaseTaskCreateModal from "./detail/tabs/tasks/CaseTaskCreateModal.vue";
import SubmissionPackageCreateModal from "./detail/tabs/validation/SubmissionPackageCreateModal.vue";
import PhaseTransitionPopover from "./components/PhaseTransitionPopover.vue";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import { buildCaseDetailQuery, buildCaseListHref } from "./query";
import { useCaseDetailGuard } from "./model/useCaseDetailGuard";
import { useCaseValidationActions } from "./model/useCaseValidationActions";
import { useCaseDetailModals } from "./model/useCaseDetailModals";
import { useCaseDetailBillingLinks } from "./model/useCaseDetailBillingLinks";

/** 案件详情页：承载详情头部、Tab 切换与写操作反馈。 */
const { t, locale } = useI18n();
const toast = useToast();
const route = useRoute();
const router = useRouter();

// ── Tab 组件懒加载（B4）────────────────────────────────────────
// 10 个 Tab 面板本就由 v-if/v-else-if 按 activeTab 择一渲染，运行时从不同时挂载；
// 改 defineAsyncComponent 是为拆 chunk：此前 10 个 Tab 全部静态 import，被打进
// CaseDetailView 这一个 205 kB(gzip 48.8) 的路由 chunk，打开详情页即全量下载。
// 拆分后进入详情页只加载壳 + 当前 Tab，其余 9 个按需取。
// 每个 Tab 的 model/adapter 依赖随之一并进入各自 chunk，收益不止组件本身。
const CaseOverviewTab = defineAsyncComponent(
  () => import("./detail/tabs/overview/CaseOverviewTab.vue"),
);
const CaseInfoTab = defineAsyncComponent(
  () => import("./detail/tabs/info/CaseInfoTab.vue"),
);
const CaseDocumentsTab = defineAsyncComponent(
  () => import("./detail/tabs/documents/CaseDocumentsTab.vue"),
);
const CaseDeadlinesTab = defineAsyncComponent(
  () => import("./detail/tabs/deadlines/CaseDeadlinesTab.vue"),
);
const CaseFormsTab = defineAsyncComponent(
  () => import("./detail/tabs/forms/CaseFormsTab.vue"),
);
const CaseTasksTab = defineAsyncComponent(
  () => import("./detail/tabs/tasks/CaseTasksTab.vue"),
);
const CaseMessagesTab = defineAsyncComponent(
  () => import("./detail/tabs/comms/CaseMessagesTab.vue"),
);
const CaseLogTab = defineAsyncComponent(
  () => import("./detail/tabs/comms/CaseLogTab.vue"),
);
const CaseValidationTab = defineAsyncComponent(
  () => import("./detail/tabs/validation/CaseValidationTab.vue"),
);
const CaseBillingTab = defineAsyncComponent(
  () => import("./detail/tabs/billing/CaseBillingTab.vue"),
);

const caseId = computed(() =>
  route.matched.at(-1)?.name === "case-detail" &&
  typeof route.params.id === "string"
    ? route.params.id
    : "",
);
const routeTab = computed(() => {
  const raw = route.query.tab;
  return typeof raw === "string" ? raw : undefined;
});
const {
  activeTab,
  tabs,
  detail,
  enrichedDetail,
  notFound,
  notFoundReason,
  isReadonly,
  tabCounters,
  loading,
  showRiskModal,
  isBmvCase,
  writeFeedback,
  publishMessageSuccessNonce,
  clearWriteFeedback,
  switchTab,
  openRiskModal,
  closeRiskModal,
  transitionStage,
  transitionWorkflowStep,
  retryReminderCreation,
  failureClose,
  updateCaseFields,
  publishMessage,
  createReminder,
  createGeneratedDocument,
  finalizeGeneratedDocument,
  deleteDraftGeneratedDocument,
  createTask,
  completeTask,
  phaseMenu,
  isTerminalPhase: isTerminal,
  formTemplatesLoading,
  refetch,
} = useCaseDetailModel(caseId, {
  routeTab,
  onTabChange: (tab) =>
    router.replace({ query: buildCaseDetailQuery({ tab }) }),
  displayLocale: locale,
});

const validationActions = useCaseValidationActions({
  caseId,
  onRerunSuccess: () => void refetch(),
  onCreateSpSuccess: () => {
    void refetch();
    guardedSwitchTab("validation");
  },
  onReviewRequestSuccess: () => void refetch(),
  onRiskAckSuccess: () => {
    closeRiskModal();
    void refetch();
  },
});

const guard = useCaseDetailGuard(detail);

/**
 * 风险确认后触发计费风险承认。
 *
 * @param payload - 风险确认参数
 * @param payload.reason - 理由
 * @param payload.person - 确认人
 * @param payload.evidence - 证据链接
 */
function onRiskConfirm(payload: {
  reason: string;
  person: string;
  evidence: string;
}): void {
  void validationActions.acknowledgeBillingRisk(payload);
}

watch(
  () => validationActions.riskAckErrorI18nKey.value,
  (key) => {
    if (key) {
      toast.add({ title: t(key), tone: "error" });
    }
  },
);

watch(
  () => validationActions.createSpErrorI18nKey.value,
  (key) => {
    if (key) {
      toast.add({ title: t(key), tone: "error" });
    }
  },
);

watch(writeFeedback, (fb) => {
  if (fb.errorI18nKey && !fb.isGateBlock) {
    toast.add({ title: t(fb.errorI18nKey), tone: "error" });
  }
});

watch(
  [() => detail.value, activeTab],
  () => {
    if (!detail.value) return;
    if (!guard.isTabAccessible(activeTab.value)) {
      switchTab("log");
    }
  },
  { immediate: true },
);

/**
 * 子组件程序化跳转 Tab 时复用与 Tab 条相同的终态守门，避免无效 `?tab=` 与视图抖动。
 * @param tab - 目标 tab
 */
function guardedSwitchTab(tab: (typeof tabs)[number]["key"]): void {
  if (!guard.isTabAccessible(tab)) {
    switchTab("log");
    return;
  }
  switchTab(tab);
}

/**
 * 依据失败结案信息触发失败结案操作。
 * @returns 无。
 */
const {
  failureCloseCase,
  editModalOpen,
  editSaving,
  onSaveCaseEdit,
  spCreateModalOpen,
  openSpCreateModal,
  closeSpCreateModal,
  onSubmissionPackageCreate,
  onPhaseSubmit,
  taskModalOpen,
  taskModalSubmitting,
  openCreateTaskModal,
  onTaskSubmit,
  onPublishMessage,
  deadlineModalOpen,
  deadlineModalSubmitting,
  openCreateDeadlineModal,
  onDeadlineSubmit,
  formGenModalOpen,
  formGenModalSubmitting,
  formGenModalPreset,
  openGenerateFormModal,
  closeGenerateFormModal,
  onDeleteDraftGeneratedDoc,
  onFormGenSubmit,
} = useCaseDetailModals({
  detail,
  t,
  updateCaseFields,
  failureClose,
  phaseMenu,
  createTask,
  createReminder,
  createGeneratedDocument,
  deleteDraftGeneratedDocument,
  publishMessage,
  validationActions,
});

const { onOpenCollection, onViewReceipt } = useCaseDetailBillingLinks({
  caseId,
  detail,
  router,
});
</script>

<template>
  <div class="case-detail-view">
    <template v-if="detail">
      <CaseDetailHeader
        :detail="detail"
        :is-bmv-case="isBmvCase"
        :can-edit="guard.canEdit.value"
        :can-transition="guard.canTransition.value"
        @edit="editModalOpen = true"
        @transition="phaseMenu.openMenu()"
      />

      <CaseDetailStatusBanners :detail="detail" :readonly="isReadonly" />

      <CaseDetailTabBar
        :tabs="tabs"
        :active-tab="activeTab"
        :counters="tabCounters"
        :is-tab-accessible="guard.isTabAccessible"
        @select="switchTab"
      />

      <section
        class="case-detail-view__panel"
        role="tabpanel"
        :id="`casePanel-${activeTab}`"
        :aria-labelledby="`caseTab-${activeTab}`"
      >
        <CaseOverviewTab
          v-if="activeTab === 'overview'"
          :detail="detail"
          :write-feedback="writeFeedback"
          :readonly="isReadonly"
          :is-terminal="isTerminal"
          :can-run-validation="false"
          @switch-tab="guardedSwitchTab"
          @open-collection="onOpenCollection"
          @advance-to-coe="transitionWorkflowStep('COE_SENT')"
          @retry-reminder="retryReminderCreation()"
          @failure-close="failureCloseCase()"
        />
        <CaseInfoTab
          v-else-if="activeTab === 'info'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseDocumentsTab
          v-else-if="activeTab === 'documents'"
          :detail="detail"
          :readonly="isReadonly"
          @refresh="() => void refetch()"
        />
        <CaseDeadlinesTab
          v-else-if="activeTab === 'deadlines'"
          :detail="detail"
          :readonly="isReadonly"
          @open-create-deadline="openCreateDeadlineModal"
        />
        <CaseFormsTab
          v-else-if="activeTab === 'forms'"
          :detail="enrichedDetail ?? detail"
          :readonly="isReadonly"
          :templates-loading="formTemplatesLoading"
          @open-generate-modal="openGenerateFormModal"
          @finalize="finalizeGeneratedDocument"
          @delete-draft="onDeleteDraftGeneratedDoc"
        />
        <CaseTasksTab
          v-else-if="activeTab === 'tasks'"
          :detail="detail"
          :readonly="isReadonly"
          @open-create-task="openCreateTaskModal"
          @complete-task="completeTask"
        />
        <CaseMessagesTab
          v-else-if="activeTab === 'messages'"
          :detail="detail"
          :readonly="isReadonly"
          :publish-success-nonce="publishMessageSuccessNonce"
          :write-submitting="writeFeedback.submitting"
          @publish-message="onPublishMessage"
        />
        <CaseLogTab
          v-else-if="activeTab === 'log'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseValidationTab
          v-else-if="activeTab === 'validation'"
          :detail="detail"
          :readonly="isReadonly"
          :rerun-loading="validationActions.rerunLoading.value"
          :rerun-error="validationActions.rerunError.value"
          :create-sp-loading="validationActions.createSpLoading.value"
          :review-loading="validationActions.reviewLoading.value"
          :advance-stage-loading="writeFeedback.submitting"
          @switch-tab="guardedSwitchTab"
          @open-risk-modal="openRiskModal"
          @rerun-validation="validationActions.rerunValidation"
          @create-submission-package="openSpCreateModal"
          @start-review="validationActions.createReviewRequest"
          @advance-stage="(s) => transitionStage(s)"
        />
        <CaseBillingTab
          v-else-if="activeTab === 'billing'"
          :detail="detail"
          :readonly="isReadonly"
          @open-collection="onOpenCollection"
          @view-receipt="onViewReceipt"
        />
      </section>

      <CaseRiskConfirmModal
        :visible="showRiskModal"
        @close="closeRiskModal"
        @confirm="onRiskConfirm"
      />

      <CaseEditModal
        :open="editModalOpen"
        :case-name="detail.title"
        :due-at="detail.targetDateInput"
        :accepted-at="detail.acceptedDateInput"
        :group-id="detail.groupId"
        :priority="detail.priority"
        :risk-level="detail.riskLevel"
        :owner-user-id="detail.ownerUserId"
        :assistant-user-id="detail.assistantUserId"
        :jurisdiction-authority="detail.jurisdictionAuthority"
        :remark="detail.remark"
        :submitting="editSaving"
        @close="editModalOpen = false"
        @save="onSaveCaseEdit"
      />

      <CaseDeadlineCreateModal
        :open="deadlineModalOpen"
        :case-id="caseId"
        :submitting="deadlineModalSubmitting"
        :error-message-key="writeFeedback.errorI18nKey"
        @close="
          deadlineModalOpen = false;
          clearWriteFeedback();
        "
        @submit="onDeadlineSubmit"
      />

      <CaseFormGenerateModal
        :open="formGenModalOpen"
        :case-name="detail.title"
        :preset-template="formGenModalPreset"
        :submitting="formGenModalSubmitting"
        @close="closeGenerateFormModal"
        @submit="onFormGenSubmit"
      />

      <CaseTaskCreateModal
        :open="taskModalOpen"
        :case-id="caseId"
        :submitting="taskModalSubmitting"
        :error-message-key="writeFeedback.errorI18nKey"
        @close="
          taskModalOpen = false;
          clearWriteFeedback();
        "
        @submit="onTaskSubmit"
      />

      <SubmissionPackageCreateModal
        :open="spCreateModalOpen"
        :submitting="validationActions.createSpLoading.value"
        :default-authority-name="detail?.jurisdictionAuthority ?? null"
        @close="closeSpCreateModal"
        @submit="onSubmissionPackageCreate"
      />

      <PhaseTransitionPopover
        :menu-open="phaseMenu.menuOpen.value"
        :current-phase="detail?.businessPhase ?? null"
        :available-targets="phaseMenu.availableTargets.value"
        :transition-guards="detail?.transitionGuards ?? {}"
        :submitting="phaseMenu.submitting.value"
        :error-message="phaseMenu.errorMessage.value"
        :error-code="phaseMenu.errorCode.value"
        @close="phaseMenu.closeMenu()"
        @submit="onPhaseSubmit"
      />
    </template>

    <div v-else-if="loading" class="case-detail-view__loading" role="status">
      <span>{{ t("cases.detail.loading") }}</span>
    </div>

    <div v-else-if="notFound" class="case-detail-view__not-found">
      <p>
        {{
          t(`cases.detail.notFound.${notFoundReason ?? "notFound"}.message`, {
            id: caseId,
          })
        }}
      </p>
      <a :href="buildCaseListHref()">{{
        t("cases.detail.notFound.backLink")
      }}</a>
    </div>
  </div>
</template>

<style scoped src="./CaseDetailView.css"></style>
