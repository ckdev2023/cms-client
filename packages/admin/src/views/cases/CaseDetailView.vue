<script setup lang="ts">
/* eslint-disable max-lines */
import { computed, ref } from "vue";
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
import PhaseTransitionPopover from "./components/PhaseTransitionPopover.vue";
import {
  useCaseDetailModel,
  type TabCounter,
} from "./model/useCaseDetailModel";
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

/** 案件详情页：承载详情头部、Tab 切换与写操作反馈。 */
const { t } = useI18n();
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
  notFound,
  isReadonly,
  tabCounters,
  loading,
  showRiskModal,
  isBmvCase,
  writeFeedback,
  switchTab,
  openRiskModal,
  closeRiskModal,
  transitionWorkflowStep,
  retryReminderCreation,
  failureClose,
  updateCaseFields,
  phaseMenu,
  isTerminalPhase: isTerminal,
} = useCaseDetailModel(caseId, {
  routeTab,
  onTabChange: (tab) =>
    router.replace({ query: buildCaseDetailQuery({ tab }) }),
});

/**
 * 将状态徽标映射为 `Chip` 组件使用的 tone。
 * @param badge - 后端返回的徽标键。
 * @returns 对应的 `ChipTone`。
 */
function badgeToTone(badge: string): ChipTone {
  return (BADGE_TONE_MAP[badge] ?? "neutral") as ChipTone;
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
}): Promise<void> {
  editSaving.value = true;
  const ok = await updateCaseFields({ ...fields });
  editSaving.value = false;
  if (ok) editModalOpen.value = false;
}

/** 导出 ZIP（stub — 功能尚未上線）。 */
function onExportZip(): void {
  toast.add({
    title: t("cases.detail.actions.exportZipNotReady"),
    tone: "info",
  });
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

/** 跳转到任务页面，新建任务。 */
function onOpenCreateTask(): void {
  router.push({ path: "/tasks", query: { case: caseId.value } });
}
</script>

<template>
  <div class="case-detail-view">
    <template v-if="detail">
      <PageHeader
        :title="detail.title"
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
                {{ detail.client }}
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
          <Button size="sm" @click="editModalOpen = true">
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
          <Button size="sm" @click="onExportZip">
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
            @click="phaseMenu.openMenu()"
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
          type="button"
          role="tab"
          :id="`caseTab-${tab.key}`"
          :aria-controls="`casePanel-${tab.key}`"
          :class="['case-detail-view__tab', { active: activeTab === tab.key }]"
          :aria-selected="activeTab === tab.key"
          @click="switchTab(tab.key)"
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
        />
        <CaseDeadlinesTab
          v-else-if="activeTab === 'deadlines'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseFormsTab
          v-else-if="activeTab === 'forms'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseTasksTab
          v-else-if="activeTab === 'tasks'"
          :detail="detail"
          :readonly="isReadonly"
          @open-create-task="onOpenCreateTask"
        />
        <CaseMessagesTab
          v-else-if="activeTab === 'messages'"
          :detail="detail"
          :readonly="isReadonly"
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
          @switch-tab="switchTab"
          @open-risk-modal="openRiskModal"
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
        @confirm="closeRiskModal"
      />

      <CaseEditModal
        :open="editModalOpen"
        :case-name="detail.title"
        :due-at="detail.targetDate"
        :accepted-at="detail.acceptedDate"
        :group-id="detail.groupId"
        :submitting="editSaving"
        @close="editModalOpen = false"
        @save="onSaveCaseEdit"
      />

      <PhaseTransitionPopover
        :menu-open="phaseMenu.menuOpen.value"
        :current-phase="detail?.businessPhase ?? null"
        :available-targets="phaseMenu.availableTargets.value"
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
      <p>{{ t("cases.detail.notFound.message", { id: caseId }) }}</p>
      <a :href="buildCaseListHref()">{{
        t("cases.detail.notFound.backLink")
      }}</a>
    </div>
  </div>
</template>

<style scoped>
.case-detail-view {
  display: grid;
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
  color: #991b1b;
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

.case-detail-view__tab:hover {
  color: var(--color-text-1);
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
    color: #92400e;
  }
  &--danger {
    background: rgba(220, 38, 38, 0.1);
    color: #991b1b;
  }
}

.case-detail-view__panel {
  display: grid;
  gap: 16px;
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
