<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { DocumentListItem } from "../types";
import ResponsiveTable from "../../../shared/ui/ResponsiveTable.vue";
import type { ResponsiveColumn } from "../../../shared/ui/ResponsiveTable.vue";
import ResponsiveTableRow from "../../../shared/ui/ResponsiveTableRow.vue";
import Chip from "../../../shared/ui/Chip.vue";
import DocumentTableRow from "./DocumentTableRow.vue";
import DocumentEmptyState from "./DocumentEmptyState.vue";
import type { DocumentItemStatus } from "../types";
import { DOCUMENT_STATUS_TONE, getStatusLabelKey } from "../constants";

/** 文書一覧テーブル：桌面表格/移动端卡片自适应。 */
const { t } = useI18n();

defineProps<{
  items: DocumentListItem[];
  selectedIds?: Set<string>;
  allSelected?: boolean;
  indeterminate?: boolean;
}>();

defineEmits<{
  selectAll: [checked: boolean];
  selectRow: [id: string, checked: boolean];
  approve: [item: DocumentListItem];
  reject: [item: DocumentListItem];
  remind: [item: DocumentListItem];
  openRiskPanel: [item: DocumentListItem];
}>();

const columns: ResponsiveColumn[] = [
  { key: "name", label: t("documents.list.columns.name") },
  { key: "case", label: t("documents.list.columns.case") },
  {
    key: "provider",
    label: t("documents.list.columns.provider"),
    hideAt: "md",
  },
  { key: "status", label: t("documents.list.columns.status") },
  { key: "dueDate", label: t("documents.list.columns.dueDate"), hideAt: "md" },
  {
    key: "lastReminder",
    label: t("documents.list.columns.lastReminder"),
    hideAt: "lg",
  },
  {
    key: "relativePath",
    label: t("documents.list.columns.relativePath"),
    hideAt: "lg",
  },
];
</script>

<template>
  <ResponsiveTable
    :columns="columns"
    :rows="items"
    :row-key="(item: any) => item.id"
  >
    <!-- Desktop: existing table -->
    <table class="doc-table">
      <thead>
        <tr>
          <th class="doc-table__th-check">
            <label class="ui-checkbox-hit">
              <input
                type="checkbox"
                name="docSelectAll"
                class="doc-table__checkbox"
                :checked="allSelected"
                :indeterminate="indeterminate"
                :aria-label="t('documents.list.selectAll')"
                @change="
                  $emit(
                    'selectAll',
                    ($event.target as HTMLInputElement).checked,
                  )
                "
              />
            </label>
          </th>
          <th>{{ t("documents.list.columns.name") }}</th>
          <th>{{ t("documents.list.columns.case") }}</th>
          <th class="doc-table__hide-md">
            {{ t("documents.list.columns.provider") }}
          </th>
          <th class="doc-table__th-status">
            {{ t("documents.list.columns.status") }}
          </th>
          <th class="doc-table__hide-md doc-table__th-due">
            {{ t("documents.list.columns.dueDate") }}
          </th>
          <th class="doc-table__hide-lg doc-table__th-reminder">
            {{ t("documents.list.columns.lastReminder") }}
          </th>
          <th class="doc-table__hide-lg doc-table__th-path">
            {{ t("documents.list.columns.relativePath") }}
          </th>
          <th class="doc-table__hide-md doc-table__th-actions" />
        </tr>
      </thead>
      <tbody>
        <DocumentTableRow
          v-for="item in items"
          :key="item.id"
          :item="item"
          :selected="selectedIds?.has(item.id) ?? false"
          @select="
            (id: string, checked: boolean) => $emit('selectRow', id, checked)
          "
          @approve="(i: DocumentListItem) => $emit('approve', i)"
          @reject="(i: DocumentListItem) => $emit('reject', i)"
          @remind="(i: DocumentListItem) => $emit('remind', i)"
          @open-risk-panel="(i: DocumentListItem) => $emit('openRiskPanel', i)"
        />
        <DocumentEmptyState v-if="items.length === 0" />
      </tbody>
    </table>

    <!-- Mobile: card per document -->
    <template #mobile-card="{ row }">
      <ResponsiveTableRow>
        <template #header>
          <div class="doc-card__name-cell">
            <span class="doc-card__name">{{ row.name }}</span>
            <span v-if="row.referenceCount > 1" class="doc-card__ref-count">
              ×{{ row.referenceCount }}
            </span>
          </div>
          <Chip
            :tone="DOCUMENT_STATUS_TONE[row.status as DocumentItemStatus]"
            dot
          >
            {{ t(getStatusLabelKey(row.status as DocumentItemStatus)) }}
          </Chip>
        </template>
        <div class="doc-card__case">{{ row.caseName }}</div>
        <div v-if="row.dueDateLabel" class="doc-card__due">
          <span class="doc-card__label">{{
            t("documents.list.columns.dueDate")
          }}</span>
          <span :class="{ 'doc-card__due--expired': row.status === 'expired' }">
            {{ row.dueDateLabel }}
          </span>
        </div>
        <template #actions>
          <button
            v-if="row.status === 'uploaded_reviewing'"
            class="doc-card__action doc-card__action--approve"
            type="button"
            @click="$emit('approve', row)"
          >
            {{ t("documents.actions.approve") }}
          </button>
          <button
            v-if="row.status === 'uploaded_reviewing'"
            class="doc-card__action doc-card__action--reject"
            type="button"
            @click="$emit('reject', row)"
          >
            {{ t("documents.actions.reject") }}
          </button>
          <button
            v-if="row.status === 'pending' || row.status === 'rejected'"
            class="doc-card__action doc-card__action--remind"
            type="button"
            @click="$emit('remind', row)"
          >
            {{ t("documents.actions.remind") }}
          </button>
        </template>
      </ResponsiveTableRow>
    </template>

    <!-- Mobile: empty state -->
    <template #empty>
      <DocumentEmptyState v-if="items.length === 0" />
    </template>
  </ResponsiveTable>
</template>

<style scoped>
.doc-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.doc-table thead th {
  padding: 10px 16px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-table);
  white-space: nowrap;
  text-transform: none;
  letter-spacing: normal;
}

.doc-table__th-check {
  width: 44px;
  text-align: center;
}

.doc-table__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.doc-table__th-status {
  width: 140px;
}

.doc-table__th-due {
  width: 110px;
}

.doc-table__th-reminder {
  width: 150px;
}

.doc-table__th-path {
  width: 200px;
}

.doc-table__th-actions {
  width: 120px;
}

@media (max-width: 767px) {
  .doc-table__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .doc-table__hide-lg {
    display: none;
  }
}

/* --- Mobile card styles --- */

.doc-card__name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.doc-card__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  font-size: var(--font-size-base);
}

.doc-card__ref-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.doc-card__case {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
}

.doc-card__due {
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.doc-card__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  margin-right: 6px;
}

.doc-card__due--expired {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}

.doc-card__action {
  all: unset;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  padding: 4px 10px;
  border-radius: var(--radius-md);
  cursor: pointer;
}

.doc-card__action--approve {
  color: var(--color-success, #16a34a);
}

.doc-card__action--reject {
  color: var(--color-danger, #dc2626);
}

.doc-card__action--remind {
  color: var(--color-primary-6);
}
</style>
