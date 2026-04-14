<script setup lang="ts">
/**
 * 客户表格组件：表头全选 checkbox、草稿行、数据行与空状态。
 */
import { useI18n } from "vue-i18n";
import type { CustomerDraft, CustomerSummary } from "../types";
import CustomerTableRow from "./CustomerTableRow.vue";
import CustomerEmptyState from "./CustomerEmptyState.vue";

/** 客户表格组件：表头全选 checkbox、草稿行、数据行与空状态。 */
const { t } = useI18n();

defineProps<{
  customers: CustomerSummary[];
  drafts?: CustomerDraft[];
  selectedIds?: Set<string>;
  allSelected?: boolean;
  indeterminate?: boolean;
}>();

defineEmits<{
  selectAll: [checked: boolean];
  selectRow: [id: string, checked: boolean];
  resumeDraft: [draftId: string];
  removeDraft: [draftId: string];
}>();
</script>

<template>
  <table class="customer-table">
    <thead>
      <tr>
        <th class="customer-table__th-check">
          <label class="customer-table__check-label">
            <input
              type="checkbox"
              class="customer-table__checkbox"
              :checked="allSelected"
              :indeterminate="indeterminate"
              :aria-label="t('customers.list.selectAll')"
              @change="
                $emit('selectAll', ($event.target as HTMLInputElement).checked)
              "
            />
          </label>
        </th>
        <th>{{ t("customers.list.columns.customer") }}</th>
        <th class="customer-table__hide-md">
          {{ t("customers.list.columns.furigana") }}
        </th>
        <th class="customer-table__th-cases">
          {{ t("customers.list.columns.cases") }}
        </th>
        <th class="customer-table__hide-md customer-table__th-contact">
          {{ t("customers.list.columns.lastContact") }}
        </th>
        <th class="customer-table__hide-md customer-table__th-owner">
          {{ t("customers.list.columns.owner") }}
        </th>
        <th class="customer-table__hide-lg customer-table__th-referral">
          {{ t("customers.list.columns.referral") }}
        </th>
        <th class="customer-table__hide-lg customer-table__th-group">
          {{ t("customers.list.columns.group") }}
        </th>
        <th class="customer-table__th-actions">
          {{ t("customers.list.columns.actions") }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="draft in drafts ?? []"
        :key="draft.id"
        class="customer-table__draft-row"
      >
        <td class="customer-table__th-check">
          <input type="checkbox" disabled class="customer-table__checkbox" />
        </td>
        <td colspan="7" class="customer-table__draft-cell">
          <span class="customer-table__draft-chip">
            {{ t("customers.list.draft.rowLabel") }}
          </span>
          <span class="customer-table__draft-name">
            {{
              draft.fields.displayName ||
              draft.fields.legalName ||
              t("customers.list.draft.rowLabel")
            }}
          </span>
        </td>
        <td class="customer-table__draft-actions">
          <button
            class="customer-table__draft-btn customer-table__draft-btn--continue"
            type="button"
            @click="$emit('resumeDraft', draft.id)"
          >
            {{ t("customers.list.draft.continue") }}
          </button>
          <button
            class="customer-table__draft-btn customer-table__draft-btn--remove"
            type="button"
            @click="$emit('removeDraft', draft.id)"
          >
            {{ t("customers.list.draft.remove") }}
          </button>
        </td>
      </tr>
      <CustomerTableRow
        v-for="customer in customers"
        :key="customer.id"
        :customer="customer"
        :selected="selectedIds?.has(customer.id) ?? false"
        @select="
          (id: string, checked: boolean) => $emit('selectRow', id, checked)
        "
      />
      <CustomerEmptyState
        v-if="customers.length === 0 && (drafts ?? []).length === 0"
      />
    </tbody>
  </table>
</template>

<style scoped>
.customer-table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.customer-table thead th {
  padding: 10px 16px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-table);
  white-space: nowrap;
  text-transform: none;
  letter-spacing: normal;
}

.customer-table__th-check {
  width: 44px;
  text-align: center;
}

.customer-table__check-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.customer-table__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.customer-table__th-cases {
  width: 140px;
  text-align: center;
}

.customer-table__th-contact {
  width: 120px;
}

.customer-table__th-owner {
  width: 100px;
}

.customer-table__th-referral {
  width: 110px;
}

.customer-table__th-group {
  width: 100px;
}

.customer-table__th-actions {
  text-align: right;
  width: 92px;
}

@media (max-width: 767px) {
  .customer-table__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .customer-table__hide-lg {
    display: none;
  }
}

.customer-table__draft-row td {
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
  vertical-align: middle;
}

.customer-table__draft-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.customer-table__draft-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default);
  background: var(--color-bg-1);
}

.customer-table__draft-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.customer-table__draft-actions {
  text-align: right;
  white-space: nowrap;
}

.customer-table__draft-btn {
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

.customer-table__draft-btn--continue {
  color: var(--color-primary-6);
}

.customer-table__draft-btn--continue:hover {
  background: var(--color-primary-light);
}

.customer-table__draft-btn--remove {
  color: var(--color-text-3);
}

.customer-table__draft-btn--remove:hover {
  color: var(--color-text-1);
  background: var(--color-bg-3);
}

.customer-table__checkbox:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
