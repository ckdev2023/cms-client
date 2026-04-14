<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { PaymentLogEntry, PaymentRecordStatus } from "../types";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Chip from "../../../shared/ui/Chip.vue";

/**
 * 回款流水表格：8 列（金额/日期/案件/节点/凭证/状态/操作人/备注）+ 操作列。
 *
 * 已作废/已冲正行以 muted 色调 + 金额删除线展示。
 */
withDefaults(
  defineProps<{
    entries?: PaymentLogEntry[];
  }>(),
  {
    entries: () => [],
  },
);

defineEmits<{
  "void-payment": [id: string];
  "reverse-payment": [id: string];
}>();

const { t } = useI18n();

const RECORD_TONE: Record<PaymentRecordStatus, ChipTone> = {
  valid: "success",
  voided: "danger",
  reversed: "warning",
};

const RECORD_KEY: Record<PaymentRecordStatus, string> = {
  valid: "billing.paymentLog.recordStatus.valid",
  voided: "billing.paymentLog.recordStatus.voided",
  reversed: "billing.paymentLog.recordStatus.reversed",
};

/**
 * 格式化日元金额。
 *
 * @param v - 金额数值
 * @returns 格式化后的字符串
 */
function fmtAmount(v: number): string {
  return v.toLocaleString("ja-JP");
}

/**
 * 判断流水记录是否已失效（已作废或已冲正）。
 *
 * @param entry - 回款流水记录
 * @returns 是否已失效
 */
function isInactive(entry: PaymentLogEntry): boolean {
  return entry.recordStatus !== "valid";
}
</script>

<template>
  <div class="payment-log">
    <div v-if="entries.length === 0" class="payment-log__empty">
      <p class="payment-log__empty-title">
        {{ t("billing.paymentLog.empty.title") }}
      </p>
      <p class="payment-log__empty-sub">
        {{ t("billing.paymentLog.empty.description") }}
      </p>
    </div>

    <table v-else class="payment-log__grid">
      <thead>
        <tr>
          <th class="payment-log__th payment-log__col--amount">
            {{ t("billing.paymentLog.columns.amount") }}
          </th>
          <th class="payment-log__th payment-log__col--date">
            {{ t("billing.paymentLog.columns.date") }}
          </th>
          <th class="payment-log__th">
            {{ t("billing.paymentLog.columns.caseName") }}
          </th>
          <th
            class="payment-log__th payment-log__col--hide-sm payment-log__col--node"
          >
            {{ t("billing.paymentLog.columns.node") }}
          </th>
          <th
            class="payment-log__th payment-log__col--hide-sm payment-log__col--receipt"
          >
            {{ t("billing.paymentLog.columns.receipt") }}
          </th>
          <th class="payment-log__th payment-log__col--status">
            {{ t("billing.paymentLog.columns.recordStatus") }}
          </th>
          <th
            class="payment-log__th payment-log__col--hide-md payment-log__col--operator"
          >
            {{ t("billing.paymentLog.columns.operator") }}
          </th>
          <th class="payment-log__th payment-log__col--hide-md">
            {{ t("billing.paymentLog.columns.note") }}
          </th>
          <th
            class="payment-log__th payment-log__col--hide-sm payment-log__col--ops"
          >
            {{ t("billing.paymentLog.columns.actions") }}
          </th>
        </tr>
      </thead>

      <tbody>
        <tr
          v-for="entry in entries"
          :key="entry.id"
          :class="[
            'payment-log__row',
            {
              'payment-log__row--voided': entry.recordStatus === 'voided',
              'payment-log__row--reversed': entry.recordStatus === 'reversed',
            },
          ]"
        >
          <!-- 回款金额 -->
          <td
            :class="[
              'payment-log__td payment-log__col--amount',
              {
                'payment-log__td--muted payment-log__amount--strike':
                  isInactive(entry),
              },
            ]"
          >
            {{ fmtAmount(entry.amount) }}
          </td>

          <!-- 回款日期 -->
          <td
            :class="[
              'payment-log__td payment-log__col--date',
              { 'payment-log__td--muted': isInactive(entry) },
            ]"
          >
            {{ entry.date }}
          </td>

          <!-- 关联案件 -->
          <td class="payment-log__td">
            <div
              :class="[
                'payment-log__case-name',
                { 'payment-log__td--muted': isInactive(entry) },
              ]"
            >
              {{ entry.caseName }}
            </div>
            <div class="payment-log__case-no">{{ entry.caseNo }}</div>
          </td>

          <!-- 关联收费节点 -->
          <td
            :class="[
              'payment-log__td payment-log__col--hide-sm payment-log__col--node',
              { 'payment-log__td--muted': isInactive(entry) },
            ]"
          >
            {{ entry.node }}
          </td>

          <!-- 凭证 -->
          <td
            class="payment-log__td payment-log__col--hide-sm payment-log__col--receipt"
          >
            <span v-if="entry.receipt" class="payment-log__receipt--yes">
              {{ t("billing.paymentLog.receiptYes") }}
            </span>
            <span v-else class="payment-log__receipt--no">{{
              t("billing.paymentLog.receiptNo")
            }}</span>
          </td>

          <!-- 记录状态 -->
          <td class="payment-log__td payment-log__col--status">
            <Chip :tone="RECORD_TONE[entry.recordStatus]" size="sm">
              {{ t(RECORD_KEY[entry.recordStatus]) }}
            </Chip>
          </td>

          <!-- 操作人 -->
          <td
            :class="[
              'payment-log__td payment-log__col--hide-md payment-log__col--operator',
              { 'payment-log__td--muted': isInactive(entry) },
            ]"
          >
            {{ entry.operator }}
          </td>

          <!-- 备注 -->
          <td
            :class="[
              'payment-log__td payment-log__col--hide-md',
              { 'payment-log__td--muted': isInactive(entry) },
            ]"
          >
            {{ entry.note || "—" }}
          </td>

          <!-- 操作 -->
          <td
            class="payment-log__td payment-log__col--hide-sm payment-log__col--ops"
          >
            <template v-if="entry.recordStatus === 'valid'">
              <button
                class="payment-log__action payment-log__action--void"
                type="button"
                @click="$emit('void-payment', entry.id)"
              >
                {{ t("billing.paymentLog.actionVoid") }}
              </button>
              <span class="payment-log__action-sep">|</span>
              <button
                class="payment-log__action payment-log__action--reverse"
                type="button"
                @click="$emit('reverse-payment', entry.id)"
              >
                {{ t("billing.paymentLog.actionReverse") }}
              </button>
            </template>
            <span v-else class="payment-log__td--muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.payment-log {
  width: 100%;
}

.payment-log__grid {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.payment-log__th {
  padding: 10px 16px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.payment-log__td {
  padding: 12px 16px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}

.payment-log__td--muted {
  color: var(--color-text-3);
}

/* --- Row tints --- */

.payment-log__row--voided {
  background: rgba(220, 38, 38, 0.03);
}

.payment-log__row--reversed {
  background: rgba(245, 158, 11, 0.04);
}

/* --- Column sizing --- */

.payment-log__col--amount {
  width: 120px;
  text-align: right;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}

.payment-log__col--date {
  width: 120px;
}

.payment-log__col--node {
  width: 140px;
}

.payment-log__col--receipt {
  width: 80px;
  text-align: center;
}

.payment-log__col--status {
  width: 100px;
}

.payment-log__col--operator {
  width: 100px;
}

.payment-log__col--ops {
  width: 110px;
  text-align: right;
}

/* --- Amount strikethrough --- */

.payment-log__amount--strike {
  text-decoration: line-through;
}

/* --- Case info --- */

.payment-log__case-name {
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.payment-log__case-no {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
  font-weight: var(--font-weight-semibold);
}

/* --- Receipt --- */

.payment-log__receipt--yes {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-success);
}

.payment-log__receipt--no {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

/* --- Action buttons --- */

.payment-log__action {
  all: unset;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  cursor: pointer;
  transition: color var(--transition-fast);
}

.payment-log__action--void:hover {
  color: #991b1b;
}

.payment-log__action--reverse:hover {
  color: #92400e;
}

.payment-log__action-sep {
  color: var(--color-border-1);
  margin: 0 6px;
}

/* --- Empty state --- */

.payment-log__empty {
  padding: 64px 16px;
  text-align: center;
}

.payment-log__empty-title {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  margin: 0 0 4px;
}

.payment-log__empty-sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  margin: 0;
}

/* --- Responsive --- */

@media (max-width: 767px) {
  .payment-log__col--hide-sm {
    display: none;
  }
}

@media (max-width: 1023px) {
  .payment-log__col--hide-md {
    display: none;
  }
}
</style>
