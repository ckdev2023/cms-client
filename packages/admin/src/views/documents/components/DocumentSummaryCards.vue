<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { DocumentSummaryCardData } from "../types";

/**
 * 资料概览摘要卡片区，展示 4 张统计卡片。
 */
const { t } = useI18n();

defineProps<{
  cards: DocumentSummaryCardData[];
}>();
</script>

<template>
  <section class="doc-summary">
    <div class="doc-summary__header">
      <div class="doc-summary__title">
        {{ t("documents.list.summaryTitle") }}
      </div>
      <p class="doc-summary__subtitle">
        {{ t("documents.list.summarySubtitle") }}
      </p>
    </div>

    <div class="doc-summary__grid">
      <div
        v-for="card in cards"
        :key="card.key"
        :class="['doc-summary-card', `doc-summary-card--${card.variant}`]"
      >
        <div class="doc-summary-card__label">
          <span class="doc-summary-card__dot" />
          {{ t(`documents.list.summary.${card.key}`) }}
        </div>
        <div class="doc-summary-card__value">{{ card.value }}</div>
        <div class="doc-summary-card__hint">{{ card.label }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.doc-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-summary__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.doc-summary__subtitle {
  margin: 4px 0 0;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.doc-summary__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .doc-summary__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .doc-summary__grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

.doc-summary-card {
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

.doc-summary-card::after {
  content: "";
  position: absolute;
  inset: auto -24px -24px auto;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
  background: rgba(255, 255, 255, 0.5);
  filter: blur(2px);
}

.doc-summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.doc-summary-card__label {
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

.doc-summary-card__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
  background: currentColor;
  opacity: 0.9;
}

.doc-summary-card__value {
  position: relative;
  z-index: 1;
  margin-top: 18px;
  font-size: 34px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  letter-spacing: -0.03em;
  line-height: 1;
}

.doc-summary-card__hint {
  position: relative;
  z-index: 1;
  margin-top: 14px;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  line-height: 1.6;
}

.doc-summary-card--info {
  border-color: rgba(59, 130, 246, 0.14);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.06), #ffffff 62%);
}

.doc-summary-card--info .doc-summary-card__label {
  color: #2563eb;
}

.doc-summary-card--warning {
  border-color: rgba(245, 158, 11, 0.18);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), #ffffff 62%);
}

.doc-summary-card--warning .doc-summary-card__label {
  color: #b45309;
}

.doc-summary-card--danger {
  border-color: rgba(220, 38, 38, 0.14);
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.06), #ffffff 62%);
}

.doc-summary-card--danger .doc-summary-card__label {
  color: var(--color-danger);
}

/* P0-CONTRACT §5 #4: 红色边框变体 */
.doc-summary-card--neutral {
  border-color: rgba(220, 38, 38, 0.3);
  background: linear-gradient(180deg, rgba(220, 38, 38, 0.04), #ffffff 62%);
}

.doc-summary-card--neutral .doc-summary-card__label {
  color: var(--color-danger, #dc2626);
}
</style>
