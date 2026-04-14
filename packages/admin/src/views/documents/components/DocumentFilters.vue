<script setup lang="ts">
import { useI18n } from "vue-i18n";
import SearchField from "../../../shared/ui/SearchField.vue";
import Button from "../../../shared/ui/Button.vue";
import type { CaseOption } from "../fixtures";
import type { DocumentStatusFilter, DocumentProviderFilter } from "../types";
import {
  DOCUMENT_PROVIDERS,
  DOCUMENT_PROVIDER_IDS,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_IDS,
} from "../constants";

/**
 * 资料列表筛选区：搜索框、3 个下拉筛选器与重置按钮。
 */
const { t } = useI18n();

defineProps<{
  status?: DocumentStatusFilter;
  caseId?: string;
  provider?: DocumentProviderFilter;
  search?: string;
  caseOptions?: CaseOption[];
  filteredCount?: number;
}>();

defineEmits<{
  "update:status": [value: DocumentStatusFilter];
  "update:caseId": [value: string];
  "update:provider": [value: DocumentProviderFilter];
  "update:search": [value: string];
  resetFilters: [];
}>();
</script>

<template>
  <section class="doc-filters">
    <div class="doc-filters__row">
      <SearchField
        class="doc-filters__search"
        :model-value="search ?? ''"
        :placeholder="t('documents.list.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="doc-filters__selects">
      <select
        class="doc-filters__select"
        :value="status ?? ''"
        @change="
          $emit(
            'update:status',
            ($event.target as HTMLSelectElement).value as DocumentStatusFilter,
          )
        "
      >
        <option value="">{{ t("documents.list.filters.statusAll") }}</option>
        <option value="missing">
          {{ t("documents.list.filters.statusMissing") }}
        </option>
        <option v-for="sid in DOCUMENT_STATUS_IDS" :key="sid" :value="sid">
          {{ DOCUMENT_STATUSES[sid].label }}
        </option>
      </select>

      <select
        class="doc-filters__select doc-filters__select--case"
        :value="caseId ?? ''"
        @change="
          $emit('update:caseId', ($event.target as HTMLSelectElement).value)
        "
      >
        <option value="">{{ t("documents.list.filters.caseAll") }}</option>
        <option v-for="opt in caseOptions" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>

      <select
        class="doc-filters__select"
        :value="provider ?? ''"
        @change="
          $emit(
            'update:provider',
            ($event.target as HTMLSelectElement)
              .value as DocumentProviderFilter,
          )
        "
      >
        <option value="">{{ t("documents.list.filters.providerAll") }}</option>
        <option v-for="id in DOCUMENT_PROVIDER_IDS" :key="id" :value="id">
          {{ DOCUMENT_PROVIDERS[id].label }}
        </option>
      </select>

      <Button variant="outlined" size="sm" @click="$emit('resetFilters')">
        {{ t("documents.list.filters.reset") }}
      </Button>
    </div>

    <div class="doc-filters__summary">
      <p class="doc-filters__summary-text">
        {{ t("documents.list.filterSummary", { count: filteredCount ?? "—" }) }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.doc-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-filters__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}

.doc-filters__search {
  flex: 1 1 420px;
  min-width: min(420px, 100%);
  max-width: 520px;
}

.doc-filters__selects {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.doc-filters__select {
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

.doc-filters__select--case {
  width: 220px;
}

.doc-filters__select:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.doc-filters__summary {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 16px;
}

.doc-filters__summary-text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
