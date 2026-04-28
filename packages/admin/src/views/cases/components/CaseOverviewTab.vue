<script setup lang="ts">
/* eslint-disable max-lines */
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import CaseOverviewSidebar from "./CaseOverviewSidebar.vue";
import CaseWorkflowStepSection from "./CaseWorkflowStepSection.vue";
import CaseSurveyQuoteSection from "./CaseSurveyQuoteSection.vue";
import CaseCustomerBackLink from "./CaseCustomerBackLink.vue";
import CaseProviderProgress from "./CaseProviderProgress.vue";
import CaseFinalPaymentCoeGate from "./CaseFinalPaymentCoeGate.vue";
import CaseSupplementRoundPanel from "./CaseSupplementRoundPanel.vue";
import CaseReminderFailureBanner from "./CaseReminderFailureBanner.vue";
import CaseFailureCloseoutBanner from "./CaseFailureCloseoutBanner.vue";
import type { CaseDetailTab } from "../types";
import type { CaseDetail } from "../types-detail";
import type { WriteActionFeedback } from "../model/useCaseDetailWriteActions";

/** 概览 Tab：展示案件摘要卡片、提供方进度、下一步动作、近期动态与侧边栏。 */
const { t } = useI18n();
defineProps<{
  detail: CaseDetail;
  writeFeedback?: WriteActionFeedback;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
  (e: "advanceToCoe"): void;
  (e: "retryReminder"): void;
  (e: "failureClose"): void;
}>();

/**
 * 将时间线颜色键映射为实际颜色值。
 * @param color - 时间线颜色键。
 * @returns 对应的颜色值。
 */
function timelineColor(color: string): string {
  const map: Record<string, string> = {
    primary: "var(--color-primary-6)",
    warning: "#f59e0b",
    success: "var(--color-success)",
    danger: "var(--color-danger)",
    border: "var(--color-border-2)",
  };
  return map[color] ?? "var(--color-border-2)";
}
</script>

<template>
  <div class="overview-tab">
    <CaseCustomerBackLink
      v-if="detail.customerId"
      :customer-id="detail.customerId"
      :client="detail.client"
      :group-name="detail.groupName"
    />

    <div class="overview-tab__grid-4">
      <Card padding="md">
        <div class="overview-tab__stat" data-testid="overview-card-stage">
          <span class="overview-tab__stat-label">{{
            t("cases.detail.overview.cards.stage")
          }}</span>
          <span class="overview-tab__stat-value">{{ detail.stage }}</span>
          <span class="overview-tab__stat-meta">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ detail.stageMeta }}
          </span>
          <!-- BMV parallel step display -->
          <div
            v-if="detail.workflowStep"
            class="overview-tab__parallel-step"
            :class="{
              'overview-tab__parallel-step--danger':
                detail.workflowStep.isFailureStep,
            }"
            data-testid="overview-card-workflow-step"
          >
            <span class="overview-tab__parallel-step-arrow" aria-hidden="true">
              →
            </span>
            <span class="overview-tab__parallel-step-label">
              {{ detail.workflowStep.stepLabel }}
            </span>
            <span class="overview-tab__parallel-step-stage">
              {{ detail.workflowStep.parentStage }}
            </span>
          </div>
        </div>
      </Card>
      <Card padding="md">
        <div class="overview-tab__stat" data-testid="overview-card-deadline">
          <span class="overview-tab__stat-label">{{
            t("cases.detail.overview.cards.deadline")
          }}</span>
          <span
            :class="[
              'overview-tab__stat-value',
              { 'overview-tab__stat-value--danger': detail.deadlineDanger },
            ]"
            >{{ detail.deadline }}</span
          >
          <span
            :class="[
              'overview-tab__stat-meta',
              { 'overview-tab__stat-meta--danger': detail.deadlineDanger },
            ]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ detail.deadlineMeta }}
          </span>
        </div>
      </Card>
      <Card padding="md">
        <div class="overview-tab__stat" data-testid="overview-card-progress">
          <span class="overview-tab__stat-label">{{
            t("cases.detail.overview.cards.progress")
          }}</span>
          <div class="overview-tab__progress-row">
            <span class="overview-tab__stat-value"
              >{{ detail.progressPercent }}%</span
            >
            <div class="overview-tab__progress-track">
              <div
                class="overview-tab__progress-fill"
                :style="{ width: `${detail.progressPercent}%` }"
              />
            </div>
          </div>
          <span class="overview-tab__stat-meta">{{
            detail.progressCount
          }}</span>
        </div>
      </Card>
      <Card padding="md">
        <div class="overview-tab__stat" data-testid="overview-card-billing">
          <span class="overview-tab__stat-label">{{
            t("cases.detail.overview.cards.billing")
          }}</span>
          <span class="overview-tab__stat-value">{{
            detail.billingAmount
          }}</span>
          <span class="overview-tab__stat-meta">{{ detail.billingMeta }}</span>
        </div>
      </Card>
    </div>

    <CaseWorkflowStepSection
      v-if="detail.workflowStep"
      :workflow-step="detail.workflowStep"
      :management-stage="detail.stageCode"
      :supplement-count="detail.supplementCount"
    />

    <CaseSurveyQuoteSection
      v-if="detail.surveyStatus || detail.quoteStatus"
      :survey-status="detail.surveyStatus"
      :quote-status="detail.quoteStatus"
      :pre-sign-gate="detail.preSignGate"
    />

    <!-- P1 Final Payment & COE Gate (p1-fe-004-01) -->
    <CaseFinalPaymentCoeGate
      v-if="detail.finalPaymentGate"
      :gate="detail.finalPaymentGate"
      :write-feedback="writeFeedback"
      :readonly="readonly ?? detail.readonly"
      @advance-to-coe="emit('advanceToCoe')"
      @switch-tab="(tab) => emit('switchTab', tab as CaseDetailTab)"
    />

    <CaseSupplementRoundPanel
      v-if="detail.supplementRound"
      :info="detail.supplementRound"
      :readonly="readonly ?? detail.readonly"
      @switch-tab="(tab) => emit('switchTab', tab as CaseDetailTab)"
    />
    <CaseReminderFailureBanner
      v-if="detail.reminderFailure"
      :info="detail.reminderFailure"
      :write-feedback="writeFeedback"
      :readonly="readonly ?? detail.readonly"
      @retry-reminder="emit('retryReminder')"
    />

    <!-- P1 Failure Closeout Banner (p1-fe-005-02) -->
    <CaseFailureCloseoutBanner
      v-if="detail.failureCloseout"
      :closeout="detail.failureCloseout"
      :customer-id="detail.customerId"
      :client-name="detail.client"
      :readonly="readonly ?? detail.readonly"
      :write-feedback="writeFeedback"
      @close-case="emit('failureClose')"
      @switch-tab="(tab) => emit('switchTab', tab as CaseDetailTab)"
    />

    <CaseProviderProgress :items="detail.providerProgress" />

    <div class="overview-tab__main-grid">
      <div class="overview-tab__main-left">
        <div class="overview-tab__next-action">
          <div class="overview-tab__next-action-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="overview-tab__next-action-body">
            <h3 class="overview-tab__next-action-title">
              {{ t("cases.detail.overview.nextAction.title") }}
            </h3>
            <p class="overview-tab__next-action-text">
              {{ detail.nextAction }}
            </p>
            <div class="overview-tab__next-action-buttons">
              <Button
                variant="filled"
                tone="primary"
                size="sm"
                @click="
                  emit(
                    'switchTab',
                    detail.overviewActions.primary.tab as CaseDetailTab,
                  )
                "
              >
                {{ detail.overviewActions.primary.label }}
              </Button>
              <Button
                size="sm"
                @click="
                  emit(
                    'switchTab',
                    detail.overviewActions.secondary.tab as CaseDetailTab,
                  )
                "
              >
                {{ detail.overviewActions.secondary.label }}
              </Button>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <Card :title="t('cases.detail.overview.timeline.title')" padding="md">
          <div class="overview-tab__timeline">
            <div
              v-for="(entry, i) in detail.timeline"
              :key="i"
              class="overview-tab__timeline-item"
            >
              <span
                class="overview-tab__timeline-dot"
                :style="{ backgroundColor: timelineColor(entry.color) }"
              />
              <div>
                <div class="overview-tab__timeline-text">{{ entry.text }}</div>
                <div class="overview-tab__timeline-meta">{{ entry.meta }}</div>
              </div>
            </div>
          </div>
          <template #footer>
            <button
              class="overview-tab__timeline-more"
              type="button"
              @click="emit('switchTab', 'log')"
            >
              {{ t("cases.detail.overview.timeline.viewAll") }}
            </button>
          </template>
        </Card>
      </div>

      <CaseOverviewSidebar
        :detail="detail"
        @switch-tab="(tab) => emit('switchTab', tab)"
      />
    </div>
  </div>
</template>

<style scoped>
.overview-tab {
  display: grid;
  gap: 20px;
}

.overview-tab__grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1024px) {
  .overview-tab__grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .overview-tab__grid-4 {
    grid-template-columns: 1fr;
  }
}

.overview-tab__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.overview-tab__stat-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.overview-tab__stat-value {
  font-size: 22px;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  line-height: 1.2;
}
.overview-tab__stat-value--danger {
  color: var(--color-danger);
}
.overview-tab__stat-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
.overview-tab__stat-meta--danger {
  color: var(--color-danger);
}
.overview-tab__parallel-step {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 3px 8px;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-md, 6px);
  background: rgba(var(--color-primary-rgb, 3, 105, 161), 0.05);
  border: 1px solid rgba(var(--color-primary-rgb, 3, 105, 161), 0.1);
  width: fit-content;
}
.overview-tab__parallel-step--danger {
  background: rgba(220, 38, 38, 0.05);
  border-color: rgba(220, 38, 38, 0.1);
}
.overview-tab__parallel-step-arrow {
  color: var(--color-text-3);
  font-size: 11px;
}
.overview-tab__parallel-step-label {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
}
.overview-tab__parallel-step--danger .overview-tab__parallel-step-label {
  color: #991b1b;
}
.overview-tab__parallel-step-stage {
  padding: 0 4px;
  font-size: 10px;
  font-weight: var(--font-weight-black);
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  color: var(--color-text-3);
}

.overview-tab__progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}
.overview-tab__progress-track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.overview-tab__progress-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.overview-tab__main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}
@media (max-width: 1024px) {
  .overview-tab__main-grid {
    grid-template-columns: 1fr;
  }
}
.overview-tab__main-left {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-tab__next-action {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #fffaf5 0%, var(--color-bg-1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-xl);
}
.overview-tab__next-action-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: #fff;
  border: 1px solid rgba(245, 158, 11, 0.2);
  box-shadow: var(--shadow-1);
  color: #f59e0b;
}
.overview-tab__next-action-body {
  flex: 1;
  min-width: 0;
}
.overview-tab__next-action-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.overview-tab__next-action-text {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  line-height: 1.6;
}
.overview-tab__next-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.overview-tab__timeline {
  position: relative;
  margin-left: 12px;
  padding-left: 20px;
  border-left: 2px solid var(--color-border-1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.overview-tab__timeline-item {
  position: relative;
  display: flex;
  flex-direction: column;
}
.overview-tab__timeline-dot {
  position: absolute;
  left: -27px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}
.overview-tab__timeline-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
.overview-tab__timeline-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
}
.overview-tab__timeline-more {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  cursor: pointer;
  text-align: center;
}
.overview-tab__timeline-more:hover {
  color: var(--color-text-1);
}
</style>
