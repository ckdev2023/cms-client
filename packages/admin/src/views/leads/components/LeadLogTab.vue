<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import SegmentedControl, {
  type SegmentOption,
} from "../../../shared/ui/SegmentedControl.vue";
import type { LeadLogEntry, LeadLogCategory } from "../types";
import { LOG_CATEGORIES } from "../types";

/** 操作日志 Tab：展示按类型筛选的日志时间线。 */
const props = defineProps<{
  log: LeadLogEntry[];
  logCategory: LeadLogCategory;
  filteredLog: LeadLogEntry[];
}>();

const emit = defineEmits<{
  setLogCategory: [category: LeadLogCategory];
}>();

const { t } = useI18n();

const segmentOptions = computed<SegmentOption<LeadLogCategory>[]>(() =>
  LOG_CATEGORIES.map((c) => ({ value: c.key, label: c.label })),
);

const isEmpty = computed(() => props.filteredLog.length === 0);

/**
 * 根据日志类型返回中文标签。
 *
 * @param type 日志类型
 * @returns 日志类型中文标签
 */
function logTypeLabel(type: string): string {
  switch (type) {
    case "status":
      return t("leads.detail.logTab.typeStatus");
    case "owner":
      return t("leads.detail.logTab.typeOwner");
    case "group":
      return t("leads.detail.logTab.typeGroup");
    default:
      return type;
  }
}
</script>

<template>
  <Card padding="lg">
    <div class="log-tab">
      <div class="log-tab__header">
        <h3 class="log-tab__title">
          {{ t("leads.detail.logTab.title") }}
        </h3>
        <div class="log-tab__filter">
          <SegmentedControl
            :model-value="logCategory"
            :options="segmentOptions"
            :aria-label="t('leads.detail.logTab.filterLabel')"
            @update:model-value="emit('setLogCategory', $event)"
          />
        </div>
      </div>

      <div v-if="isEmpty" class="log-tab__empty">
        <div class="log-tab__empty-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
        </div>
        <p class="log-tab__empty-title">
          {{ t("leads.detail.logTab.emptyTitle") }}
        </p>
      </div>

      <div v-else class="log-timeline">
        <div
          v-for="(entry, idx) in filteredLog"
          :key="idx"
          class="log-timeline__item"
        >
          <div class="log-timeline__dot" />
          <div class="log-timeline__card">
            <div class="log-timeline__meta">
              <span :class="['log-timeline__type-chip', entry.chipClass]">
                {{ logTypeLabel(entry.type) }}
              </span>
              <span class="log-timeline__time">{{ entry.time }}</span>
              <span class="log-timeline__operator">· {{ entry.operator }}</span>
            </div>
            <div class="log-timeline__change">
              <span class="log-timeline__from">{{ entry.fromValue }}</span>
              <svg
                class="log-timeline__arrow"
                width="12"
                height="12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              <span class="log-timeline__to">{{ entry.toValue }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.log-tab {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.log-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.log-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.log-tab__filter {
  flex-shrink: 0;
}

/* ---- Empty ---- */

.log-tab__empty {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  background: var(--color-bg-2);
}

.log-tab__empty-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
}

.log-tab__empty-title {
  margin: 16px 0 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

/* ---- Timeline ---- */

.log-timeline {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 24px;
}

.log-timeline::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--color-border-1);
  border-radius: 1px;
}

.log-timeline__item {
  position: relative;
  padding-bottom: 12px;
}

.log-timeline__item:last-child {
  padding-bottom: 0;
}

.log-timeline__dot {
  position: absolute;
  left: -21px;
  top: 10px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  background: var(--color-primary-6);
  border: 2px solid var(--color-bg-1);
}

.log-timeline__card {
  padding: 12px 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default, 10px);
  background: var(--color-bg-1);
}

.log-timeline__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 4px;
}

.log-timeline__type-chip {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}

.log-timeline__time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.log-timeline__operator {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.log-timeline__change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.log-timeline__from {
  color: var(--color-text-3);
}

.log-timeline__arrow {
  color: var(--color-text-3);
  flex-shrink: 0;
}
</style>
