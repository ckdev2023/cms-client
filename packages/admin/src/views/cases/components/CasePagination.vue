<script setup lang="ts">
import { useI18n } from "vue-i18n";

/** 列表分页组件：展示区间信息并发出上一页/下一页事件。 */
const { t } = useI18n();

defineProps<{
  page: number;
  totalPages: number;
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
  <div class="case-pagination">
    <div class="case-pagination__summary">
      {{ t("cases.list.pagination.summary", { start, end, total }) }}
    </div>
    <div class="case-pagination__buttons">
      <button
        class="case-pagination__btn"
        type="button"
        :disabled="page <= 1"
        @click="$emit('prev')"
      >
        {{ t("cases.list.pagination.prev") }}
      </button>
      <button
        class="case-pagination__btn"
        type="button"
        :disabled="page >= totalPages"
        @click="$emit('next')"
      >
        {{ t("cases.list.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.case-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-1);
}

.case-pagination__summary {
  font-size: var(--font-size-base);
  color: var(--color-text-3);
}

.case-pagination__buttons {
  display: flex;
  gap: 8px;
}

.case-pagination__btn {
  padding: 4px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  cursor: pointer;
}

.case-pagination__btn:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
  opacity: 0.6;
}

.case-pagination__btn:not(:disabled):hover {
  background: var(--color-bg-3);
}
</style>
