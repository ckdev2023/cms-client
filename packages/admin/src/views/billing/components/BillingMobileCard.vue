<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CaseBillingRow, BillingStatus } from "../types";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Chip from "../../../shared/ui/Chip.vue";
import ResponsiveTableRow from "../../../shared/ui/ResponsiveTableRow.vue";

/** 收费行移动端卡片。 */
defineProps<{
  row: CaseBillingRow;
  selected: boolean;
  selectable: boolean;
}>();

defineEmits<{
  toggle: [id: string, checked: boolean];
  "register-payment": [payload: { caseId: string; billingPlanId: string }];
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

const fmtAmount = (v: number): string => v.toLocaleString("ja-JP");
</script>

<template>
  <ResponsiveTableRow :highlighted="row.status === 'overdue'">
    <template #header>
      <div class="bill-card__identity">
        <div class="bill-card__case-name">{{ row.caseName }}</div>
        <div class="bill-card__case-no">{{ row.caseNo }}</div>
      </div>
      <Chip :tone="STATUS_TONE[row.status]">
        {{ t(STATUS_KEY[row.status]) }}
      </Chip>
    </template>
    <div class="bill-card__amounts">
      <div class="bill-card__amount-row">
        <span class="bill-card__amount-label">{{
          t("billing.list.columns.amountDue")
        }}</span>
        <span class="bill-card__amount-value">{{
          fmtAmount(row.amountDue)
        }}</span>
      </div>
      <div class="bill-card__amount-row">
        <span class="bill-card__amount-label">{{
          t("billing.list.columns.amountReceived")
        }}</span>
        <span
          :class="[
            'bill-card__amount-value',
            row.amountReceived > 0
              ? 'bill-card__amount--positive'
              : 'bill-card__amount--zero',
          ]"
        >
          {{ fmtAmount(row.amountReceived) }}
        </span>
      </div>
      <div class="bill-card__amount-row">
        <span class="bill-card__amount-label">{{
          t("billing.list.columns.amountOutstanding")
        }}</span>
        <span
          :class="[
            'bill-card__amount-value',
            row.amountOutstanding === 0
              ? 'bill-card__amount--zero'
              : row.status === 'overdue'
                ? 'bill-card__amount--danger'
                : 'bill-card__amount--warning',
          ]"
        >
          {{ fmtAmount(row.amountOutstanding) }}
        </span>
      </div>
    </div>
    <div v-if="row.client" class="bill-card__client">
      {{ row.client.name }}
    </div>
    <template #actions>
      <label v-if="selectable" class="bill-card__checkbox-label">
        <input
          type="checkbox"
          class="bill-card__checkbox"
          :checked="selected"
          @change="
            $emit('toggle', row.id, ($event.target as HTMLInputElement).checked)
          "
        />
      </label>
      <button
        v-if="row.status !== 'paid' && row.caseId"
        class="bill-card__action-btn"
        type="button"
        @click="
          $emit('register-payment', {
            caseId: row.caseId,
            billingPlanId: row.id,
          })
        "
      >
        {{ t("billing.list.actions.registerPayment") }}
      </button>
    </template>
  </ResponsiveTableRow>
</template>

<style scoped>
.bill-card__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bill-card__case-name {
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  font-size: var(--font-size-base);
}
.bill-card__case-no {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}
.bill-card__amounts {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.bill-card__amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.bill-card__amount-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}
.bill-card__amount-value {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
.bill-card__amount--positive {
  color: var(--color-success);
}
.bill-card__amount--zero {
  color: var(--color-text-3);
}
.bill-card__amount--danger {
  color: var(--color-danger);
}
.bill-card__amount--warning {
  color: var(--color-warning-text);
}
.bill-card__client {
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}
.bill-card__checkbox-label {
  display: inline-flex;
  align-items: center;
}
.bill-card__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}
.bill-card__action-btn {
  all: unset;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-md);
}
.bill-card__action-btn:hover {
  background: rgba(59, 130, 246, 0.08);
}
</style>
