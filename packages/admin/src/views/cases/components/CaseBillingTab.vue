<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, PaymentRow } from "../types-detail";
import { getBillingStatusI18nKey } from "../constants";

/** 收费 Tab：展示费用统计卡片、收款节点表格与发票占位。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const { t, te } = useI18n();

const STATUS_TONE: Record<string, ChipTone> = {
  paid: "success",
  partial: "warning",
  unpaid: "warning",
  arrears: "danger",
  waived: "neutral",
};

/**
 * 根据收费状态返回 Chip 色调。
 *
 * @param row - 收款节点
 * @returns ChipTone 色调
 */
function paymentTone(row: PaymentRow): ChipTone {
  return STATUS_TONE[row.status] ?? "neutral";
}

/**
 * 获取收费状态本地化标签；优先走 i18n catalog，fallback 到 fixture 自带 statusLabel。
 *
 * @param row - 收款节点
 * @returns 已本地化的状态标签
 */
function paymentLabel(row: PaymentRow): string {
  const key = getBillingStatusI18nKey(row.status);
  if (key && te(key)) {
    return t(key);
  }
  return row.statusLabel;
}
</script>

<template>
  <div class="billing-tab">
    <Card padding="lg">
      <template #header>
        <h2 class="billing-tab__title">
          {{ t("cases.detail.billing.title") }}
        </h2>
        <Button v-if="!readonly" variant="filled" tone="primary" size="sm">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
          {{ t("cases.detail.billing.recordPayment") }}
        </Button>
      </template>

      <!-- Stats cards -->
      <div class="billing-tab__stats">
        <div class="billing-tab__stat billing-tab__stat--total">
          <div class="billing-tab__stat-label">
            {{ t("cases.detail.billing.stats.total") }}
          </div>
          <div class="billing-tab__stat-value">{{ detail.billing.total }}</div>
        </div>
        <div class="billing-tab__stat billing-tab__stat--received">
          <div class="billing-tab__stat-label billing-tab__stat-label--success">
            {{ t("cases.detail.billing.stats.collected") }}
          </div>
          <div class="billing-tab__stat-value billing-tab__stat-value--success">
            {{ detail.billing.received }}
          </div>
        </div>
        <div class="billing-tab__stat billing-tab__stat--outstanding">
          <div class="billing-tab__stat-label billing-tab__stat-label--danger">
            {{ t("cases.detail.billing.stats.outstanding") }}
          </div>
          <div class="billing-tab__stat-value billing-tab__stat-value--danger">
            {{ detail.billing.outstanding }}
          </div>
        </div>
      </div>

      <!-- Payment table -->
      <div class="billing-tab__table-wrap">
        <table class="billing-tab__table">
          <thead>
            <tr>
              <th class="billing-tab__th">
                {{ t("cases.detail.billing.table.date") }}
              </th>
              <th class="billing-tab__th">
                {{ t("cases.detail.billing.table.type") }}
              </th>
              <th class="billing-tab__th billing-tab__th--right">
                {{ t("cases.detail.billing.table.amount") }}
              </th>
              <th class="billing-tab__th billing-tab__th--center">
                {{ t("cases.detail.billing.table.status") }}
              </th>
              <th class="billing-tab__th billing-tab__th--right">
                {{ t("cases.detail.billing.table.actions") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in detail.billing.payments"
              :key="`pay-${i}`"
              class="billing-tab__tr"
            >
              <td class="billing-tab__td billing-tab__td--bold">
                {{ row.date }}
              </td>
              <td class="billing-tab__td">{{ row.type }}</td>
              <td
                class="billing-tab__td billing-tab__td--right billing-tab__td--bold"
              >
                {{ row.amount }}
              </td>
              <td class="billing-tab__td billing-tab__td--center">
                <Chip :tone="paymentTone(row)" size="sm">
                  {{ paymentLabel(row) }}
                </Chip>
              </td>
              <td class="billing-tab__td billing-tab__td--right">
                <button
                  v-if="row.status === 'paid'"
                  class="billing-tab__link"
                  type="button"
                >
                  {{ t("cases.detail.billing.table.viewReceipt") }}
                </button>
                <button
                  v-else-if="!readonly"
                  class="billing-tab__link"
                  type="button"
                >
                  {{ t("cases.detail.billing.table.recordPayment") }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Invoice placeholder -->
      <template #footer>
        <div class="billing-tab__invoice">
          <h3 class="billing-tab__invoice-title">
            {{ t("cases.detail.billing.invoice.title") }}
          </h3>
          <p class="billing-tab__invoice-placeholder">
            {{ t("cases.detail.billing.invoice.placeholder") }}
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.billing-tab {
  display: grid;
  gap: 20px;
}

.billing-tab__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Stats ─────────────────────────────────────────────── */

.billing-tab__stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

@media (max-width: 640px) {
  .billing-tab__stats {
    grid-template-columns: 1fr;
  }
}

.billing-tab__stat {
  padding: 20px;
  border-radius: var(--radius-lg, 12px);
}

.billing-tab__stat--total {
  background: var(--color-bg-3);
}

.billing-tab__stat--received {
  background: rgba(34, 197, 94, 0.04);
}

.billing-tab__stat--outstanding {
  background: rgba(220, 38, 38, 0.03);
  border: 1px solid rgba(220, 38, 38, 0.08);
}

.billing-tab__stat-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  margin-bottom: 4px;
}

.billing-tab__stat-label--success {
  color: var(--color-success, #22c55e);
}

.billing-tab__stat-label--danger {
  color: var(--color-danger);
}

.billing-tab__stat-value {
  font-size: 20px;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  letter-spacing: -0.02em;
}

.billing-tab__stat-value--success {
  color: var(--color-success, #22c55e);
}

.billing-tab__stat-value--danger {
  color: var(--color-danger);
}

/* ── Table ─────────────────────────────────────────────── */

.billing-tab__table-wrap {
  overflow-x: auto;
}

.billing-tab__table {
  width: 100%;
  border-collapse: collapse;
}

.billing-tab__th {
  padding: 12px 16px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  text-align: left;
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.billing-tab__th--right {
  text-align: right;
}

.billing-tab__th--center {
  text-align: center;
}

.billing-tab__tr {
  transition: background-color 0.1s;
}

.billing-tab__tr:hover {
  background-color: var(--color-bg-3);
}

.billing-tab__td {
  padding: 14px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.billing-tab__td--bold {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.billing-tab__td--right {
  text-align: right;
}

.billing-tab__td--center {
  text-align: center;
}

/* ── Link button ───────────────────────────────────────── */

.billing-tab__link {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  cursor: pointer;
  white-space: nowrap;
}

.billing-tab__link:hover {
  text-decoration: underline;
}

/* ── Invoice placeholder ───────────────────────────────── */

.billing-tab__invoice {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.billing-tab__invoice-title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}

.billing-tab__invoice-placeholder {
  margin: 0;
  padding: 16px 0;
  text-align: center;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
