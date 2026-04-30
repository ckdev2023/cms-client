<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/**
 * 资料列表分页区：受控组件，接收 page/limit/total 计算显示范围与按钮可用状态。
 */
const { t } = useI18n();

const props = defineProps<{
  page: number;
  limit: number;
  total: number;
}>();

defineEmits<{
  prev: [];
  next: [];
}>();

const start = computed(() =>
  props.total > 0 ? (props.page - 1) * props.limit + 1 : 0,
);
const end = computed(() => Math.min(props.page * props.limit, props.total));
const hasPrev = computed(() => props.page > 1);
const hasNext = computed(() => props.page * props.limit < props.total);
</script>

<template>
  <div class="doc-pagination">
    <div class="doc-pagination__summary">
      {{
        t("documents.list.pagination.summary", {
          start,
          end,
          total: props.total,
        })
      }}
    </div>
    <div class="doc-pagination__buttons">
      <button
        class="doc-pagination__btn"
        type="button"
        :disabled="!hasPrev"
        @click="$emit('prev')"
      >
        {{ t("documents.list.pagination.prev") }}
      </button>
      <button
        class="doc-pagination__btn"
        type="button"
        :disabled="!hasNext"
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
