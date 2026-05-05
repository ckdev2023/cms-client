<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import type { CaseBillingRow, BillingStatus } from "../types";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Chip from "../../../shared/ui/Chip.vue";
import ResponsiveTable from "../../../shared/ui/ResponsiveTable.vue";
import type { ResponsiveColumn } from "../../../shared/ui/ResponsiveTable.vue";
import BillingMobileCard from "./BillingMobileCard.vue";
import { resolveGroupLabel } from "../../../shared/model/useGroupOptions";
import { resolveMilestoneLabel } from "../model/BillingAdapters";

/** 收费表格：表头全选、数据行与批量操作栏，桌面/移动端自适应。 */
const props = withDefaults(
  defineProps<{
    rows?: CaseBillingRow[];
    selectedIds?: Set<string>;
    isAllSelected?: boolean;
    isIndeterminate?: boolean;
    selectableCount?: number;
  }>(),
  {
    rows: () => [],
    selectedIds: () => new Set<string>(),
    isAllSelected: false,
    isIndeterminate: false,
    selectableCount: 0,
  },
);

defineEmits<{
  "toggle-row": [id: string, checked: boolean];
  "toggle-all": [checked: boolean];
  "register-payment": [caseId: string, billingPlanId: string];
  "risk-ack": [caseId: string];
}>();

const { t, locale } = useI18n();

const STATUS_TONE: Record<BillingStatus, ChipTone> = {
  overdue: "danger",
  partial: "primary",
  due: "warning",
  paid: "success",
};
const STATUS_KEY: Record<BillingStatus, string> = {
  overdue: "billing.list.status.overdue",
  partial: "billing.list.status.partial",
  due: "billing.list.status.due",
  paid: "billing.list.status.paid",
};

const formatGroupLabel = (value: string): string => {
  if (!value) return "—";
  return resolveGroupLabel(
    value,
    t("shared.group.disabledSuffix"),
    locale.value,
  );
};
const isSelectable = (row: CaseBillingRow): boolean => row.status === "overdue";
const fmtAmount = (v: number): string => v.toLocaleString("ja-JP");

const selectAllRef = ref<HTMLInputElement>();
watchEffect(() => {
  if (selectAllRef.value)
    selectAllRef.value.indeterminate = props.isIndeterminate;
});

const columns: ResponsiveColumn[] = [
  { key: "caseName", label: t("billing.list.columns.caseName") },
  { key: "client", label: t("billing.list.columns.client"), hideAt: "sm" },
  { key: "group", label: t("billing.list.columns.group"), hideAt: "md" },
  {
    key: "amountDue",
    label: t("billing.list.columns.amountDue"),
    align: "right",
  },
  {
    key: "amountReceived",
    label: t("billing.list.columns.amountReceived"),
    align: "right",
  },
  {
    key: "amountOutstanding",
    label: t("billing.list.columns.amountOutstanding"),
    align: "right",
  },
  { key: "nextNode", label: t("billing.list.columns.nextNode"), hideAt: "sm" },
  { key: "status", label: t("billing.list.columns.status") },
];
</script>

<template>
  <ResponsiveTable :columns="columns" :rows="rows" :row-key="(r: any) => r.id">
    <div class="billing-table">
      <div v-if="rows.length === 0" class="billing-table__empty">
        <p class="billing-table__empty-title">
          {{ t("billing.list.empty.title") }}
        </p>
        <p class="billing-table__empty-sub">
          {{ t("billing.list.empty.description") }}
        </p>
      </div>
      <template v-else>
        <div v-if="selectableCount === 0" class="bulk-empty-hint" role="note">
          {{ t("billing.list.bulk.emptyHint") }}
        </div>
        <table class="billing-table__grid">
          <thead>
            <tr>
              <th class="bt__th bt__col--checkbox">
                <label class="ui-checkbox-hit">
                  <input
                    ref="selectAllRef"
                    type="checkbox"
                    name="billingSelectAll"
                    class="bt__checkbox"
                    :checked="isAllSelected"
                    :aria-label="t('billing.list.columns.selectAll')"
                    :title="
                      selectableCount === 0
                        ? t('billing.list.bulk.emptyHint')
                        : undefined
                    "
                    @change="
                      $emit(
                        'toggle-all',
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                </label>
              </th>
              <th class="bt__th">{{ t("billing.list.columns.caseName") }}</th>
              <th class="bt__th bt__col--hide-sm">
                {{ t("billing.list.columns.client") }}
              </th>
              <th class="bt__th bt__col--hide-md bt__col--group">
                {{ t("billing.list.columns.group") }}
              </th>
              <th class="bt__th bt__col--amount">
                {{ t("billing.list.columns.amountDue") }}
              </th>
              <th class="bt__th bt__col--amount">
                {{ t("billing.list.columns.amountReceived") }}
              </th>
              <th class="bt__th bt__col--amount">
                {{ t("billing.list.columns.amountOutstanding") }}
              </th>
              <th class="bt__th bt__col--hide-sm">
                {{ t("billing.list.columns.nextNode") }}
              </th>
              <th class="bt__th bt__col--status">
                {{ t("billing.list.columns.status") }}
              </th>
              <th class="bt__th bt__col--risk-ack bt__col--hide-sm">
                {{ t("billing.riskAck.modal.title") }}
              </th>
              <th class="bt__th bt__col--actions">
                {{ t("billing.list.columns.actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.id"
              :class="[
                'bt__row',
                { 'bt__row--overdue': row.status === 'overdue' },
              ]"
            >
              <td class="bt__td bt__col--checkbox">
                <label class="ui-checkbox-hit">
                  <input
                    type="checkbox"
                    name="billingRowSelect"
                    class="bt__checkbox"
                    :class="{ 'bt__checkbox--disabled': !isSelectable(row) }"
                    :checked="selectedIds.has(row.id)"
                    :disabled="!isSelectable(row)"
                    :aria-label="
                      t('billing.list.columns.selectRow', {
                        name: row.caseName,
                      })
                    "
                    @change="
                      $emit(
                        'toggle-row',
                        row.id,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                </label>
              </td>
              <td class="bt__td">
                <div class="bt__case-name">{{ row.caseName }}</div>
                <div class="bt__case-no">{{ row.caseNo }}</div>
              </td>
              <td class="bt__td bt__col--hide-sm">
                <div class="bt__client-name">{{ row.client.name }}</div>
                <div class="bt__client-type">{{ row.client.type }}</div>
              </td>
              <td class="bt__td bt__col--hide-md bt__col--group">
                <Chip tone="neutral">{{ formatGroupLabel(row.group) }}</Chip>
              </td>
              <td class="bt__td bt__col--amount">
                {{ fmtAmount(row.amountDue) }}
              </td>
              <td
                :class="[
                  'bt__td bt__col--amount',
                  row.amountReceived > 0
                    ? 'bt__amount--positive'
                    : 'bt__amount--zero',
                ]"
              >
                {{ fmtAmount(row.amountReceived) }}
              </td>
              <td
                :class="[
                  'bt__td bt__col--amount',
                  row.amountOutstanding === 0
                    ? 'bt__amount--zero'
                    : row.status === 'overdue'
                      ? 'bt__amount--danger'
                      : 'bt__amount--warning',
                ]"
              >
                {{ fmtAmount(row.amountOutstanding) }}
              </td>
              <td class="bt__td bt__col--hide-sm">
                <template v-if="row.nextNode">
                  <div
                    :class="[
                      'bt__node-name',
                      { 'bt__node-name--overdue': row.status === 'overdue' },
                    ]"
                  >
                    {{ resolveMilestoneLabel(row.nextNode.name, t) }}
                  </div>
                  <div
                    :class="[
                      'bt__node-date',
                      { 'bt__node-date--overdue': row.status === 'overdue' },
                    ]"
                  >
                    {{ row.nextNode.dueDate }}
                  </div>
                </template>
                <div v-else class="bt__node-empty">
                  {{ t("billing.list.nodeEmpty") }}
                </div>
              </td>
              <td class="bt__td bt__col--status">
                <Chip :tone="STATUS_TONE[row.status]">{{
                  t(STATUS_KEY[row.status])
                }}</Chip>
              </td>
              <td class="bt__td bt__col--risk-ack bt__col--hide-sm">
                <template v-if="row.status === 'overdue'">
                  <Chip v-if="row.billingRiskAcknowledged" tone="success">
                    {{
                      t("billing.riskAck.chip.acknowledged", {
                        date: row.billingRiskAcknowledgedAt ?? "",
                      })
                    }}
                  </Chip>
                  <button
                    v-else
                    class="bt__risk-ack-btn"
                    type="button"
                    @click="$emit('risk-ack', row.caseId)"
                  >
                    <Chip tone="danger" dot>{{
                      t("billing.riskAck.chip.notAcknowledged")
                    }}</Chip>
                  </button>
                </template>
              </td>
              <td class="bt__td bt__col--actions">
                <button
                  v-if="row.status !== 'paid'"
                  class="bt__action-btn"
                  type="button"
                  @click="$emit('register-payment', row.caseId, row.id)"
                >
                  {{ t("billing.list.actions.registerPayment") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </template>
    </div>

    <template #mobile-card="{ row }">
      <BillingMobileCard
        :row="row"
        :selected="selectedIds.has(row.id)"
        :selectable="isSelectable(row)"
        @toggle="(id, checked) => $emit('toggle-row', id, checked)"
        @register-payment="
          (caseId, planId) => $emit('register-payment', caseId, planId)
        "
      />
    </template>

    <template #empty>
      <div v-if="rows.length === 0" class="billing-table__empty">
        <p class="billing-table__empty-title">
          {{ t("billing.list.empty.title") }}
        </p>
        <p class="billing-table__empty-sub">
          {{ t("billing.list.empty.description") }}
        </p>
      </div>
    </template>
  </ResponsiveTable>
</template>

<style scoped>
.billing-table {
  width: 100%;
}
.billing-table__grid {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}
.bt__th {
  padding: 10px 16px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}
.bt__td {
  padding: 12px 16px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-sm);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}
.bt__row:hover .bt__td {
  background-color: var(--color-bg-overlay-hover);
}
.bt__row--overdue {
  background: rgba(220, 38, 38, 0.04);
}
.bt__col--checkbox {
  width: 44px;
  text-align: center;
}
.bulk-empty-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  background: var(--color-bg-overlay-hover, rgba(0, 0, 0, 0.02));
  border-bottom: 1px solid var(--color-border-1);
}
.bt__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}
.bt__checkbox--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.bt__col--group,
.bt__col--status {
  width: 100px;
}
.bt__col--amount {
  width: 100px;
  text-align: right;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.bt__col--risk-ack {
  width: 160px;
}
.bt__risk-ack-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
}
.bt__col--actions {
  width: 100px;
  text-align: center;
}
.bt__action-btn {
  all: unset;
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  box-sizing: border-box;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}
.bt__action-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}
.bt__case-name {
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}
.bt__case-no {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
  font-weight: var(--font-weight-semibold);
}
.bt__client-name,
.bt__client-type {
  font-weight: var(--font-weight-semibold);
}
.bt__client-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}
.bt__client-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
.bt__amount--positive {
  color: var(--color-success);
}
.bt__amount--zero {
  color: var(--color-text-3);
}
.bt__amount--danger {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}
.bt__amount--warning {
  color: var(--color-warning-text);
}
.bt__node-name {
  font-size: var(--font-size-sm);
}
.bt__node-name--overdue {
  color: var(--color-danger-text);
  font-weight: var(--font-weight-extrabold);
}
.bt__node-date,
.bt__node-empty {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
.bt__node-date {
  font-size: var(--font-size-xs);
}
.bt__node-date--overdue {
  color: var(--color-danger-text);
}
.bt__node-empty {
  font-size: var(--font-size-sm);
}
.billing-table__empty {
  padding: 64px 16px;
  text-align: center;
}
.billing-table__empty-title {
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  margin: 0 0 4px;
}
.billing-table__empty-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  margin: 0;
}
@media (max-width: 767px) {
  .bt__col--hide-sm {
    display: none;
  }
}
@media (max-width: 1023px) {
  .bt__col--hide-md {
    display: none;
  }
}
</style>
