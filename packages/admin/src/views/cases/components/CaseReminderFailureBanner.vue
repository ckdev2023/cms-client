<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { ReminderFailureInfo } from "../types-detail";
import type { WriteActionFeedback } from "../model/useCaseDetailWriteActions";

/** 催办失败横幅：提示失败原因并允许重试催办。 */
const { t } = useI18n();

defineProps<{
  info: ReminderFailureInfo;
  writeFeedback?: WriteActionFeedback;
  readonly?: boolean;
}>();

const emit = defineEmits<{
  (e: "retryReminder"): void;
}>();
</script>

<template>
  <Card padding="md" data-testid="reminder-failure-banner">
    <div class="reminder-fail">
      <div class="reminder-fail__header">
        <div class="reminder-fail__icon-wrap">
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
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div class="reminder-fail__header-text">
          <span class="reminder-fail__title">
            {{ t("cases.detail.overview.reminderFailure.title") }}
          </span>
          <span
            v-if="info.attemptCount > 0"
            class="reminder-fail__attempt-badge"
            data-testid="reminder-attempt-count"
          >
            {{
              t("cases.detail.overview.reminderFailure.attemptCount", {
                count: info.attemptCount,
              })
            }}
          </span>
        </div>
      </div>

      <div class="reminder-fail__body">
        <div class="reminder-fail__reason-row">
          <span class="reminder-fail__label">
            {{ t("cases.detail.overview.reminderFailure.reason") }}
          </span>
          <span
            class="reminder-fail__reason"
            data-testid="reminder-failure-reason"
          >
            {{ info.reason }}
          </span>
        </div>

        <div v-if="info.lastAttemptDate" class="reminder-fail__meta">
          <span class="reminder-fail__label">
            {{ t("cases.detail.overview.reminderFailure.lastAttempt") }}
          </span>
          <span class="reminder-fail__meta-value">
            {{ info.lastAttemptDate }}
          </span>
        </div>
      </div>

      <div v-if="info.canRetry && !readonly" class="reminder-fail__actions">
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          :disabled="writeFeedback?.submitting"
          data-testid="reminder-retry-btn"
          @click="emit('retryReminder')"
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
          {{ t("cases.detail.overview.reminderFailure.retryAction") }}
        </Button>
        <span class="reminder-fail__hint">
          {{ t("cases.detail.overview.reminderFailure.retryHint") }}
        </span>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.reminder-fail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-fail__header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.reminder-fail__icon-wrap {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: rgba(220, 38, 38, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #991b1b;
}
.reminder-fail__header-text {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.reminder-fail__title {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.reminder-fail__attempt-badge {
  display: inline-flex;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  background: rgba(220, 38, 38, 0.08);
  color: #991b1b;
  border: 1px solid rgba(220, 38, 38, 0.15);
}

.reminder-fail__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.reminder-fail__reason-row {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.reminder-fail__label {
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.reminder-fail__reason {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #991b1b;
  padding: 6px 10px;
  background: rgba(220, 38, 38, 0.04);
  border: 1px solid rgba(220, 38, 38, 0.1);
  border-radius: var(--radius-default);
}
.reminder-fail__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.reminder-fail__meta-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.reminder-fail__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border-1);
}
.reminder-fail__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  flex: 1;
  min-width: 0;
}
</style>
