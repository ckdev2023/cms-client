<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CaseListItem } from "../types";
import CaseTableRow from "./CaseTableRow.vue";

/** 案件一覧テーブル：ヘッダー行・空状態メッセージ付き。 */
const { t } = useI18n();

defineProps<{
  cases: CaseListItem[];
}>();
</script>

<template>
  <div class="case-table-wrap">
    <table class="case-table">
      <thead>
        <tr>
          <th class="case-table__th">{{ t("cases.list.columns.case") }}</th>
          <th class="case-table__th case-table__hide-md">
            {{ t("cases.list.columns.stage") }}
          </th>
          <th class="case-table__th case-table__hide-md">
            {{ t("cases.list.columns.applicant") }}
          </th>
          <th class="case-table__th case-table__hide-md">
            {{ t("cases.list.columns.type") }}
          </th>
          <th class="case-table__th case-table__hide-lg">
            {{ t("cases.list.columns.owner") }}
          </th>
          <th class="case-table__th case-table__hide-lg">
            {{ t("cases.list.columns.dueDate") }}
          </th>
          <th class="case-table__th case-table__hide-lg case-table__th--right">
            {{ t("cases.list.columns.unpaidAmount") }}
          </th>
          <th class="case-table__th case-table__hide-md">
            {{ t("cases.list.columns.validation") }}
          </th>
          <th class="case-table__th case-table__hide-lg">
            {{ t("cases.list.columns.risk") }}
          </th>
          <th class="case-table__th case-table__th--actions" />
        </tr>
      </thead>
      <tbody>
        <CaseTableRow v-for="c in cases" :key="c.id" :item="c" />
        <tr v-if="cases.length === 0">
          <td colspan="10" class="case-table__empty">
            {{ t("cases.list.empty") }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.case-table-wrap {
  overflow-x: auto;
}

.case-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
}

.case-table__th {
  padding: 10px 16px;
  text-align: left;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.case-table__th--right {
  text-align: right;
}

.case-table__th--actions {
  width: 56px;
}

.case-table__hide-md {
  /* visible by default */
}

.case-table__hide-lg {
  /* visible by default */
}

@media (max-width: 767px) {
  .case-table__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .case-table__hide-lg {
    display: none;
  }
}

.case-table__empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-3);
  font-size: var(--font-size-base);
}
</style>
