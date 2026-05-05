<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { LeadDraft, LeadSummary } from "../types";
import ResponsiveTable from "../../../shared/ui/ResponsiveTable.vue";
import type { ResponsiveColumn } from "../../../shared/ui/ResponsiveTable.vue";
import ResponsiveTableRow from "../../../shared/ui/ResponsiveTableRow.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import LeadTableRow from "./LeadTableRow.vue";
import LeadEmptyState from "./LeadEmptyState.vue";

/** 咨询线索列表表格，桌面/移动端自适应。 */
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

const STATUS_TONE: Record<string, ChipTone> = {
  new: "warning",
  following: "primary",
  pending_sign: "primary",
  signed: "success",
  converted_case: "success",
  lost: "neutral",
};

const columns: ResponsiveColumn[] = [
  { key: "name", label: t("leads.list.columns.name") },
  { key: "contact", label: t("leads.list.columns.contact"), hideAt: "md" },
  { key: "status", label: t("leads.list.columns.status") },
  { key: "owner", label: t("leads.list.columns.owner"), hideAt: "md" },
  { key: "followUp", label: t("leads.list.columns.followUp"), hideAt: "lg" },
  { key: "updated", label: t("leads.list.columns.updated"), hideAt: "lg" },
];
</script>

<template>
  <ResponsiveTable :columns="columns" :rows="leads" :row-key="(l: any) => l.id">
    <!-- Desktop: existing table -->
    <table class="lead-table">
      <thead>
        <tr>
          <th class="lead-table__th-check">
            <label class="ui-checkbox-hit">
              <input
                type="checkbox"
                name="leadSelectAll"
                class="lead-table__checkbox"
                :checked="allSelected"
                :indeterminate="indeterminate"
                :aria-label="t('leads.list.columns.selectAll')"
                @change="
                  $emit(
                    'selectAll',
                    ($event.target as HTMLInputElement).checked,
                  )
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
            <label class="ui-checkbox-hit">
              <input
                type="checkbox"
                name="leadRowSelect"
                disabled
                class="lead-table__checkbox"
              />
            </label>
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

    <!-- Mobile: draft cards -->
    <template #mobile-prepend>
      <div
        v-for="draft in drafts ?? []"
        :key="draft.id"
        class="responsive-table__card lead-card--draft"
      >
        <ResponsiveTableRow>
          <template #header>
            <div class="lead-card__draft-header">
              <span class="lead-card__draft-chip">
                {{ t("leads.list.draft.rowLabel") }}
              </span>
              <span class="lead-card__draft-name">
                {{ draft.fields.name || t("leads.list.draft.rowLabel") }}
              </span>
            </div>
          </template>
          <template #actions>
            <button
              class="lead-card__draft-btn lead-card__draft-btn--continue"
              type="button"
              @click="$emit('resumeDraft', draft.id)"
            >
              {{ t("leads.list.draft.continue") }}
            </button>
            <button
              class="lead-card__draft-btn lead-card__draft-btn--remove"
              type="button"
              @click="$emit('removeDraft', draft.id)"
            >
              {{ t("leads.list.draft.remove") }}
            </button>
          </template>
        </ResponsiveTableRow>
      </div>
    </template>

    <!-- Mobile: card per lead row -->
    <template #mobile-card="{ row }">
      <ResponsiveTableRow>
        <template #header>
          <div class="lead-card__identity">
            <a class="lead-card__name" :href="`#/leads/${row.id}`">
              {{ row.name }}
            </a>
            <span class="lead-card__meta">{{ row.id }}</span>
          </div>
          <Chip :tone="STATUS_TONE[row.status] ?? 'neutral'" dot>
            {{ t(`leads.list.status.${row.status}`) }}
          </Chip>
        </template>
        <div v-if="row.phone || row.email" class="lead-card__contact">
          {{ [row.phone, row.email].filter(Boolean).join(" · ") }}
        </div>
        <div v-if="row.businessTypeLabel" class="lead-card__biz">
          {{ row.businessTypeLabel }}
          <template v-if="row.sourceLabel"> · {{ row.sourceLabel }}</template>
        </div>
      </ResponsiveTableRow>
    </template>

    <!-- Mobile: empty state -->
    <template #empty>
      <LeadEmptyState
        v-if="leads.length === 0 && (drafts ?? []).length === 0"
        @open-create-modal="$emit('openCreateModal')"
      />
    </template>
  </ResponsiveTable>
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
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
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

/* --- Mobile card styles --- */

.lead-card--draft {
  background: var(--color-bg-elevated);
}

.lead-card__draft-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lead-card__draft-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
}

.lead-card__draft-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.lead-card__draft-btn {
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
}

.lead-card__draft-btn--continue {
  color: var(--color-primary-6);
}

.lead-card__draft-btn--remove {
  color: var(--color-text-3);
}

.lead-card__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lead-card__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  text-decoration: none;
  font-size: var(--font-size-base);
}

.lead-card__name:hover {
  color: var(--color-primary-6);
}

.lead-card__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.lead-card__contact {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.lead-card__biz {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
