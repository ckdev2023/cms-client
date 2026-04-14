<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { BillingSummaryCardDef, BillingSummaryData } from "../types";

/**
 * 收费摘要卡片区，展示总应收/总已收/总未收/逾期欠款 4 张统计卡片。
 */
const props = withDefaults(
  defineProps<{
    cardDefs?: BillingSummaryCardDef[];
    summary?: BillingSummaryData;
  }>(),
  {
    cardDefs: () => [],
    summary: () => ({
      totalDue: 0,
      totalReceived: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
    }),
  },
);

const { t } = useI18n();

/**
 * 格式化日元金额。
 *
 * @param value - 金额数值
 * @returns 带 ¥ 前缀的格式化字符串
 */
function formatJPY(value: number): string {
  return `¥ ${value.toLocaleString("ja-JP")}`;
}
</script>

<template>
  <section class="billing-summary" :aria-label="t('billing.list.summaryLabel')">
    <div class="billing-summary__grid">
      <div
        v-for="card in props.cardDefs"
        :key="card.id"
        :class="[
          'billing-summary-card',
          `billing-summary-card--${card.variant}`,
        ]"
      >
        <div class="billing-summary-card__label">
          <span class="billing-summary-card__dot" />
          {{ t(card.labelKey) }}
        </div>
        <div class="billing-summary-card__value">
          {{ formatJPY(props.summary[card.key]) }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.billing-summary__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 640px) {
  .billing-summary__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .billing-summary__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.billing-summary-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  padding: 16px 20px;
}

.billing-summary-card__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-2);
}

.billing-summary-card__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.billing-summary-card--default .billing-summary-card__dot {
  background-color: var(--color-text-3);
}

.billing-summary-card--primary .billing-summary-card__dot {
  background-color: var(--color-primary-6);
}

.billing-summary-card--danger .billing-summary-card__dot {
  background-color: var(--color-danger);
}

.billing-summary-card__value {
  margin-top: 8px;
  font-size: 28px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.2;
}

.billing-summary-card--danger .billing-summary-card__value {
  color: var(--color-danger);
}
</style>
