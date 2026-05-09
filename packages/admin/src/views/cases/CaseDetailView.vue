<script setup lang="ts">
/* eslint-disable max-lines */
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "../../shared/model/useToast";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Chip, { type ChipTone } from "../../shared/ui/Chip.vue";
import Button from "../../shared/ui/Button.vue";
import StageChip from "./components/StageChip.vue";
import CaseOverviewTab from "./components/CaseOverviewTab.vue";
import CaseInfoTab from "./components/CaseInfoTab.vue";
import CaseDocumentsTab from "./components/CaseDocumentsTab.vue";
import CaseDeadlinesTab from "./components/CaseDeadlinesTab.vue";
import CaseFormsTab from "./components/CaseFormsTab.vue";
import CaseTasksTab from "./components/CaseTasksTab.vue";
import CaseMessagesTab from "./components/CaseMessagesTab.vue";
import CaseLogTab from "./components/CaseLogTab.vue";
import CaseValidationTab from "./components/CaseValidationTab.vue";
import CaseBillingTab from "./components/CaseBillingTab.vue";
import CaseRiskConfirmModal from "./components/CaseRiskConfirmModal.vue";
import CaseEditModal from "./components/CaseEditModal.vue";
import CaseDeadlineCreateModal from "./components/CaseDeadlineCreateModal.vue";
import CaseFormGenerateModal from "./components/CaseFormGenerateModal.vue";
import CaseTaskCreateModal from "./components/CaseTaskCreateModal.vue";
import PhaseTransitionPopover from "./components/PhaseTransitionPopover.vue";
import {
  useCaseDetailModel,
  type TabCounter,
} from "./model/useCaseDetailModel";
import { resolveLocalizedCustomerName } from "./model/CaseAdapterCustomerLocale";
import {
  buildCaseDetailQuery,
  buildCaseListHref,
  buildCustomerDetailHref,
} from "./query";
import {
  BADGE_TONE_MAP,
  getPhaseI18nKey,
  getPhaseBadge,
  getStageI18nKey,
} from "./constants";
import { formatCaseIdentity } from "./caseIdentity";
import { getCaseTypeI18nKey } from "../../shared/model/caseTypeI18n";
import {
  buildFallbackName,
  isFallbackTitle,
} from "../../shared/model/caseTitleFallback";
import { useCaseDetailGuard } from "./model/useCaseDetailGuard";
import { useCaseValidationActions } from "./model/useCaseValidationActions";
import { useCaseFormsExportPolling } from "./model/useCaseFormsExportPolling";

/** 案件详情页：承载详情头部、Tab 切换与写操作反馈。 */
const { t, locale } = useI18n();
const tabRefs = ref<HTMLElement[]>([]);
const toast = useToast();
const route = useRoute();
const router = useRouter();

/**
 * 解析 Tab 计数器展示文案，优先使用 i18n 文案。
 * @param c - Tab 计数器配置。
 * @returns 当前计数器应展示的文本。
 */
function counterLabel(c: TabCounter): string {
  return c.i18nKey ? t(c.i18nKey, c.i18nParams ?? {}) : c.label;
}
const caseId = computed(() => route.params.id as string);
const routeTab = computed(() => {
  const raw = route.query.tab;
  return typeof raw === "string" ? raw : undefined;
});
const {
  activeTab,
  tabs,
  detail,
  enrichedDetail,
  formTemplates,
  notFound,
  notFoundReason,
  isReadonly,
  tabCounters,
  loading,
  showRiskModal,
  isBmvCase,
  writeFeedback,
  clearWriteFeedback,
  switchTab,
  openRiskModal,
  closeRiskModal,
  transitionWorkflowStep,
  retryReminderCreation,
  failureClose,
  updateCaseFields,
  publishMessage,
  createReminder,
  createGeneratedDocument,
  finalizeGeneratedDocument,
  exportGeneratedDocument,
  createTask,
  completeTask,
  phaseMenu,
  isTerminalPhase: isTerminal,
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
    switchTab("validation");
  },
  onReviewRequestSuccess: () => void refetch(),
  onRiskAckSuccess: () => {
    closeRiskModal();
    void refetch();
  },
});

const guard = useCaseDetailGuard(detail);

useCaseFormsExportPolling(detail, refetch);

const clientDisplayName = computed(() => {
  const d = detail.value;
  if (!d) return "";
  return resolveLocalizedCustomerName(
    d.customerLocalizedNames,
    d.client,
    locale.value,
  );
});

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
      router.replace({ query: buildCaseDetailQuery({ tab: "log" }) });
    }
  },
  { immediate: true },
);

/**
 * 将状态徽标映射为 `Chip` 组件使用的 tone。
 * @param badge - 后端返回的徽标键。
 * @returns 对应的 `ChipTone`。
 */
function badgeToTone(badge: string): ChipTone {
  return (BADGE_TONE_MAP[badge] ?? "neutral") as ChipTone;
}

/**
 * 处理 tab 键盘导航（ArrowLeft/Right/Home/End），跳过终态下不可访问的 tab。
 * @param event - 键盘事件
 */
function onTabKeydown(event: KeyboardEvent): void {
  const idx = tabs.findIndex((t) => t.key === activeTab.value);
  let targetIdx = -1;

  switch (event.key) {
    case "ArrowRight":
      targetIdx = findNextAccessibleTab(idx, 1);
      break;
    case "ArrowLeft":
      targetIdx = findNextAccessibleTab(idx, -1);
      break;
    case "Home":
      targetIdx = findNextAccessibleTab(-1, 1);
      break;
    case "End":
      targetIdx = findNextAccessibleTab(tabs.length, -1);
      break;
    default:
      return;
  }
  if (targetIdx < 0) return;
  event.preventDefault();
  switchTab(tabs[targetIdx].key);
  tabRefs.value[targetIdx]?.focus();
}

/**
 * 从指定索引出发，按方向查找下一个可访问的 tab 索引。
 *
 * @param fromIdx - 起始索引
 * @param direction - 搜索方向（1 向右，-1 向左）
 * @returns 可访问的 tab 索引，找不到时返回 -1
 */
function findNextAccessibleTab(fromIdx: number, direction: 1 | -1): number {
  const len = tabs.length;
  for (let i = 1; i <= len; i++) {
    const candidate = (fromIdx + direction * i + len) % len;
    if (guard.isTabAccessible(tabs[candidate].key)) return candidate;
  }
  return -1;
}

/**
 * 点击 tab 时守门：不可访问的 tab 不切换。
 *
 * @param tabKey - 目标 tab 键名
 */
function onTabClick(tabKey: (typeof tabs)[number]["key"]): void {
  if (!guard.isTabAccessible(tabKey)) return;
  switchTab(tabKey);
}

const phaseTone = computed<ChipTone>(() => {
  if (!detail.value) return "neutral";
  return badgeToTone(getPhaseBadge(detail.value.businessPhase));
});

const phaseLabel = computed(() => {
  if (!detail.value) return "";
  const key = getPhaseI18nKey(detail.value.businessPhase);
  return key ? t(key) : detail.value.businessPhase;
});

const displayTitle = computed(() => {
  const d = detail.value;
  if (!d) return "";
  const fp = d.titleFallbackParts;
  if (!isFallbackTitle(d.title, fp.caseNo, fp.id)) return d.title;
  const typeKey = getCaseTypeI18nKey(fp.caseTypeCode);
  const typeLabel = typeKey ? t(typeKey) : "";
  const translated = typeLabel && typeLabel !== typeKey ? typeLabel : "";
  return buildFallbackName(fp.applicant, translated, fp.caseNo, fp.id);
});

const stageLabel = computed(() => {
  if (!detail.value) return "";
  const key = getStageI18nKey(detail.value.stageCode);
  return key ? t(key) : detail.value.stage;
});

/**
 * 依据失败结案信息触发失败结案操作。
 * @returns 无。
 */
function failureCloseCase(): void {
  const fc = detail.value?.failureCloseout;
  if (!fc) return;
  const reason = fc.reasonLabel ?? fc.reasonCode ?? undefined;
  failureClose(reason);
}

const editModalOpen = ref(false);
const editSaving = ref(false);

async function onSaveCaseEdit(fields: {
  caseName: string;
  dueAt: string;
  acceptedAt: string;
  riskLevel: string;
  ownerUserId: string;
  assistantUserId: string;
  groupId: string;
  priority: string;
  jurisdictionAuthority: string;
  remark: string;
}): Promise<void> {
  editSaving.value = true;
  const ok = await updateCaseFields({ ...fields });
  editSaving.value = false;
  if (ok) editModalOpen.value = false;
}

/**
 * 提交业务阶段流转请求。
 *
 * @param payload - 流转载荷
 * @param payload.toPhase - 目标阶段
 * @param payload.closeReason - 关闭原因
 * @param payload.resultOutcome - 结果
 */
function onPhaseSubmit(payload: {
  toPhase: string;
  closeReason?: string;
  resultOutcome?: string;
}): void {
  void phaseMenu.performTransition(payload.toPhase, {
    closeReason: payload.closeReason,
    resultOutcome: payload.resultOutcome,
  });
}

/** 跳转到收费页面，打开回款登记。 */
function onOpenCollection(): void {
  router.push({ path: "/billing", query: { case: caseId.value } });
}

/** 跳转到收费页面，查看收据。 */
function onViewReceipt(): void {
  router.push({ path: "/billing", query: { case: caseId.value } });
}

const taskModalOpen = ref(false);
const taskModalSubmitting = ref(false);

/** 打开创建任务弹窗（替代原 router.push 到 /tasks 的死循环）。 */
function openCreateTaskModal(): void {
  taskModalOpen.value = true;
}

/**
 * 提交任务创建表单。
 *
 * @param payload - 任务创建数据
 * @param payload.title - 任务标题
 * @param payload.description - 任务描述
 * @param payload.priority - 优先级
 * @param payload.dueAt - 截止日期
 * @param payload.assigneeUserId - 负责人 ID
 */
async function onTaskSubmit(payload: {
  title: string;
  description?: string;
  priority: import("./model/CaseAdapterTaskWriteBuilders").TaskPriorityChoice;
  dueAt?: string;
  assigneeUserId?: string;
}): Promise<void> {
  taskModalSubmitting.value = true;
  const ok = await createTask(payload);
  taskModalSubmitting.value = false;
  if (ok) taskModalOpen.value = false;
}

/**
 * 发布沟通记录。
 *
 * @param payload - 消息载荷
 * @param payload.content - 内容
 * @param payload.channelChoice - 渠道
 */
function onPublishMessage(payload: {
  content: string;
  channelChoice: import("./model/CaseAdapterMessageWriteBuilders").MessageChannelChoice;
}): void {
  void publishMessage(payload);
}

const deadlineModalOpen = ref(false);
const deadlineModalSubmitting = ref(false);

/** 打开创建期限弹窗。 */
function openCreateDeadlineModal(): void {
  deadlineModalOpen.value = true;
}

/**
 * 提交期限创建表单。
 *
 * @param payload - 期限表单数据
 * @param payload.targetType - 目标类型
 * @param payload.remindAt - 提醒日期
 * @param payload.kind - 期限分类
 * @param payload.memo - 备注
 */
async function onDeadlineSubmit(payload: {
  targetType: "case" | "case_party_residence";
  remindAt: string;
  kind: import("./model/CaseAdapterReminderWriteBuilders").DeadlineKindChoice;
  memo: string;
}): Promise<void> {
  deadlineModalSubmitting.value = true;
  const ok = await createReminder(payload);
  deadlineModalSubmitting.value = false;
  if (ok) deadlineModalOpen.value = false;
}

const formGenModalOpen = ref(false);
const formGenModalSubmitting = ref(false);
const formGenInitialTemplateId = ref<string | null>(null);

/**
 * 打开生成文书弹窗。
 * @param templateId 预选模板 ID
 */
function openGenerateFormModal(templateId?: string): void {
  formGenInitialTemplateId.value = templateId ?? null;
  formGenModalOpen.value = true;
}

/**
 * 提交文书生成表单。
 *
 * @param payload - 文书生成数据
 * @param payload.title - 标题
 * @param payload.templateId - 模板 ID
 * @param payload.outputFormat - 输出格式
 */
async function onFormGenSubmit(payload: {
  title: string;
  templateId: string | null;
  outputFormat: string;
}): Promise<void> {
  formGenModalSubmitting.value = true;
  const ok = await createGeneratedDocument(payload);
  formGenModalSubmitting.value = false;
  if (ok) formGenModalOpen.value = false;
}
</script>

<template>
  <div class="case-detail-view">
    <template v-if="detail">
      <PageHeader
        :title="displayTitle"
        :breadcrumbs="[
          { label: t('shell.nav.items.dashboard'), href: '#/' },
          { label: t('shell.nav.groups.business') },
          { label: t('shell.nav.items.cases'), href: buildCaseListHref() },
          { label: formatCaseIdentity(detail.caseNo, detail.id) },
        ]"
      >
        <template #badge>
          <StageChip :code="detail.stageCode" precision="both" dot />
          <Chip :tone="phaseTone" dot>
            {{ phaseLabel }}
          </Chip>
          <Chip
            v-if="isBmvCase && detail.workflowStep"
            :tone="detail.workflowStep.isFailureStep ? 'danger' : 'primary'"
            dot
          >
            {{ detail.workflowStep.parentStage }} →
            {{ detail.workflowStep.stepLabel }}
          </Chip>
        </template>
        <template #meta>
          <p class="case-detail-view__meta">
            <span class="case-detail-view__meta-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <a
                :href="buildCustomerDetailHref(detail.customerId)"
                class="case-detail-view__meta-link"
              >
                {{ clientDisplayName }}
              </a>
            </span>
            <span class="case-detail-view__meta-sep" aria-hidden="true">|</span>
            <span class="case-detail-view__meta-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              {{ detail.owner }}
            </span>
            <span class="case-detail-view__meta-sep" aria-hidden="true">|</span>
            <span class="case-detail-view__meta-item">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
                />
              </svg>
              {{ detail.agency }}
            </span>
          </p>
        </template>

        <template #actions>
          <Button
            size="sm"
            :disabled="!guard.canEdit.value"
            :title="
              guard.canEdit.value
                ? undefined
                : t('cases.detail.actions.editInfoDisabledTooltip')
            "
            @click="guard.canEdit.value && (editModalOpen = true)"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            {{ t("cases.detail.actions.editInfo") }}
          </Button>
          <Button
            size="sm"
            :disabled="true"
            :title="t('cases.detail.actions.exportZipNotReady')"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {{ t("cases.detail.actions.exportZip") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!guard.canTransition.value"
            :title="
              guard.canTransition.value
                ? undefined
                : t('cases.detail.actions.statusTransitionDisabledTooltip')
            "
            @click="guard.canTransition.value && phaseMenu.openMenu()"
          >
            {{ t("cases.detail.actions.statusTransition") }}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </template>
      </PageHeader>

      <div
        v-if="isReadonly"
        class="case-detail-view__readonly-banner"
        role="status"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>
          {{ t("cases.detail.readonlyBanner", { stage: stageLabel }) }}
        </span>
      </div>

      <div
        v-if="detail.failureCloseout && !isReadonly"
        class="case-detail-view__failure-banner"
        role="status"
        data-testid="failure-path-banner"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
          />
        </svg>
        <span>{{ t("cases.detail.failurePathBanner") }}</span>
      </div>

      <div
        class="case-detail-view__tabs"
        role="tablist"
        :aria-label="t('cases.detail.tabsLabel')"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          ref="tabRefs"
          type="button"
          role="tab"
          :id="`caseTab-${tab.key}`"
          :aria-controls="`casePanel-${tab.key}`"
          :class="[
            'case-detail-view__tab',
            { active: activeTab === tab.key },
            {
              'case-detail-view__tab--disabled': !guard.isTabAccessible(
                tab.key,
              ),
            },
          ]"
          :aria-selected="activeTab === tab.key"
          :aria-disabled="!guard.isTabAccessible(tab.key) || undefined"
          :tabindex="
            !guard.isTabAccessible(tab.key)
              ? -1
              : tab.key === activeTab
                ? 0
                : -1
          "
          @click="onTabClick(tab.key)"
          @keydown="onTabKeydown($event)"
        >
          {{ t(tab.i18nKey) }}
          <span
            v-if="tabCounters[tab.key]"
            :class="[
              'case-detail-view__counter',
              {
                'case-detail-view__counter--danger':
                  tabCounters[tab.key]!.tone === 'danger',
                'case-detail-view__counter--warning':
                  tabCounters[tab.key]!.tone === 'warning',
              },
            ]"
          >
            {{ counterLabel(tabCounters[tab.key]!) }}
          </span>
        </button>
      </div>

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
          @switch-tab="switchTab"
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
          @open-generate-modal="openGenerateFormModal"
          @finalize="finalizeGeneratedDocument"
          @export="exportGeneratedDocument"
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
          @switch-tab="switchTab"
          @open-risk-modal="openRiskModal"
          @rerun-validation="validationActions.rerunValidation"
          @create-submission-package="validationActions.createSubmissionPackage"
          @start-review="validationActions.createReviewRequest"
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
        :templates="formTemplates"
        :initial-template-id="formGenInitialTemplateId"
        :submitting="formGenModalSubmitting"
        @close="formGenModalOpen = false"
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

<style scoped>
.case-detail-view {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

/* ── Meta line ───────────────────────────────────────── */

.case-detail-view__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.case-detail-view__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.case-detail-view__meta-link {
  color: var(--color-primary-6);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

.case-detail-view__meta-sep {
  color: var(--color-text-3);
}

.case-detail-view__readonly-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}

.case-detail-view__readonly-banner svg {
  flex-shrink: 0;
}

.case-detail-view__failure-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: rgba(220, 38, 38, 0.04);
  border: 1px solid rgba(220, 38, 38, 0.15);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-danger-text);
}

.case-detail-view__failure-banner svg {
  flex-shrink: 0;
  color: var(--color-danger, #dc2626);
}

.case-detail-view__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  border-bottom: 1px solid var(--color-border-1);
  overflow-x: auto;
  min-width: 0;
}

.case-detail-view__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.case-detail-view__tab:hover:not(.case-detail-view__tab--disabled) {
  color: var(--color-text-1);
}

.case-detail-view__tab--disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.case-detail-view__tab.active {
  color: var(--color-text-1);
  border-bottom-color: var(--color-text-1);
  font-weight: var(--font-weight-bold);
}

.case-detail-view__counter {
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  background: var(--color-text-1);
  color: #fff;
  &--warning {
    background: rgba(245, 158, 11, 0.16);
    color: var(--color-warning-text);
  }
  &--danger {
    background: rgba(220, 38, 38, 0.1);
    color: var(--color-danger-text);
  }
}

.case-detail-view__panel {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.case-detail-view__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.case-detail-view__not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-3);
  & a {
    color: var(--color-primary-6);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);
  }
  & a:hover {
    text-decoration: underline;
  }
}
</style>
