<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { SummaryCardData } from "../types";

/**
 * 客户工作概览摘要卡片区，展示 4 张统计卡片。
 */
const { t } = useI18n();

defineProps<{
  cards: SummaryCardData[];
}>();
</script>

<template>
  <section class="customer-summary">
    <div class="customer-summary__header">
      <div class="customer-summary__title">
        {{ t("customers.list.summaryTitle") }}
      </div>
      <p class="customer-summary__subtitle">
        {{ t("customers.list.summarySubtitle") }}
      </p>
    </div>

    <div class="customer-summary__grid">
      <div
        v-for="card in cards"
        :key="card.key"
        :class="[
          'customer-summary-card',
          `customer-summary-card--${card.variant}`,
        ]"
      >
        <div class="customer-summary-card__label">
          <span class="customer-summary-card__dot" />
          {{ t(`customers.list.summary.${card.key}.label`) }}
        </div>
        <div class="customer-summary-card__value">{{ card.value }}</div>
        <div class="customer-summary-card__hint">
          {{ t(`customers.list.summary.${card.key}.hint`) }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.customer-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.customer-summary__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.customer-summary__subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.customer-summary__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .customer-summary__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .customer-summary__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.customer-summary-card {
  position: relative;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  min-height: 148px;
  padding: 20px;
  overflow: hidden;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.customer-summary-card::after {
  content: "";
  position: absolute;
  inset: auto -24px -24px auto;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.5);
  filter: blur(2px);
}

.customer-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.customer-summary-card__label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: var(--font-weight-extrabold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-text-3);
}

.customer-summary-card__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  background: currentColor;
  opacity: 0.9;
}

.customer-summary-card__value {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  font-size: 34px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  letter-spacing: -0.03em;
  line-height: 1;
}

.customer-summary-card__hint {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  line-height: 1.6;
}

.customer-summary-card--primary {
  border-color: rgba(3, 105, 161, 0.14);
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.06), #ffffff 62%);
}

.customer-summary-card--primary .customer-summary-card__label {
  color: var(--color-primary-6);
}

.customer-summary-card--info {
  border-color: rgba(59, 130, 246, 0.14);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.06), #ffffff 62%);
}

.customer-summary-card--info .customer-summary-card__label {
  color: #2563eb;
}

.customer-summary-card--warning {
  border-color: rgba(245, 158, 11, 0.18);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), #ffffff 62%);
}

.customer-summary-card--warning .customer-summary-card__label {
  color: #b45309;
}

.customer-summary-card--neutral {
  border-color: rgba(148, 163, 184, 0.2);
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.08), #ffffff 62%);
}
</style>
