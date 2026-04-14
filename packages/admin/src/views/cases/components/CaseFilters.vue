<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import SegmentedControl from "../../../shared/ui/SegmentedControl.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type {
  CaseGroupFilter,
  CaseOwnerFilter,
  CaseRiskFilter,
  CaseScope,
  CaseStageFilter,
  CaseValidationFilter,
} from "../types";
import {
  CASE_GROUP_OPTIONS,
  CASE_OWNER_OPTIONS,
  CASE_RISK_STATUSES,
  CASE_STAGE_IDS,
  CASE_STAGES,
  CASE_VALIDATION_STATUSES,
} from "../constants";

/** 案件列表：多条件筛选栏，含 scope、status、risk、validation 等维度。 */
const { t } = useI18n();

defineProps<{
  scope: CaseScope;
  search: string;
  stage: CaseStageFilter;
  owner: CaseOwnerFilter;
  group: CaseGroupFilter;
  risk: CaseRiskFilter;
  validation: CaseValidationFilter;
  filteredCount: number;
  customerId?: string;
  customerLabel?: string;
}>();

defineEmits<{
  "update:scope": [value: CaseScope];
  "update:search": [value: string];
  "update:stage": [value: CaseStageFilter];
  "update:owner": [value: CaseOwnerFilter];
  "update:group": [value: CaseGroupFilter];
  "update:risk": [value: CaseRiskFilter];
  "update:validation": [value: CaseValidationFilter];
  clearCustomer: [];
  resetFilters: [];
}>();

const scopeOptions = computed(() => [
  { label: t("cases.list.scope.mine"), value: "mine" as const },
  { label: t("cases.list.scope.group"), value: "group" as const },
  { label: t("cases.list.scope.all"), value: "all" as const },
]);

const riskLabels = computed<Record<string, string>>(() => ({
  normal: t("cases.list.riskLabels.normal"),
  attention: t("cases.list.riskLabels.attention"),
  critical: t("cases.list.riskLabels.critical"),
}));

const validationLabels = computed<Record<string, string>>(() => ({
  passed: t("cases.list.validationLabels.passed"),
  pending: t("cases.list.validationLabels.pending"),
  failed: t("cases.list.validationLabels.failed"),
}));
</script>

<template>
  <section class="case-filters">
    <div class="case-filters__row">
      <SegmentedControl
        :model-value="scope"
        :options="scopeOptions"
        :aria-label="t('cases.list.scopeLabel')"
        @update:model-value="$emit('update:scope', $event as CaseScope)"
      />

      <SearchField
        class="case-filters__search"
        :model-value="search"
        :placeholder="t('cases.list.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div v-if="customerId" class="case-filters__customer-badge">
      <Chip tone="primary" size="md">
        {{ customerLabel || customerId }}
        <button
          type="button"
          class="case-filters__customer-clear"
          :title="t('cases.list.filters.clearCustomerFilter')"
          @click="$emit('clearCustomer')"
        >
          ×
        </button>
      </Chip>
    </div>

    <div class="case-filters__selects">
      <select
        class="case-filters__select"
        :value="stage"
        @change="
          $emit(
            'update:stage',
            ($event.target as HTMLSelectElement).value as CaseStageFilter,
          )
        "
      >
        <option value="">{{ t("cases.list.filters.stageAll") }}</option>
        <option v-for="id in CASE_STAGE_IDS" :key="id" :value="id">
          {{ CASE_STAGES[id].label }}
        </option>
      </select>

      <select
        class="case-filters__select"
        :value="owner"
        @change="
          $emit(
            'update:owner',
            ($event.target as HTMLSelectElement).value as CaseOwnerFilter,
          )
        "
      >
        <option value="">{{ t("cases.list.filters.ownerAll") }}</option>
        <option
          v-for="opt in CASE_OWNER_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        class="case-filters__select"
        :value="group"
        @change="
          $emit(
            'update:group',
            ($event.target as HTMLSelectElement).value as CaseGroupFilter,
          )
        "
      >
        <option value="">{{ t("cases.list.filters.groupAll") }}</option>
        <option
          v-for="opt in CASE_GROUP_OPTIONS"
          :key="opt.value"
          :value="opt.value"
        >
          {{ opt.label }}
        </option>
      </select>

      <select
        class="case-filters__select"
        :value="risk"
        @change="
          $emit(
            'update:risk',
            ($event.target as HTMLSelectElement).value as CaseRiskFilter,
          )
        "
      >
        <option value="">{{ t("cases.list.filters.riskAll") }}</option>
        <option v-for="r in CASE_RISK_STATUSES" :key="r" :value="r">
          {{ riskLabels[r] }}
        </option>
      </select>

      <select
        class="case-filters__select"
        :value="validation"
        @change="
          $emit(
            'update:validation',
            ($event.target as HTMLSelectElement).value as CaseValidationFilter,
          )
        "
      >
        <option value="">{{ t("cases.list.filters.validationAll") }}</option>
        <option v-for="v in CASE_VALIDATION_STATUSES" :key="v" :value="v">
          {{ validationLabels[v] }}
        </option>
      </select>

      <Button variant="outlined" size="sm" @click="$emit('resetFilters')">
        {{ t("cases.list.filters.reset") }}
      </Button>
    </div>

    <div class="case-filters__summary">
      <p class="case-filters__summary-text">
        {{
          t("cases.list.filterSummary", {
            scope: scopeOptions.find((o) => o.value === scope)?.label ?? scope,
            count: filteredCount,
          })
        }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.case-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.case-filters__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.case-filters__search {
  flex: 1 1 420px;
  min-width: min(420px, 100%);
  max-width: 520px;
}

.case-filters__customer-badge {
  display: flex;
  align-items: center;
  gap: 8px;
}

.case-filters__customer-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-left: 4px;
  padding: 0;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  border-radius: var(--radius-full);
  opacity: 0.6;
  transition: opacity var(--transition-normal);
}

.case-filters__customer-clear:hover {
  opacity: 1;
}

.case-filters__selects {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.case-filters__select {
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

.case-filters__select:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.case-filters__summary {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 16px;
}

.case-filters__summary-text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
