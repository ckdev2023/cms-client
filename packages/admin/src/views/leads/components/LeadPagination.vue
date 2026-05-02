<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/** 分页区：显示当前页范围与总数，支持上下页切换。 */
const { t } = useI18n();

const props = defineProps<{
  start: number;
  end: number;
  total: number;
  page?: number;
  totalPages?: number;
}>();

defineEmits<{
  prev: [];
  next: [];
}>();

const hasPrev = computed(() => (props.page ?? 1) > 1);
const hasNext = computed(() => {
  if (props.totalPages != null) return (props.page ?? 1) < props.totalPages;
  return props.end < props.total;
});
</script>

<template>
  <div class="lead-pagination">
    <div class="lead-pagination__summary">
      <template v-if="total === 0">
        {{ t("leads.list.pagination.empty") }}
      </template>
      <template v-else>
        {{ t("leads.list.pagination.summary", { start, end, total }) }}
      </template>
    </div>
    <div class="lead-pagination__buttons">
      <button
        class="lead-pagination__btn"
        type="button"
        :disabled="!hasPrev || undefined"
        @click="$emit('prev')"
      >
        {{ t("leads.list.pagination.prev") }}
      </button>
      <button
        class="lead-pagination__btn"
        type="button"
        :disabled="!hasNext || undefined"
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
  min-height: 32px;
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
