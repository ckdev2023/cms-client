<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import CaseCloseoutChecklist from "./CaseCloseoutChecklist.vue";
import type { CaseDetail, DeadlineItem } from "../types-detail";

/** 关键期限 Tab：展示期限进度、提醒操作与结案检查项。 */
const { t } = useI18n();
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const emit = defineEmits<{
  (e: "open-create-deadline"): void;
}>();

const SEVERITY_COLOR: Record<string, string> = {
  danger: "var(--color-danger)",
  warning: "#f59e0b",
  primary: "var(--color-primary-6)",
  muted: "var(--color-border-2)",
};

const SEVERITY_TEXT_CLASS: Record<string, string> = {
  danger: "deadlines-tab__date--danger",
  warning: "deadlines-tab__date--warning",
  primary: "deadlines-tab__date--primary",
  muted: "deadlines-tab__date--muted",
};

const SEVERITY_CHIP_CLASS: Record<string, string> = {
  danger: "deadlines-tab__remaining--danger",
  warning: "deadlines-tab__remaining--warning",
  primary: "deadlines-tab__remaining--primary",
  muted: "deadlines-tab__remaining--muted",
};

/**
 * 解析期限项进度条颜色。
 * @param item - 期限项。
 * @returns 对应的颜色值。
 */
function barColor(item: DeadlineItem): string {
  return SEVERITY_COLOR[item.severity] ?? "var(--color-border-2)";
}

/**
 * 解析期限日期文本样式类名。
 * @param item - 期限项。
 * @returns 对应的日期样式类名。
 */
function dateClass(item: DeadlineItem): string {
  return SEVERITY_TEXT_CLASS[item.severity] ?? "deadlines-tab__date--muted";
}

/**
 * 解析剩余时间标签样式类名。
 * @param item - 期限项。
 * @returns 对应的标签样式类名。
 */
function chipClass(item: DeadlineItem): string {
  return (
    SEVERITY_CHIP_CLASS[item.severity] ?? "deadlines-tab__remaining--muted"
  );
}
</script>

<template>
  <div class="deadlines-tab">
    <Card padding="lg">
      <template #header>
        <h2 class="deadlines-tab__title">
          {{ t("cases.deadlines.summary.title") }}
        </h2>
        <Button
          v-if="!readonly"
          size="sm"
          @click="emit('open-create-deadline')"
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
            <path d="M12 4v16m8-8H4" />
          </svg>
          {{ t("cases.deadlines.summary.addDeadline") }}
        </Button>
      </template>

      <!-- ── Residence Period Panel ───────────────────────── -->
      <div class="deadlines-tab__summaries">
        <div v-if="detail.residencePeriod" class="deadlines-tab__summary-card">
          <span
            :class="[
              'deadlines-tab__summary-chip',
              `deadlines-tab__summary-chip--${detail.residencePeriod.tone}`,
            ]"
          >
            {{ detail.residencePeriod.statusLabel }}
          </span>
          <div class="deadlines-tab__summary-body">
            <span class="deadlines-tab__summary-label">{{
              detail.residencePeriod.residenceStatus
            }}</span>
            <span
              v-if="detail.residencePeriod.periodLabel"
              class="deadlines-tab__summary-period"
            >
              （{{ detail.residencePeriod.periodLabel }}）
            </span>
            <span class="deadlines-tab__summary-value">
              {{ detail.residencePeriod.startDate }} ～
              {{ detail.residencePeriod.endDate }}
            </span>
          </div>
          <div
            v-if="
              detail.residencePeriod.cardNumber ||
              detail.residencePeriod.entryDate
            "
            class="deadlines-tab__summary-details"
          >
            <span v-if="detail.residencePeriod.cardNumber">
              {{ t("cases.deadlines.summary.cardLabel") }}
              {{ detail.residencePeriod.cardNumber }}
            </span>
            <span v-if="detail.residencePeriod.entryDate">
              {{ t("cases.deadlines.summary.entryDateLabel") }}
              {{ detail.residencePeriod.entryDate }}
            </span>
          </div>
          <span class="deadlines-tab__summary-meta">{{
            detail.residencePeriod.recordMeta
          }}</span>
        </div>
        <div v-else class="deadlines-tab__summary-placeholder">
          {{ t("cases.deadlines.summary.residenceEmpty") }}
        </div>

        <!-- ── Reminder Schedule Panel ──────────────────────── -->
        <div v-if="detail.reminderSchedule" class="deadlines-tab__summary-card">
          <span
            :class="[
              'deadlines-tab__summary-chip',
              `deadlines-tab__summary-chip--${detail.reminderSchedule.tone}`,
            ]"
          >
            {{ detail.reminderSchedule.statusLabel }}
          </span>
          <div class="deadlines-tab__summary-body">
            <span class="deadlines-tab__summary-label">
              {{ t("cases.deadlines.summary.reminderSettingLabel") }}
            </span>
            <span class="deadlines-tab__summary-value">
              {{ t("cases.deadlines.summary.expiryDateLabel") }}
              {{ detail.reminderSchedule.reminderDate }}
            </span>
          </div>
          <div
            v-if="detail.reminderSchedule.reminders.length > 0"
            class="deadlines-tab__reminder-list"
          >
            <div
              v-for="(r, idx) in detail.reminderSchedule.reminders"
              :key="idx"
              class="deadlines-tab__reminder-row"
            >
              <span
                :class="[
                  'deadlines-tab__reminder-dot',
                  `deadlines-tab__reminder-dot--${r.severity}`,
                ]"
              />
              <span class="deadlines-tab__reminder-label">{{ r.label }}</span>
              <span class="deadlines-tab__reminder-date">{{ r.date }}</span>
            </div>
          </div>
          <span class="deadlines-tab__summary-meta">{{
            detail.reminderSchedule.recordMeta
          }}</span>
        </div>
        <div v-else class="deadlines-tab__summary-placeholder">
          {{ t("cases.deadlines.summary.reminderEmpty") }}
        </div>
      </div>

      <!-- ── Success Closeout Checklist (BMV S8 only) ─────── -->
      <CaseCloseoutChecklist
        v-if="detail.successCloseout"
        :closeout="detail.successCloseout"
      />

      <!-- ── Deadline Items ───────────────────────────────── -->
      <div class="deadlines-tab__list">
        <div
          v-for="item in detail.deadlines"
          :key="item.id"
          class="deadlines-tab__item"
        >
          <div
            class="deadlines-tab__item-bar"
            :style="{ backgroundColor: barColor(item) }"
          />
          <div class="deadlines-tab__item-left">
            <div class="deadlines-tab__item-title">{{ t(item.title) }}</div>
            <div class="deadlines-tab__item-desc">{{ t(item.desc) }}</div>
          </div>
          <div class="deadlines-tab__item-right">
            <div :class="['deadlines-tab__item-date', dateClass(item)]">
              {{ item.date }}
            </div>
            <span :class="['deadlines-tab__remaining', chipClass(item)]">
              {{
                item.remainingKey
                  ? t(item.remainingKey, item.remainingParams ?? {})
                  : item.remaining
              }}
            </span>
          </div>
        </div>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.deadlines-tab {
  display: grid;
  gap: 20px;
}

.deadlines-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.deadlines-tab__summaries {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .deadlines-tab__summaries {
    grid-template-columns: 1fr;
  }
}

.deadlines-tab__summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
}

.deadlines-tab__summary-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.deadlines-tab__summary-chip {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.deadlines-tab__summary-chip--success {
  background: rgba(34, 197, 94, 0.1);
  color: #15803d;
}

.deadlines-tab__summary-chip--warning {
  background: rgba(245, 158, 11, 0.1);
  color: var(--color-warning-text);
}

.deadlines-tab__summary-chip--primary {
  background: rgba(59, 130, 246, 0.1);
  color: #1d4ed8;
}

.deadlines-tab__summary-chip--neutral {
  background: var(--color-bg-3);
  color: var(--color-text-3);
}

.deadlines-tab__summary-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.deadlines-tab__summary-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.deadlines-tab__summary-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.deadlines-tab__summary-period {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.deadlines-tab__summary-details {
  display: flex;
  gap: 12px;
  font-size: var(--font-size-xs);
  color: var(--color-text-2);
}

.deadlines-tab__summary-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.deadlines-tab__reminder-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
}

.deadlines-tab__reminder-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-2);
}

.deadlines-tab__reminder-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.deadlines-tab__reminder-dot--danger {
  background: var(--color-danger);
}
.deadlines-tab__reminder-dot--warning {
  background: #f59e0b;
}
.deadlines-tab__reminder-dot--primary {
  background: var(--color-primary-6);
}

.deadlines-tab__reminder-label {
  min-width: 60px;
  font-weight: var(--font-weight-semibold);
}

.deadlines-tab__reminder-date {
  color: var(--color-text-1);
}

/* ── Deadline list ─────────────────────────────────────── */

.deadlines-tab__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.deadlines-tab__item {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 16px 16px 22px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  overflow: hidden;
  transition: border-color 0.15s;
}

.deadlines-tab__item:hover {
  border-color: var(--color-border-2);
}

.deadlines-tab__item-bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.deadlines-tab__item-left {
  flex: 1;
  min-width: 0;
}

.deadlines-tab__item-title {
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.deadlines-tab__item-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 4px;
}

.deadlines-tab__item-right {
  flex-shrink: 0;
  text-align: right;
}

.deadlines-tab__item-date {
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.02em;
}

.deadlines-tab__date--danger {
  color: var(--color-danger);
}

.deadlines-tab__date--warning {
  color: var(--color-text-1);
}

.deadlines-tab__date--primary {
  color: var(--color-text-1);
}

.deadlines-tab__date--muted {
  color: var(--color-text-3);
}

/* ── Remaining chip ────────────────────────────────────── */

.deadlines-tab__remaining {
  display: inline-block;
  margin-top: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.deadlines-tab__remaining--danger {
  background: rgba(220, 38, 38, 0.08);
  color: var(--color-danger);
}

.deadlines-tab__remaining--warning {
  background: rgba(245, 158, 11, 0.08);
  color: var(--color-warning-text);
}

.deadlines-tab__remaining--primary {
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-primary-6);
}

.deadlines-tab__remaining--muted {
  background: var(--color-bg-3);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
}
</style>
