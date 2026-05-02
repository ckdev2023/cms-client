<script setup lang="ts">
import { useI18n } from "vue-i18n";
import SegmentedControl from "../../../shared/ui/SegmentedControl.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import Button from "../../../shared/ui/Button.vue";
import type {
  CustomerActiveCasesFilter,
  CustomerScope,
  SelectOption,
} from "../types";

/**
 * 客户列表筛选区：数据范围切换、搜索框、3 个下拉筛选器与重置按钮。
 */
const { t } = useI18n();

const scopeOptions = [
  { label: "", value: "mine" as const },
  { label: "", value: "group" as const },
  { label: "", value: "all" as const },
];

const normalizeActiveCasesFilter = (
  event: Event,
): CustomerActiveCasesFilter => {
  const value = (event.target as HTMLSelectElement).value;
  return value === "yes" || value === "no" ? value : "";
};

withDefaults(
  defineProps<{
    scope?: CustomerScope;
    search?: string;
    groupFilter?: string;
    ownerFilter?: string;
    activeCasesFilter?: CustomerActiveCasesFilter;
    filteredCount?: number;
    groupOptions?: SelectOption[];
    ownerOptions?: SelectOption[];
    optionsLoading?: boolean;
  }>(),
  {
    optionsLoading: false,
  },
);

defineEmits<{
  "update:scope": [value: CustomerScope];
  "update:search": [value: string];
  "update:groupFilter": [value: string];
  "update:ownerFilter": [value: string];
  "update:activeCasesFilter": [value: CustomerActiveCasesFilter];
  resetFilters: [];
}>();
</script>

<template>
  <section class="customer-filters">
    <div class="customer-filters__row">
      <div class="customer-filters__left">
        <SegmentedControl
          :model-value="scope ?? 'mine'"
          :options="
            scopeOptions.map((o) => ({
              ...o,
              label: t(`customers.list.scope.${o.value}`),
            }))
          "
          :aria-label="t('customers.list.scopeLabel')"
          @update:model-value="$emit('update:scope', $event as CustomerScope)"
        />
      </div>

      <SearchField
        id="customer-filter-search"
        name="customerSearch"
        class="customer-filters__search"
        :model-value="search ?? ''"
        :placeholder="t('customers.list.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="customer-filters__selects">
      <select
        id="customer-filter-group"
        name="customerFilterGroup"
        class="customer-filters__select"
        :disabled="optionsLoading && (groupOptions?.length ?? 0) === 0"
        :aria-busy="optionsLoading && (groupOptions?.length ?? 0) === 0"
        :value="groupFilter ?? ''"
        @change="
          $emit(
            'update:groupFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option
          v-if="optionsLoading && (groupOptions?.length ?? 0) === 0"
          value=""
          disabled
        >
          {{ t("shared.loading") }}
        </option>
        <option v-else value="">
          {{ t("customers.list.filters.groupAll") }}
        </option>
        <option
          v-for="opt in groupOptions ?? []"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        id="customer-filter-owner"
        name="customerFilterOwner"
        class="customer-filters__select"
        :disabled="optionsLoading && (ownerOptions?.length ?? 0) === 0"
        :aria-busy="optionsLoading && (ownerOptions?.length ?? 0) === 0"
        :value="ownerFilter ?? ''"
        @change="
          $emit(
            'update:ownerFilter',
            ($event.target as HTMLSelectElement).value,
          )
        "
      >
        <option
          v-if="optionsLoading && (ownerOptions?.length ?? 0) === 0"
          value=""
          disabled
        >
          {{ t("shared.loading") }}
        </option>
        <option v-else value="">
          {{ t("customers.list.filters.ownerAll") }}
        </option>
        <option
          v-for="opt in ownerOptions ?? []"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        id="customer-filter-activeCases"
        name="customerFilterActiveCases"
        class="customer-filters__select"
        :value="activeCasesFilter ?? ''"
        @change="
          $emit('update:activeCasesFilter', normalizeActiveCasesFilter($event))
        "
      >
        <option value="">
          {{ t("customers.list.filters.activeCasesAll") }}
        </option>
        <option value="yes">
          {{ t("customers.list.filters.activeCasesYes") }}
        </option>
        <option value="no">
          {{ t("customers.list.filters.activeCasesNo") }}
        </option>
      </select>

      <Button variant="outlined" size="sm" @click="$emit('resetFilters')">
        {{ t("customers.list.filters.reset") }}
      </Button>
    </div>

    <div class="customer-filters__summary">
      <p class="customer-filters__summary-text">
        {{
          t("customers.list.filterSummary", {
            scope: t(`customers.list.scope.${scope ?? "mine"}`),
            count: filteredCount ?? "—",
          })
        }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.customer-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-filters__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.customer-filters__left {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.customer-filters__search {
  flex: 1 1 420px;
  min-width: min(420px, 100%);
  max-width: 520px;
}

.customer-filters__selects {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.customer-filters__select {
  appearance: none;
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  padding: 6px 12px;
  height: 36px;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  width: 160px;
  cursor: pointer;
}

.customer-filters__select:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.customer-filters__summary {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 16px;
}

.customer-filters__summary-text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
