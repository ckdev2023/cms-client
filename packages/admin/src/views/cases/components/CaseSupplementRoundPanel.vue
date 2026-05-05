<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { SupplementRoundInfo } from "../types-detail";
import type { CaseDetailTab } from "../types";

/** 补正轮次面板：展示补正状态、原因与跳转动作。 */
const { t } = useI18n();

defineProps<{
  info: SupplementRoundInfo;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
}>();

/**
 * 将补正状态 tone 映射为面板样式类名。
 * @param tone - 补正状态 tone。
 * @returns 对应的样式类名。
 */
function toneClass(tone: string): string {
  const map: Record<string, string> = {
    danger: "supplement-panel--danger",
    warning: "supplement-panel--warning",
    primary: "supplement-panel--primary",
  };
  return map[tone] ?? "";
}
</script>

<template>
  <Card padding="md" data-testid="supplement-round-panel">
    <div class="supplement-panel" :class="[toneClass(info.tone)]">
      <div class="supplement-panel__header">
        <div class="supplement-panel__header-left">
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="supplement-panel__title">
            {{ t("cases.detail.overview.supplementRound.title") }}
          </span>
        </div>
        <div class="supplement-panel__badges">
          <span
            class="supplement-panel__round-badge"
            data-testid="supplement-round-badge"
          >
            {{
              t("cases.detail.overview.supplementRound.roundLabel", {
                round: info.round,
              })
            }}
          </span>
          <span
            class="supplement-panel__status-badge"
            :class="[`supplement-panel__status-badge--${info.tone}`]"
            data-testid="supplement-status-badge"
          >
            {{
              t(
                `cases.detail.overview.supplementRound.status${
                  info.statusKey === "notice_received"
                    ? "NoticeReceived"
                    : info.statusKey === "processing"
                      ? "Processing"
                      : "Resubmitted"
                }`,
              )
            }}
          </span>
        </div>
      </div>

      <div class="supplement-panel__details">
        <div v-if="info.reason" class="supplement-panel__row">
          <span class="supplement-panel__row-label">
            {{ t("cases.detail.overview.supplementRound.reason") }}
          </span>
          <span
            class="supplement-panel__row-value supplement-panel__reason"
            data-testid="supplement-reason"
          >
            {{ info.reason }}
          </span>
        </div>
        <div v-else class="supplement-panel__row">
          <span class="supplement-panel__row-label">
            {{ t("cases.detail.overview.supplementRound.reason") }}
          </span>
          <span class="supplement-panel__row-value supplement-panel__muted">
            {{ t("cases.detail.overview.supplementRound.reasonUnknown") }}
          </span>
        </div>

        <div class="supplement-panel__meta-row">
          <div v-if="info.noticeDate" class="supplement-panel__meta-item">
            <span class="supplement-panel__meta-label">
              {{ t("cases.detail.overview.supplementRound.noticeDate") }}
            </span>
            <span class="supplement-panel__meta-value">
              {{ info.noticeDate }}
            </span>
          </div>

          <div class="supplement-panel__meta-item">
            <span class="supplement-panel__meta-label">
              {{ t("cases.detail.overview.supplementRound.deadline") }}
            </span>
            <span
              v-if="info.deadline"
              class="supplement-panel__meta-value"
              :class="{
                'supplement-panel__meta-value--urgent': info.deadlineUrgent,
              }"
              data-testid="supplement-deadline"
            >
              {{ info.deadline }}
              <span
                v-if="info.deadlineUrgent"
                class="supplement-panel__urgent-tag"
              >
                {{ t("cases.detail.overview.supplementRound.deadlineUrgent") }}
              </span>
            </span>
            <span
              v-else
              class="supplement-panel__meta-value supplement-panel__muted"
            >
              {{ t("cases.detail.overview.supplementRound.noDeadline") }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="info.canResubmit && !readonly"
        class="supplement-panel__actions"
      >
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          data-testid="supplement-resubmit-btn"
          @click="emit('switchTab', 'validation')"
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
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {{ t("cases.detail.overview.supplementRound.resubmitAction") }}
        </Button>
        <span class="supplement-panel__hint">
          {{ t("cases.detail.overview.supplementRound.resubmitHint") }}
        </span>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.supplement-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.supplement-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.supplement-panel__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-2);
}
.supplement-panel__title {
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.supplement-panel__badges {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.supplement-panel__round-badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  color: var(--color-text-2);
  border: 1px solid var(--color-border-2);
}
.supplement-panel__status-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
}
.supplement-panel__status-badge--danger {
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-danger-text);
  border: 1px solid rgba(220, 38, 38, 0.18);
}
.supplement-panel__status-badge--warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning-text);
  border: 1px solid rgba(245, 158, 11, 0.18);
}
.supplement-panel__status-badge--primary {
  background: rgba(var(--color-primary-rgb, 3, 105, 161), 0.1);
  color: var(--color-primary-6);
  border: 1px solid rgba(var(--color-primary-rgb, 3, 105, 161), 0.18);
}

/* ── Details ── */

.supplement-panel__details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.supplement-panel__row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.supplement-panel__row-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.supplement-panel__row-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}
.supplement-panel__reason {
  padding: 8px 12px;
  background: rgba(220, 38, 38, 0.04);
  border: 1px solid rgba(220, 38, 38, 0.1);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
}
.supplement-panel--warning .supplement-panel__reason {
  background: rgba(245, 158, 11, 0.04);
  border-color: rgba(245, 158, 11, 0.1);
}
.supplement-panel__muted {
  color: var(--color-text-3);
  font-style: italic;
}

.supplement-panel__meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.supplement-panel__meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 120px;
}
.supplement-panel__meta-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.supplement-panel__meta-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
.supplement-panel__meta-value--urgent {
  color: var(--color-danger, #dc2626);
}
.supplement-panel__urgent-tag {
  display: inline-flex;
  margin-left: 6px;
  padding: 2px 6px;
  font-size: var(--font-size-xs);
  line-height: var(--leading-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-danger-text);
  vertical-align: middle;
}

/* ── Actions ── */

.supplement-panel__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid var(--color-border-1);
}
.supplement-panel__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  flex: 1;
  min-width: 0;
}
</style>
