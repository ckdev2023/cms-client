<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 分页区静态骨架。
 */
const { t } = useI18n();

defineProps<{
  start: number;
  end: number;
  total: number;
}>();

defineEmits<{
  prev: [];
  next: [];
}>();
</script>

<template>
  <div class="lead-pagination">
    <div class="lead-pagination__summary">
      {{ t("leads.list.pagination.summary", { start, end, total }) }}
    </div>
    <div class="lead-pagination__buttons">
      <button
        class="lead-pagination__btn"
        type="button"
        disabled
        @click="$emit('prev')"
      >
        {{ t("leads.list.pagination.prev") }}
      </button>
      <button
        class="lead-pagination__btn"
        type="button"
        disabled
        @click="$emit('next')"
      >
        {{ t("leads.list.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.lead-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
}

.lead-pagination__summary {
  font-size: var(--font-size-base);
  color: var(--color-text-3);
}

.lead-pagination__buttons {
  display: flex;
  gap: 8px;
}

.lead-pagination__btn {
  padding: 4px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  cursor: pointer;
}

.lead-pagination__btn:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
  opacity: 0.6;
}

.lead-pagination__btn:not(:disabled):hover {
  background: var(--color-bg-3);
}
</style>
