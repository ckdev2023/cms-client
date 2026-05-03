<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import type { ProviderProgress } from "../types-detail";

/** 提供方进度卡片：展示每个提供方的完成度。 */
const { t, te } = useI18n();

defineProps<{ items: ProviderProgress[] }>();

/**
 * 计算提供方任务完成百分比。
 * @param p - 提供方进度项。
 * @returns 0 到 100 的整数百分比。
 */
function progressPercent(p: ProviderProgress): number {
  return p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
}
</script>

<template>
  <Card padding="md">
    <div class="prov__header">
      <span class="prov__kicker">{{
        t("cases.detail.overview.provider.kicker")
      }}</span>
      <span class="prov__title">{{
        t("cases.detail.overview.provider.title")
      }}</span>
    </div>
    <div v-if="items.length === 0" class="prov__empty">
      {{ t("cases.detail.overview.provider.empty") }}
    </div>
    <div v-else class="prov__list">
      <div v-for="(p, i) in items" :key="i" class="prov__row">
        <span class="prov__label">{{
          te(p.labelKey)
            ? t(p.labelKey)
            : p.label || t("cases.detail.providers.unspecified")
        }}</span>
        <div class="prov__bar">
          <div
            class="prov__bar-fill"
            :style="{ width: `${progressPercent(p)}%` }"
          />
        </div>
        <span class="prov__count">{{ p.done }}/{{ p.total }}</span>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.prov__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
}
.prov__kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.prov__title {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.prov__empty {
  padding: 12px 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}
.prov__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.prov__row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.prov__label {
  flex-shrink: 0;
  width: 120px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}
.prov__bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.prov__bar-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
.prov__count {
  flex-shrink: 0;
  min-width: 36px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
  text-align: right;
}
</style>
