<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CaseSummaryCardData } from "../types";

/** 案件摘要卡片组：展示各阶段案件统计。 */
defineProps<{
  cards: CaseSummaryCardData[];
}>();

const { t } = useI18n();
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
      <span class="case-summary-cards__label">{{ t(card.i18nKey) }}</span>
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

  .case-summary-cards__item {
    padding: 16px 20px;
  }

  .case-summary-cards__value {
    font-size: var(--font-size-2xl);
  }
}

.case-summary-cards__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-1);
}

.case-summary-cards__value {
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-tight);
  line-height: var(--leading-tight);
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
  color: var(--color-info-text);
}

.case-summary-cards__item--warning .case-summary-cards__value {
  color: var(--color-warning-text);
}

.case-summary-cards__item--neutral .case-summary-cards__value {
  color: var(--color-text-2);
}
</style>
