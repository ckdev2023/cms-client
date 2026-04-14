<script setup lang="ts">
import type { CaseSummaryCardData } from "../types";

/** 案件摘要卡片组：展示各阶段案件统计。 */
defineProps<{
  cards: CaseSummaryCardData[];
}>();
</script>

<template>
  <div class="case-summary-cards">
    <div
      v-for="card in cards"
      :key="card.key"
      :class="[
        'case-summary-cards__item',
        `case-summary-cards__item--${card.variant}`,
      ]"
    >
      <span class="case-summary-cards__value">{{
        card.value.toLocaleString()
      }}</span>
      <span class="case-summary-cards__label">{{ card.label }}</span>
    </div>
  </div>
</template>

<style scoped>
.case-summary-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 767px) {
  .case-summary-cards {
    grid-template-columns: repeat(2, 1fr);
  }
}

.case-summary-cards__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
}

.case-summary-cards__value {
  font-size: 28px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.2;
}

.case-summary-cards__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.case-summary-cards__item--primary .case-summary-cards__value {
  color: var(--color-primary-6);
}

.case-summary-cards__item--info .case-summary-cards__value {
  color: var(--color-info, #0284c7);
}

.case-summary-cards__item--warning .case-summary-cards__value {
  color: #b45309;
}

.case-summary-cards__item--neutral .case-summary-cards__value {
  color: var(--color-text-2);
}
</style>
