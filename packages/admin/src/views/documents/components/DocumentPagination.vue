<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 资料列表分页区：显示当前范围与翻页按钮。
 */
const { t } = useI18n();

const props = defineProps<{
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
  <div class="doc-pagination">
    <div class="doc-pagination__summary">
      {{
        t("documents.list.pagination.summary", {
          start: props.start,
          end: props.end,
          total: props.total,
        })
      }}
    </div>
    <div class="doc-pagination__buttons">
      <button
        class="doc-pagination__btn"
        type="button"
        disabled
        @click="$emit('prev')"
      >
        {{ t("documents.list.pagination.prev") }}
      </button>
      <button
        class="doc-pagination__btn"
        type="button"
        disabled
        @click="$emit('next')"
      >
        {{ t("documents.list.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.doc-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
}

.doc-pagination__summary {
  font-size: var(--font-size-base);
  color: var(--color-text-3);
}

.doc-pagination__buttons {
  display: flex;
  gap: 8px;
}

.doc-pagination__btn {
  padding: 4px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  cursor: pointer;
}

.doc-pagination__btn:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
  opacity: 0.6;
}

.doc-pagination__btn:not(:disabled):hover {
  background: var(--color-bg-3);
}
</style>
