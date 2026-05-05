<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { SuccessCloseoutInfo } from "../types-detail";

/** 成功结案核对清单：展示结案前置条件的完成情况。 */
const { t } = useI18n();

defineProps<{
  closeout: SuccessCloseoutInfo;
}>();
</script>

<template>
  <div class="closeout">
    <h3 class="closeout__title">
      {{ t("cases.detail.overview.successCloseout.title") }}
    </h3>
    <div
      :class="[
        'closeout__banner',
        closeout.allSatisfied
          ? 'closeout__banner--success'
          : 'closeout__banner--blocked',
      ]"
    >
      {{
        closeout.allSatisfied
          ? t("cases.detail.overview.successCloseout.allSatisfied")
          : t("cases.detail.overview.successCloseout.notSatisfied")
      }}
    </div>
    <ul class="closeout__list">
      <li
        v-for="pc in closeout.preconditions"
        :key="pc.code"
        :class="[
          'closeout__item',
          pc.satisfied
            ? 'closeout__item--satisfied'
            : 'closeout__item--unsatisfied',
        ]"
      >
        <span class="closeout__icon">
          {{ pc.satisfied ? "✓" : "✗" }}
        </span>
        <span class="closeout__label">{{ pc.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.closeout {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
}

.closeout__title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.closeout__banner {
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 12px;
}

.closeout__banner--success {
  background: rgba(34, 197, 94, 0.08);
  color: #15803d;
}

.closeout__banner--blocked {
  background: rgba(245, 158, 11, 0.08);
  color: var(--color-warning-text);
}

.closeout__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.closeout__item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
}

.closeout__item--satisfied {
  color: #15803d;
}

.closeout__item--unsatisfied {
  color: var(--color-danger);
}

.closeout__icon {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  border-radius: 50%;
  flex-shrink: 0;
}

.closeout__item--satisfied .closeout__icon {
  background: rgba(34, 197, 94, 0.12);
}

.closeout__item--unsatisfied .closeout__icon {
  background: rgba(220, 38, 38, 0.08);
}

.closeout__label {
  font-weight: var(--font-weight-semibold);
}
</style>
