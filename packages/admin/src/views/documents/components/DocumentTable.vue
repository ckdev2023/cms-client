<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { DocumentListItem } from "../types";
import DocumentTableRow from "./DocumentTableRow.vue";
import DocumentEmptyState from "./DocumentEmptyState.vue";

/**
 * 资料表格组件：全选 checkbox + 7 列表头与数据行，空状态时显示提示。
 */
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
</script>

<template>
  <table class="doc-table">
    <thead>
      <tr>
        <th class="doc-table__th-check">
          <label class="doc-table__check-label">
            <input
              type="checkbox"
              class="doc-table__checkbox"
              :checked="allSelected"
              :indeterminate="indeterminate"
              :aria-label="t('documents.list.selectAll')"
              @change="
                $emit('selectAll', ($event.target as HTMLInputElement).checked)
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

.doc-table__check-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
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
</style>
