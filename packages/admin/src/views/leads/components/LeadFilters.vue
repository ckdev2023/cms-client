<script setup lang="ts">
/**
 * 线索列表筛选区：数据范围切换、搜索、4 个下拉筛选 + 日期范围 + 重置。
 */
import { useI18n } from "vue-i18n";
import SegmentedControl from "../../../shared/ui/SegmentedControl.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import Button from "../../../shared/ui/Button.vue";
import type { LeadScope } from "../types";
import { LEAD_STATUSES } from "../types";
import {
  GROUP_OPTIONS,
  OWNER_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
} from "../fixtures";

/** 线索列表筛选区：范围切换、搜索、下拉筛选与日期范围。 */
const { t } = useI18n();

const scopeOptions = [
  { label: "", value: "mine" as const },
  { label: "", value: "group" as const },
  { label: "", value: "all" as const },
];

defineProps<{
  scope?: LeadScope;
  search?: string;
  statusFilter?: string;
  ownerFilter?: string;
  groupFilter?: string;
  businessTypeFilter?: string;
  dateFrom?: string;
  dateTo?: string;
  filteredCount?: number;
}>();

defineEmits<{
  "update:scope": [value: LeadScope];
  "update:search": [value: string];
  "update:statusFilter": [value: string];
  "update:ownerFilter": [value: string];
  "update:groupFilter": [value: string];
  "update:businessTypeFilter": [value: string];
  "update:dateFrom": [value: string];
  "update:dateTo": [value: string];
  resetFilters: [];
}>();
</script>

<template>
  <section class="lead-filters">
    <div class="lead-filters__row">
      <div class="lead-filters__left">
        <SegmentedControl
          :model-value="scope ?? 'mine'"
          :options="
            scopeOptions.map((o) => ({
              ...o,
              label: t(`leads.list.scope.${o.value}`),
            }))
          "
          :aria-label="t('leads.list.scopeLabel')"
          @update:model-value="$emit('update:scope', $event as LeadScope)"
        />
      </div>

      <SearchField
        :model-value="search ?? ''"
        :placeholder="t('leads.list.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="lead-filters__selects">
      <select
        class="lead-filters__select"
        :value="statusFilter ?? ''"
        @change="
          $emit(
            'update:statusFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">{{ t("leads.list.filters.statusAll") }}</option>
        <option v-for="s in LEAD_STATUSES" :key="s.value" :value="s.value">
          {{ t(`leads.list.status.${s.value}`) }}
        </option>
      </select>

      <select
        class="lead-filters__select"
        :value="ownerFilter ?? ''"
        @change="
          $emit(
            'update:ownerFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">{{ t("leads.list.filters.ownerAll") }}</option>
        <option
          v-for="opt in OWNER_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        class="lead-filters__select"
        :value="groupFilter ?? ''"
        @change="
          $emit(
            'update:groupFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">{{ t("leads.list.filters.groupAll") }}</option>
        <option
          v-for="opt in GROUP_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        class="lead-filters__select"
        :value="businessTypeFilter ?? ''"
        @change="
          $emit(
            'update:businessTypeFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">
          {{ t("leads.list.filters.businessTypeAll") }}
        </option>
        <option
          v-for="opt in BUSINESS_TYPE_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <div class="lead-filters__date-group">
        <span class="lead-filters__date-label">
          {{ t("leads.list.filters.dateLabel") }}
        </span>
        <input
          type="date"
          class="lead-filters__date-input"
          :value="dateFrom ?? ''"
          @input="
            $emit('update:dateFrom', ($event.target as HTMLInputElement).value)
          "
        />
        <span class="lead-filters__date-sep">–</span>
        <input
          type="date"
          class="lead-filters__date-input"
          :value="dateTo ?? ''"
          @input="
            $emit('update:dateTo', ($event.target as HTMLInputElement).value)
          "
        />
      </div>

      <Button variant="outlined" size="sm" @click="$emit('resetFilters')">
        {{ t("leads.list.filters.reset") }}
      </Button>
    </div>

    <div class="lead-filters__summary">
      <p class="lead-filters__summary-text">
        {{
          t("leads.list.filterSummary", {
            scope: t(`leads.list.scope.${scope ?? "mine"}`),
            count: filteredCount ?? "—",
          })
        }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.lead-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.lead-filters__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.lead-filters__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.lead-filters__selects {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.lead-filters__select {
  appearance: none;
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  padding: 6px 12px;
  height: 36px;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  width: 160px;
  cursor: pointer;
}

.lead-filters__select:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.lead-filters__date-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.lead-filters__date-label {
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  white-space: nowrap;
}

.lead-filters__date-input {
  appearance: none;
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  padding: 6px 12px;
  height: 36px;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  width: 140px;
  cursor: pointer;
}

.lead-filters__date-input:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.lead-filters__date-sep {
  font-size: 13px;
  color: var(--color-text-3);
}

.lead-filters__summary {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 16px;
}

.lead-filters__summary-text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
