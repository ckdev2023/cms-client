<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import type { CaseBillingRow, BillingStatus } from "../types";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Chip from "../../../shared/ui/Chip.vue";
import { resolveGroupLabel } from "../../../shared/model/useGroupOptions";
import { resolveMilestoneLabel } from "../model/BillingAdapters";

/** 案件收费表格，仅逾期行可勾选，全选与 indeterminate 由父组件驱动。 */
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
  if (selectAllRef.value) {
    selectAllRef.value.indeterminate = props.isIndeterminate;
  }
});
</script>

<template>
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
            <th class="billing-table__th billing-table__col--checkbox">
              <label class="ui-checkbox-hit">
                <input
                  ref="selectAllRef"
                  type="checkbox"
                  name="billingSelectAll"
                  class="billing-table__checkbox"
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
            <th class="billing-table__th">
              {{ t("billing.list.columns.caseName") }}
            </th>
            <th class="billing-table__th billing-table__col--hide-sm">
              {{ t("billing.list.columns.client") }}
            </th>
            <th
              class="billing-table__th billing-table__col--hide-md billing-table__col--group"
            >
              {{ t("billing.list.columns.group") }}
            </th>
            <th class="billing-table__th billing-table__col--amount">
              {{ t("billing.list.columns.amountDue") }}
            </th>
            <th class="billing-table__th billing-table__col--amount">
              {{ t("billing.list.columns.amountReceived") }}
            </th>
            <th class="billing-table__th billing-table__col--amount">
              {{ t("billing.list.columns.amountOutstanding") }}
            </th>
            <th class="billing-table__th billing-table__col--hide-sm">
              {{ t("billing.list.columns.nextNode") }}
            </th>
            <th class="billing-table__th billing-table__col--status">
              {{ t("billing.list.columns.status") }}
            </th>
            <th
              class="billing-table__th billing-table__col--risk-ack billing-table__col--hide-sm"
            >
              {{ t("billing.riskAck.modal.title") }}
            </th>
            <th class="billing-table__th billing-table__col--actions">
              {{ t("billing.list.columns.actions") }}
            </th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
            :class="[
              'billing-table__row',
              { 'billing-table__row--overdue': row.status === 'overdue' },
            ]"
          >
            <td class="billing-table__td billing-table__col--checkbox">
              <label class="ui-checkbox-hit">
                <input
                  type="checkbox"
                  name="billingRowSelect"
                  class="billing-table__checkbox"
                  :class="{
                    'billing-table__checkbox--disabled': !isSelectable(row),
                  }"
                  :checked="selectedIds.has(row.id)"
                  :disabled="!isSelectable(row)"
                  :aria-label="
                    t('billing.list.columns.selectRow', { name: row.caseName })
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

            <!-- 案件名称 -->
            <td class="billing-table__td">
              <div class="billing-table__case-name">{{ row.caseName }}</div>
              <div class="billing-table__case-no">{{ row.caseNo }}</div>
            </td>

            <!-- 客户 -->
            <td class="billing-table__td billing-table__col--hide-sm">
              <div class="billing-table__client-name">
                {{ row.client.name }}
              </div>
              <div class="billing-table__client-type">
                {{ row.client.type }}
              </div>
            </td>

            <!-- 所属 Group -->
            <td
              class="billing-table__td billing-table__col--hide-md billing-table__col--group"
            >
              <Chip tone="neutral">
                {{ formatGroupLabel(row.group) }}
              </Chip>
            </td>

            <!-- 应收 -->
            <td class="billing-table__td billing-table__col--amount">
              {{ fmtAmount(row.amountDue) }}
            </td>

            <!-- 已收 -->
            <td
              :class="[
                'billing-table__td billing-table__col--amount',
                row.amountReceived > 0
                  ? 'billing-table__amount--positive'
                  : 'billing-table__amount--zero',
              ]"
            >
              {{ fmtAmount(row.amountReceived) }}
            </td>

            <!-- 未收 -->
            <td
              :class="[
                'billing-table__td billing-table__col--amount',
                row.amountOutstanding === 0
                  ? 'billing-table__amount--zero'
                  : row.status === 'overdue'
                    ? 'billing-table__amount--danger'
                    : 'billing-table__amount--warning',
              ]"
            >
              {{ fmtAmount(row.amountOutstanding) }}
            </td>

            <!-- 下一收款节点 -->
            <td class="billing-table__td billing-table__col--hide-sm">
              <template v-if="row.nextNode">
                <div
                  :class="[
                    'billing-table__node-name',
                    {
                      'billing-table__node-name--overdue':
                        row.status === 'overdue',
                    },
                  ]"
                >
                  {{ resolveMilestoneLabel(row.nextNode.name, t) }}
                </div>
                <div
                  :class="[
                    'billing-table__node-date',
                    {
                      'billing-table__node-date--overdue':
                        row.status === 'overdue',
                    },
                  ]"
                >
                  {{ row.nextNode.dueDate }}
                </div>
              </template>
              <div v-else class="billing-table__node-empty">
                {{ t("billing.list.nodeEmpty") }}
              </div>
            </td>

            <!-- 回款状态 -->
            <td class="billing-table__td billing-table__col--status">
              <Chip :tone="STATUS_TONE[row.status]">
                {{ t(STATUS_KEY[row.status]) }}
              </Chip>
            </td>

            <!-- 风险確認 -->
            <td
              class="billing-table__td billing-table__col--risk-ack billing-table__col--hide-sm"
            >
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
                  class="billing-table__risk-ack-btn"
                  type="button"
                  @click="$emit('risk-ack', row.caseId)"
                >
                  <Chip tone="danger" dot>
                    {{ t("billing.riskAck.chip.notAcknowledged") }}
                  </Chip>
                </button>
              </template>
            </td>

            <!-- 操作 -->
            <td class="billing-table__td billing-table__col--actions">
              <button
                v-if="row.status !== 'paid'"
                class="billing-table__action-btn"
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
.billing-table__th {
  padding: 10px 16px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}
.billing-table__td {
  padding: 12px 16px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-sm);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}
.billing-table__row:hover .billing-table__td {
  background-color: var(--color-bg-overlay-hover);
}
.billing-table__row--overdue {
  background: rgba(220, 38, 38, 0.04);
}
.billing-table__col--checkbox {
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
.billing-table__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}
.billing-table__checkbox--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.billing-table__col--group,
.billing-table__col--status {
  width: 100px;
}
.billing-table__col--amount {
  width: 100px;
  text-align: right;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.billing-table__col--risk-ack {
  width: 160px;
}
.billing-table__risk-ack-btn {
  all: unset;
  cursor: pointer;
  display: inline-flex;
}
.billing-table__col--actions {
  width: 100px;
  text-align: center;
}
.billing-table__action-btn {
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
.billing-table__action-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}
.billing-table__case-name {
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}
.billing-table__case-no {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
  font-weight: var(--font-weight-semibold);
}
.billing-table__client-name,
.billing-table__client-type {
  font-weight: var(--font-weight-semibold);
}
.billing-table__client-name {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}
.billing-table__client-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
.billing-table__amount--positive {
  color: var(--color-success);
}
.billing-table__amount--zero {
  color: var(--color-text-3);
}
.billing-table__amount--danger {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}
.billing-table__amount--warning {
  color: var(--color-warning-text);
}
.billing-table__node-name {
  font-size: var(--font-size-sm);
}
.billing-table__node-name--overdue {
  color: var(--color-danger-text);
  font-weight: var(--font-weight-extrabold);
}
.billing-table__node-date,
.billing-table__node-empty {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
.billing-table__node-date {
  font-size: var(--font-size-xs);
}
.billing-table__node-date--overdue {
  color: var(--color-danger-text);
}
.billing-table__node-empty {
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
  .billing-table__col--hide-sm {
    display: none;
  }
}
@media (max-width: 1023px) {
  .billing-table__col--hide-md {
    display: none;
  }
}
</style>
