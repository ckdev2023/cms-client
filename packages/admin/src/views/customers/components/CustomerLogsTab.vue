<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import SegmentedControl, {
  type SegmentOption,
} from "../../../shared/ui/SegmentedControl.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { LogFilter } from "../types";
import { getLogTypeLabel } from "../types";
import { useCustomerLogsModel } from "../model/useCustomerLogsModel";

/** 操作日志 Tab：展示按类型筛选的日志表格，支持分页。 */
const props = defineProps<{
  customerId: string;
}>();

const { t } = useI18n();

const customerIdRef = computed(() => props.customerId);
const {
  logFilter,
  currentPage,
  pagedLogs,
  totalCount,
  totalPages,
  setLogFilter,
  prevPage,
  nextPage,
} = useCustomerLogsModel(customerIdRef);

const segmentOptions = computed<SegmentOption<LogFilter>[]>(() => [
  { value: "all", label: t("customers.detail.logsTab.filterAll") },
  { value: "info", label: t("customers.detail.logsTab.filterInfo") },
  { value: "relation", label: t("customers.detail.logsTab.filterRelation") },
  { value: "case", label: t("customers.detail.logsTab.filterCase") },
  { value: "comm", label: t("customers.detail.logsTab.filterComm") },
]);

/**
 * 根据日志类型返回 Chip 色调。
 *
 * @param type 日志类型
 * @returns Chip 色调
 */
function typeTone(type: string): ChipTone {
  switch (type) {
    case "info":
      return "primary";
    case "relation":
      return "warning";
    case "case":
      return "success";
    case "comm":
      return "neutral";
    default:
      return "neutral";
  }
}

/**
 * 格式化 ISO 日期时间为可读格式。
 *
 * @param iso ISO 格式字符串
 * @returns 格式化后的日期时间
 */
function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return iso.replace("T", " ");
}
</script>

<template>
  <Card padding="lg">
    <div class="logs-tab">
      <div class="logs-tab__header">
        <h3 class="logs-tab__title">
          {{ t("customers.detail.logsTab.title") }}
        </h3>
        <div class="logs-tab__filter">
          <SegmentedControl
            :model-value="logFilter"
            :options="segmentOptions"
            :aria-label="t('customers.detail.logsTab.filterLabel')"
            @update:model-value="setLogFilter"
          />
        </div>
      </div>

      <div v-if="pagedLogs.length" class="logs-tab__table-wrap">
        <table class="logs-tab__table">
          <thead>
            <tr>
              <th class="logs-tab__th logs-tab__th--time">
                {{ t("customers.detail.logsTab.colTime") }}
              </th>
              <th class="logs-tab__th logs-tab__th--type">
                {{ t("customers.detail.logsTab.colType") }}
              </th>
              <th class="logs-tab__th">
                {{ t("customers.detail.logsTab.colContent") }}
              </th>
              <th class="logs-tab__th logs-tab__th--actor">
                {{ t("customers.detail.logsTab.colActor") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in pagedLogs" :key="l.id" class="logs-tab__row">
              <td class="logs-tab__td logs-tab__td--time">
                {{ formatDateTime(l.at) }}
              </td>
              <td class="logs-tab__td logs-tab__td--type">
                <Chip :tone="typeTone(l.type)" size="sm">
                  {{ getLogTypeLabel(l.type) }}
                </Chip>
              </td>
              <td class="logs-tab__td">{{ l.message }}</td>
              <td class="logs-tab__td logs-tab__td--actor">{{ l.actor }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="logs-tab__empty">
        <div class="logs-tab__empty-icon" aria-hidden="true">
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
        <p class="logs-tab__empty-title">
          {{ t("customers.detail.logsTab.emptyTitle") }}
        </p>
      </div>

      <div class="logs-tab__pagination">
        <span class="logs-tab__pagination-total">
          {{ t("customers.detail.logsTab.totalLabel", { count: totalCount }) }}
        </span>
        <div class="logs-tab__pagination-nav">
          <Button size="sm" :disabled="currentPage <= 1" @click="prevPage">
            {{ t("customers.detail.logsTab.prev") }}
          </Button>
          <span class="logs-tab__pagination-info">
            {{
              t("customers.detail.logsTab.pageInfo", {
                current: currentPage,
                total: totalPages,
              })
            }}
          </span>
          <Button
            size="sm"
            :disabled="currentPage >= totalPages"
            @click="nextPage"
          >
            {{ t("customers.detail.logsTab.next") }}
          </Button>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.logs-tab {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.logs-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.logs-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.logs-tab__filter {
  flex-shrink: 0;
}

.logs-tab__table-wrap {
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
}

.logs-tab__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.logs-tab__th {
  padding: 12px 16px;
  text-align: left;
  font-weight: var(--font-weight-black);
  color: var(--color-text-3);
  background: var(--color-bg-3);
  white-space: nowrap;
}

.logs-tab__th--time {
  width: 180px;
}

.logs-tab__th--type {
  width: 120px;
}

.logs-tab__th--actor {
  width: 140px;
}

.logs-tab__row {
  transition: background-color var(--transition-normal);
}

.logs-tab__row:hover {
  background-color: var(--color-bg-3);
}

.logs-tab__row + .logs-tab__row {
  border-top: 1px solid var(--color-border-1);
}

.logs-tab__td {
  padding: 12px 16px;
  color: var(--color-text-2);
  font-weight: var(--font-weight-semibold);
}

.logs-tab__td--time {
  white-space: nowrap;
  color: var(--color-text-3);
}

.logs-tab__td--actor {
  white-space: nowrap;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.logs-tab__pagination {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.logs-tab__pagination-total {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.logs-tab__pagination-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logs-tab__pagination-info {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.logs-tab__empty {
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

.logs-tab__empty-icon {
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

.logs-tab__empty-title {
  margin: 16px 0 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

@media (max-width: 767px) {
  .logs-tab__th--actor,
  .logs-tab__td--actor {
    display: none;
  }
}
</style>
