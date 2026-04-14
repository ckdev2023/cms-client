<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { GroupStats } from "../types";

/** Group 关联统计面板，展示关联客户数与活跃案件数。 */
defineProps<{
  stats: GroupStats;
}>();

const { t } = useI18n();
</script>

<template>
  <section class="stats-panel" aria-label="Related statistics">
    <h4 class="stats-panel__title">
      {{ t("settings.group.detail.stats") }}
    </h4>

    <div class="stats-panel__grid">
      <div class="stats-panel__card">
        <span class="stats-panel__card-value">{{ stats.customerCount }}</span>
        <span class="stats-panel__card-label">
          {{ t("settings.group.detail.customerCount") }}
        </span>
      </div>
      <div class="stats-panel__card">
        <span class="stats-panel__card-value">{{ stats.activeCaseCount }}</span>
        <span class="stats-panel__card-label">
          {{ t("settings.group.detail.activeCaseCount") }}
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-panel__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.stats-panel__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.stats-panel__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
}

.stats-panel__card-value {
  font-size: var(--font-size-2xl);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  font-variant-numeric: tabular-nums;
}

.stats-panel__card-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-3);
}
</style>
