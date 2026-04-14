<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, PaymentRow } from "../types-detail";
import { BILLING_STATUSES } from "../constants";
import type { BillingStatusKey } from "../types";

/** 收费 Tab：展示费用统计卡片、收款节点表格与发票占位。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

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
 * 获取收费状态中文标签。
 *
 * @param row - 收款节点
 * @returns 中文状态标签
 */
function paymentLabel(row: PaymentRow): string {
  return (
    BILLING_STATUSES[row.status as BillingStatusKey]?.label ?? row.statusLabel
  );
}
</script>

<template>
  <div class="billing-tab">
    <Card padding="lg">
      <template #header>
        <h2 class="billing-tab__title">收费</h2>
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
          登记回款
        </Button>
      </template>

      <!-- Stats cards -->
      <div class="billing-tab__stats">
        <div class="billing-tab__stat billing-tab__stat--total">
          <div class="billing-tab__stat-label">总费用</div>
          <div class="billing-tab__stat-value">{{ detail.billing.total }}</div>
        </div>
        <div class="billing-tab__stat billing-tab__stat--received">
          <div class="billing-tab__stat-label billing-tab__stat-label--success">
            已收金额
          </div>
          <div class="billing-tab__stat-value billing-tab__stat-value--success">
            {{ detail.billing.received }}
          </div>
        </div>
        <div class="billing-tab__stat billing-tab__stat--outstanding">
          <div class="billing-tab__stat-label billing-tab__stat-label--danger">
            未收金额
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
              <th class="billing-tab__th">日期</th>
              <th class="billing-tab__th">类型</th>
              <th class="billing-tab__th billing-tab__th--right">金额</th>
              <th class="billing-tab__th billing-tab__th--center">状态</th>
              <th class="billing-tab__th billing-tab__th--right">操作</th>
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
                  查看收据
                </button>
                <button
                  v-else-if="!readonly"
                  class="billing-tab__link"
                  type="button"
                >
                  登记回款
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Invoice placeholder -->
      <template #footer>
        <div class="billing-tab__invoice">
          <h3 class="billing-tab__invoice-title">发票信息</h3>
          <p class="billing-tab__invoice-placeholder">
            当前原型暂不展示发票详情。
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
