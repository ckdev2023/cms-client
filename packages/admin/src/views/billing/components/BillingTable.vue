<script setup lang="ts">
import { ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import type { CaseBillingRow, BillingStatus } from "../types";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Chip from "../../../shared/ui/Chip.vue";

/**
 * 案件收费表格，展示 8 列数据 + checkbox 选择列。
 *
 * 仅逾期行可勾选；全选/indeterminate 由父组件通过 props 驱动。
 */
const props = withDefaults(
  defineProps<{
    rows?: CaseBillingRow[];
    selectedIds?: Set<string>;
    isAllSelected?: boolean;
    isIndeterminate?: boolean;
  }>(),
  {
    rows: () => [],
    selectedIds: () => new Set<string>(),
    isAllSelected: false,
    isIndeterminate: false,
  },
);

defineEmits<{
  "toggle-row": [id: string, checked: boolean];
  "toggle-all": [checked: boolean];
}>();

const { t } = useI18n();

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

const GROUP_KEY: Record<string, string> = {
  "tokyo-1": "billing.list.groups.tokyo-1",
  "tokyo-2": "billing.list.groups.tokyo-2",
  osaka: "billing.list.groups.osaka",
};

/**
 * 判断行是否可勾选（仅逾期行可选）。
 *
 * @param row - 案件收费行
 * @returns 是否可勾选
 */
function isSelectable(row: CaseBillingRow): boolean {
  return row.status === "overdue";
}

/**
 * 格式化日元金额。
 *
 * @param v - 金额数值
 * @returns 格式化后的字符串
 */
function fmtAmount(v: number): string {
  return v.toLocaleString("ja-JP");
}

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

    <table v-else class="billing-table__grid">
      <thead>
        <tr>
          <th class="billing-table__th billing-table__col--checkbox">
            <label class="billing-table__checkbox-wrap">
              <input
                ref="selectAllRef"
                type="checkbox"
                class="billing-table__checkbox"
                :checked="isAllSelected"
                :aria-label="t('billing.list.columns.selectAll')"
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
            <input
              type="checkbox"
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
            <Chip tone="neutral" size="sm">
              {{ GROUP_KEY[row.group] ? t(GROUP_KEY[row.group]) : row.group }}
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
                {{ row.nextNode.name }}
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
            <Chip :tone="STATUS_TONE[row.status]" size="sm">
              {{ t(STATUS_KEY[row.status]) }}
            </Chip>
          </td>
        </tr>
      </tbody>
    </table>
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
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}

.billing-table__row--overdue {
  background: rgba(220, 38, 38, 0.04);
}

/* --- Checkbox --- */

.billing-table__col--checkbox {
  width: 44px;
  text-align: center;
}

.billing-table__checkbox-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.billing-table__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.billing-table__checkbox--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* --- Column widths --- */

.billing-table__col--group {
  width: 100px;
}

.billing-table__col--amount {
  width: 100px;
  text-align: right;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.billing-table__col--status {
  width: 100px;
}

/* --- Case name --- */

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

/* --- Client --- */

.billing-table__client-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.billing-table__client-type {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

/* --- Amount colors --- */

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
  color: #b45309;
}

/* --- Next node --- */

.billing-table__node-name {
  font-size: var(--font-size-sm);
}

.billing-table__node-name--overdue {
  color: #991b1b;
  font-weight: var(--font-weight-extrabold);
}

.billing-table__node-date {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.billing-table__node-date--overdue {
  color: #991b1b;
}

.billing-table__node-empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

/* --- Empty state --- */

.billing-table__empty {
  padding: 64px 16px;
  text-align: center;
}

.billing-table__empty-title {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  margin: 0 0 4px;
}

.billing-table__empty-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  margin: 0;
}

/* --- Responsive --- */

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
