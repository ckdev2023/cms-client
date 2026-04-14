<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 分页区静态骨架。
 * 后续任务可扩展为真正的分页状态管理。
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
  <div class="customer-pagination">
    <div class="customer-pagination__summary">
      {{ t("customers.list.pagination.summary", { start, end, total }) }}
    </div>
    <div class="customer-pagination__buttons">
      <button
        class="customer-pagination__btn"
        type="button"
        disabled
        @click="$emit('prev')"
      >
        {{ t("customers.list.pagination.prev") }}
      </button>
      <button
        class="customer-pagination__btn"
        type="button"
        disabled
        @click="$emit('next')"
      >
        {{ t("customers.list.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.customer-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
}

.customer-pagination__summary {
  font-size: var(--font-size-base);
  color: var(--color-text-3);
}

.customer-pagination__buttons {
  display: flex;
  gap: 8px;
}

.customer-pagination__btn {
  padding: 4px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  cursor: pointer;
}

.customer-pagination__btn:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
  opacity: 0.6;
}

.customer-pagination__btn:not(:disabled):hover {
  background: var(--color-bg-3);
}
</style>
