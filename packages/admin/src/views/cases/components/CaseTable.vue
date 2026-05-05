<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CaseListItem } from "../types";
import ResponsiveTable from "../../../shared/ui/ResponsiveTable.vue";
import type { ResponsiveColumn } from "../../../shared/ui/ResponsiveTable.vue";
import ResponsiveTableRow from "../../../shared/ui/ResponsiveTableRow.vue";
import CaseTableRow from "./CaseTableRow.vue";
import StageChip from "./StageChip.vue";
import { buildCaseDetailHref } from "../query";

/** 案件列表表格，桌面/移动端自适应。 */
const { t } = useI18n();

const props = defineProps<{
  cases: CaseListItem[];
}>();

const columns: ResponsiveColumn[] = [
  { key: "case", label: t("cases.list.columns.case") },
  { key: "stage", label: t("cases.list.columns.stage"), hideAt: "md" },
  { key: "applicant", label: t("cases.list.columns.applicant"), hideAt: "md" },
  { key: "type", label: t("cases.list.columns.type"), hideAt: "md" },
  { key: "owner", label: t("cases.list.columns.owner"), hideAt: "lg" },
  { key: "dueDate", label: t("cases.list.columns.dueDate"), hideAt: "lg" },
  {
    key: "unpaidAmount",
    label: t("cases.list.columns.unpaidAmount"),
    hideAt: "lg",
    align: "right",
  },
  {
    key: "validation",
    label: t("cases.list.columns.validation"),
    hideAt: "md",
  },
  { key: "risk", label: t("cases.list.columns.risk"), hideAt: "lg" },
];
</script>

<template>
  <ResponsiveTable
    :columns="columns"
    :rows="props.cases"
    :row-key="(c: any) => c.id"
  >
    <!-- Desktop: existing table -->
    <div class="case-table-wrap">
      <table class="case-table">
        <thead>
          <tr>
            <th class="case-table__th">
              {{ t("cases.list.columns.case") }}
            </th>
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
            <th
              class="case-table__th case-table__hide-lg case-table__th--right"
            >
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

    <!-- Mobile: card per row -->
    <template #mobile-card="{ row }">
      <ResponsiveTableRow>
        <template #header>
          <div class="case-card__identity">
            <a class="case-card__name" :href="buildCaseDetailHref(row.id)">
              {{ row.name }}
            </a>
            <span class="case-card__meta">{{ row.caseNo || row.id }}</span>
          </div>
        </template>
        <div class="case-card__stage">
          <StageChip :code="row.stageId" precision="full" />
        </div>
        <div v-if="row.applicant" class="case-card__field">
          <span class="case-card__label">{{
            t("cases.list.columns.applicant")
          }}</span>
          {{ row.applicant }}
        </div>
        <template #actions>
          <a class="case-card__detail-link" :href="buildCaseDetailHref(row.id)">
            {{ t("cases.list.actions.viewDetail") }}
          </a>
        </template>
      </ResponsiveTableRow>
    </template>

    <!-- Mobile: empty state -->
    <template #empty>
      <div v-if="cases.length === 0" class="case-table__empty">
        {{ t("cases.list.empty") }}
      </div>
    </template>
  </ResponsiveTable>
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

/* --- Mobile card --- */

.case-card__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.case-card__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  text-decoration: none;
  font-size: var(--font-size-base);
}

.case-card__name:hover {
  color: var(--color-primary-6);
}

.case-card__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.case-card__stage {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.case-card__field {
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.case-card__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  margin-right: 6px;
}

.case-card__detail-link {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
}

.case-card__detail-link:hover {
  text-decoration: underline;
}
</style>
