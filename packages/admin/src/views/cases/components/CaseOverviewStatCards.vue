<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import { resolveStageLabelI18nKey } from "../constants";
import { resolveBmvWorkflowStepDisplayLabel } from "../constantsBmvSteps";
import type { CaseDetail } from "../types-detail";

/** 概览顶部 4 张统计卡片：阶段 / 截止 / 进度 / 收费。 */
const { t } = useI18n();
const props = defineProps<{
  detail: CaseDetail;
  isTerminal?: boolean;
}>();

const stageValue = computed(() => {
  const key = resolveStageLabelI18nKey(
    props.detail.stageCode,
    props.detail.workflowStep?.stepCode,
  );
  return key ? t(key) : props.detail.stage;
});

const isWaitingPaymentNoCollection = computed(
  () =>
    props.detail.businessPhase === "WAITING_PAYMENT" &&
    props.detail.billing.payments.length === 0,
);

const isPreWaitingPaymentEmpty = computed(() => {
  const stage = props.detail.stageCode;
  return (
    (stage === "S3" || stage === "S4") &&
    props.detail.billing.payments.length === 0
  );
});

/**
 * 概览卡片中并行展示的 BMV 子步骤名称（随界面语言解析）。
 *
 * @param ws - 当前案件的 `workflowStep`（必有）
 * @returns 展示用子步骤文案
 */
function bmvWorkflowStepDisplayLabel(
  ws: NonNullable<CaseDetail["workflowStep"]>,
): string {
  return resolveBmvWorkflowStepDisplayLabel(t, ws);
}
</script>

<template>
  <div class="overview-stat-cards">
    <Card padding="md">
      <div class="overview-stat-cards__stat" data-testid="overview-card-stage">
        <span class="overview-stat-cards__stat-label">{{
          t("cases.detail.overview.cards.stage")
        }}</span>
        <span class="overview-stat-cards__stat-value">{{ stageValue }}</span>
        <span class="overview-stat-cards__stat-meta">
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
          {{
            isTerminal
              ? t("cases.detail.terminalStage.label")
              : detail.stageMeta
          }}
        </span>
        <div
          v-if="detail.workflowStep"
          class="overview-stat-cards__parallel-step"
          :class="{
            'overview-stat-cards__parallel-step--danger':
              detail.workflowStep.isFailureStep,
          }"
          data-testid="overview-card-workflow-step"
        >
          <span
            class="overview-stat-cards__parallel-step-arrow"
            aria-hidden="true"
          >
            →
          </span>
          <span class="overview-stat-cards__parallel-step-label">
            {{ bmvWorkflowStepDisplayLabel(detail.workflowStep) }}
          </span>
          <span class="overview-stat-cards__parallel-step-stage">
            {{ detail.workflowStep.parentStage }}
          </span>
        </div>
      </div>
    </Card>

    <Card padding="md">
      <div
        class="overview-stat-cards__stat"
        data-testid="overview-card-deadline"
      >
        <span class="overview-stat-cards__stat-label">{{
          t("cases.detail.overview.cards.deadline")
        }}</span>
        <span
          :class="[
            'overview-stat-cards__stat-value',
            {
              'overview-stat-cards__stat-value--danger': detail.deadlineDanger,
            },
          ]"
          >{{ detail.deadline }}</span
        >
        <span
          :class="[
            'overview-stat-cards__stat-meta',
            { 'overview-stat-cards__stat-meta--danger': detail.deadlineDanger },
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
          {{
            detail.deadlineMetaLoc
              ? t(
                  detail.deadlineMetaLoc.key,
                  detail.deadlineMetaLoc.params ?? {},
                )
              : detail.deadlineMeta
          }}
        </span>
      </div>
    </Card>

    <Card padding="md">
      <div
        class="overview-stat-cards__stat"
        data-testid="overview-card-progress"
      >
        <span class="overview-stat-cards__stat-label">{{
          t("cases.detail.overview.cards.progress")
        }}</span>
        <div class="overview-stat-cards__progress-row">
          <span class="overview-stat-cards__stat-value"
            >{{ detail.progressPercent }}%</span
          >
          <div class="overview-stat-cards__progress-track">
            <div
              class="overview-stat-cards__progress-fill"
              :style="{ width: `${detail.progressPercent}%` }"
            />
          </div>
        </div>
        <span class="overview-stat-cards__stat-meta">{{
          detail.progressCount
        }}</span>
      </div>
    </Card>

    <Card padding="md">
      <div
        class="overview-stat-cards__stat"
        data-testid="overview-card-billing"
      >
        <span class="overview-stat-cards__stat-label">{{
          t("cases.detail.overview.cards.billing")
        }}</span>
        <span class="overview-stat-cards__stat-value">{{
          detail.billingAmount
        }}</span>
        <span class="overview-stat-cards__stat-meta">{{
          detail.billingMetaKey
            ? t(detail.billingMetaKey, detail.billingMetaParams ?? {})
            : detail.billingMeta
        }}</span>
        <div
          v-if="isWaitingPaymentNoCollection"
          class="overview-stat-cards__billing-warning"
          data-testid="waiting-payment-no-billing-warning"
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
          <span>{{
            t("cases.detail.overview.billingGuard.waitingPaymentEmpty")
          }}</span>
        </div>
        <div
          v-if="isPreWaitingPaymentEmpty"
          class="overview-stat-cards__billing-warning overview-stat-cards__billing-warning--soft"
          data-testid="no-billing-record-warning"
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
          <span>{{
            t("cases.detail.overview.billingGuard.noBillingRecord")
          }}</span>
        </div>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.overview-stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1024px) {
  .overview-stat-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .overview-stat-cards {
    grid-template-columns: 1fr;
  }
}

.overview-stat-cards__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.overview-stat-cards__stat-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.overview-stat-cards__stat-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  line-height: var(--leading-tight);
}
.overview-stat-cards__stat-value--danger {
  color: var(--color-danger);
}
.overview-stat-cards__stat-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
.overview-stat-cards__stat-meta--danger {
  color: var(--color-danger);
}

.overview-stat-cards__parallel-step {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  padding: 3px 8px;
  font-size: var(--font-size-xs);
  border-radius: var(--radius-md);
  background: rgba(var(--color-primary-rgb, 3, 105, 161), 0.05);
  border: 1px solid rgba(var(--color-primary-rgb, 3, 105, 161), 0.1);
  width: fit-content;
}
.overview-stat-cards__parallel-step--danger {
  background: rgba(220, 38, 38, 0.05);
  border-color: rgba(220, 38, 38, 0.1);
}
.overview-stat-cards__parallel-step-arrow {
  color: var(--color-text-3);
  font-size: var(--font-size-xs);
}
.overview-stat-cards__parallel-step-label {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
}
.overview-stat-cards__parallel-step--danger
  .overview-stat-cards__parallel-step-label {
  color: var(--color-danger-text);
}
.overview-stat-cards__parallel-step-stage {
  padding: 1px 6px;
  font-size: var(--font-size-xs);
  line-height: var(--leading-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  color: var(--color-text-3);
}

.overview-stat-cards__billing-warning {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  margin-top: 6px;
  padding: 6px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning-text);
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.15);
  border-radius: var(--radius-md);
  line-height: var(--leading-snug, 1.375);
}
.overview-stat-cards__billing-warning svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: #f59e0b;
}
.overview-stat-cards__billing-warning--soft {
  color: var(--color-text-3);
  background: var(--color-bg-3);
  border-color: var(--color-border-2);
  font-weight: var(--font-weight-regular, 400);
}
.overview-stat-cards__billing-warning--soft svg {
  color: var(--color-text-3);
}

.overview-stat-cards__progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}
.overview-stat-cards__progress-track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.overview-stat-cards__progress-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
</style>
