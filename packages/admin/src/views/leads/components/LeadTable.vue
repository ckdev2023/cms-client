<script setup lang="ts">
/**
 * 线索表格组件：表头全选 checkbox、草稿行、数据行与空状态。
 *
 * 合并列映射：checkbox + 咨询人 + 联系方式/咨询信息 + 当前状态 + 负责人/组 + 跟进安排 + 最近更新。
 */
import { useI18n } from "vue-i18n";
import type { LeadDraft, LeadSummary } from "../types";
import LeadTableRow from "./LeadTableRow.vue";
import LeadEmptyState from "./LeadEmptyState.vue";

/** 线索表格组件：表头全选、草稿行、数据行与空状态。 */
const { t } = useI18n();

defineProps<{
  leads: LeadSummary[];
  drafts?: LeadDraft[];
  selectedIds?: Set<string>;
  allSelected?: boolean;
  indeterminate?: boolean;
}>();

defineEmits<{
  selectAll: [checked: boolean];
  selectRow: [id: string, checked: boolean];
  resumeDraft: [draftId: string];
  removeDraft: [draftId: string];
  openCreateModal: [];
}>();
</script>

<template>
  <table class="lead-table">
    <thead>
      <tr>
        <th class="lead-table__th-check">
          <label class="lead-table__check-label">
            <input
              type="checkbox"
              class="lead-table__checkbox"
              :checked="allSelected"
              :indeterminate="indeterminate"
              :aria-label="t('leads.list.columns.selectAll')"
              @change="
                $emit('selectAll', ($event.target as HTMLInputElement).checked)
              "
            />
          </label>
        </th>
        <th>{{ t("leads.list.columns.name") }}</th>
        <th class="lead-table__hide-md">
          {{ t("leads.list.columns.contact") }}
        </th>
        <th class="lead-table__th-status">
          {{ t("leads.list.columns.status") }}
        </th>
        <th class="lead-table__hide-md lead-table__th-owner">
          {{ t("leads.list.columns.owner") }}
        </th>
        <th class="lead-table__hide-lg lead-table__th-followup">
          {{ t("leads.list.columns.followUp") }}
        </th>
        <th class="lead-table__hide-lg lead-table__th-updated">
          {{ t("leads.list.columns.updated") }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="draft in drafts ?? []"
        :key="draft.id"
        class="lead-table__draft-row"
      >
        <td class="lead-table__th-check">
          <input type="checkbox" disabled class="lead-table__checkbox" />
        </td>
        <td colspan="5" class="lead-table__draft-cell">
          <span class="lead-table__draft-chip">
            {{ t("leads.list.draft.rowLabel") }}
          </span>
          <span class="lead-table__draft-name">
            {{ draft.fields.name || t("leads.list.draft.rowLabel") }}
          </span>
        </td>
        <td class="lead-table__draft-actions">
          <button
            class="lead-table__draft-btn lead-table__draft-btn--continue"
            type="button"
            @click="$emit('resumeDraft', draft.id)"
          >
            {{ t("leads.list.draft.continue") }}
          </button>
          <button
            class="lead-table__draft-btn lead-table__draft-btn--remove"
            type="button"
            @click="$emit('removeDraft', draft.id)"
          >
            {{ t("leads.list.draft.remove") }}
          </button>
        </td>
      </tr>
      <LeadTableRow
        v-for="lead in leads"
        :key="lead.id"
        :lead="lead"
        :selected="selectedIds?.has(lead.id) ?? false"
        @select="
          (id: string, checked: boolean) => $emit('selectRow', id, checked)
        "
      />
      <LeadEmptyState
        v-if="leads.length === 0 && (drafts ?? []).length === 0"
        @open-create-modal="$emit('openCreateModal')"
      />
    </tbody>
  </table>
</template>

<style scoped>
.lead-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.lead-table thead th {
  padding: 10px 16px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-table);
  white-space: nowrap;
  text-transform: none;
  letter-spacing: normal;
}

.lead-table__th-check {
  width: 44px;
  text-align: center;
}

.lead-table__check-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.lead-table__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.lead-table__checkbox:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.lead-table__th-status {
  width: 120px;
}

.lead-table__th-owner {
  width: 140px;
}

.lead-table__th-followup {
  width: 180px;
}

.lead-table__th-updated {
  width: 100px;
}

@media (max-width: 767px) {
  .lead-table__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .lead-table__hide-lg {
    display: none;
  }
}

/* --- Draft rows --- */

.lead-table__draft-row td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
  vertical-align: middle;
}

.lead-table__draft-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lead-table__draft-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default);
  background: var(--color-bg-1);
}

.lead-table__draft-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.lead-table__draft-actions {
  text-align: right;
  white-space: nowrap;
}

.lead-table__draft-btn {
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-default);
  transition:
    background-color var(--transition-normal),
    color var(--transition-normal);
}

.lead-table__draft-btn--continue {
  color: var(--color-primary-6);
}

.lead-table__draft-btn--continue:hover {
  background: var(--color-primary-light);
}

.lead-table__draft-btn--remove {
  color: var(--color-text-3);
}

.lead-table__draft-btn--remove:hover {
  color: var(--color-text-1);
  background: var(--color-bg-3);
}
</style>
