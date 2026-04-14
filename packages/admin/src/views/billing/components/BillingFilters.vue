<script setup lang="ts">
import { useI18n } from "vue-i18n";
import SegmentedControl from "../../../shared/ui/SegmentedControl.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import Button from "../../../shared/ui/Button.vue";
import type { BillingSegment, SelectOption, StatusOption } from "../types";

/**
 * 收费列表筛选区：分段切换、搜索框、3 个下拉筛选器与重置按钮。
 */
const props = withDefaults(
  defineProps<{
    activeSegment: BillingSegment;
    search?: string;
    statusFilter?: string;
    groupFilter?: string;
    ownerFilter?: string;
    segments?: { id: BillingSegment; labelKey: string }[];
    statusOptions?: StatusOption[];
    groupOptions?: SelectOption[];
    ownerOptions?: SelectOption[];
    filteredCount?: number;
    isFilterActive?: boolean;
  }>(),
  {
    search: "",
    statusFilter: "",
    groupFilter: "",
    ownerFilter: "",
    segments: () => [],
    statusOptions: () => [],
    groupOptions: () => [],
    ownerOptions: () => [],
  },
);

const { t } = useI18n();

defineEmits<{
  "update:activeSegment": [segment: BillingSegment];
  "update:search": [value: string];
  "update:statusFilter": [value: string];
  "update:groupFilter": [value: string];
  "update:ownerFilter": [value: string];
  resetFilters: [];
}>();
</script>

<template>
  <section class="billing-filters">
    <div class="billing-filters__row">
      <SegmentedControl
        v-if="props.segments.length > 0"
        :model-value="activeSegment"
        :options="
          props.segments.map((s) => ({ value: s.id, label: t(s.labelKey) }))
        "
        :aria-label="t('billing.list.segmentAriaLabel')"
        @update:model-value="
          $emit('update:activeSegment', $event as BillingSegment)
        "
      />

      <SearchField
        :model-value="props.search"
        :placeholder="t('billing.list.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="billing-filters__selects">
      <select
        class="billing-filters__select"
        :value="props.statusFilter"
        :aria-label="t('billing.list.filters.statusAriaLabel')"
        @change="
          $emit(
            'update:statusFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">{{ t("billing.list.filters.statusAll") }}</option>
        <option
          v-for="opt in props.statusOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ t(opt.label) }}
        </option>
      </select>

      <select
        class="billing-filters__select"
        :value="props.groupFilter"
        :aria-label="t('billing.list.filters.groupAriaLabel')"
        @change="
          $emit(
            'update:groupFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">{{ t("billing.list.filters.groupAll") }}</option>
        <option
          v-for="opt in props.groupOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        class="billing-filters__select"
        :value="props.ownerFilter"
        :aria-label="t('billing.list.filters.ownerAriaLabel')"
        @change="
          $emit(
            'update:ownerFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option value="">{{ t("billing.list.filters.ownerAll") }}</option>
        <option
          v-for="opt in props.ownerOptions"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <Button
        v-if="isFilterActive"
        variant="ghost"
        size="sm"
        @click="$emit('resetFilters')"
      >
        {{ t("billing.list.filters.reset") }}
      </Button>
    </div>

    <div v-if="filteredCount !== undefined" class="billing-filters__summary">
      <p class="billing-filters__summary-text">
        {{ t("billing.list.filters.recordCount", { count: filteredCount }) }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.billing-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.billing-filters__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.billing-filters__selects {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.billing-filters__select {
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

.billing-filters__select:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.billing-filters__summary {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 16px;
}

.billing-filters__summary-text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
