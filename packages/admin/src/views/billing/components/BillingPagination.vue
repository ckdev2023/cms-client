<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

/** 分页组件：展示范围文案与前后翻页按钮。 */
const props = withDefaults(
  defineProps<{
    total?: number;
    pageSize?: number;
    currentPage?: number;
  }>(),
  {
    total: 0,
    pageSize: 20,
    currentPage: 1,
  },
);

const emit = defineEmits<{
  "update:page": [page: number];
}>();

const { t } = useI18n();

const rangeStart = computed(() =>
  props.total === 0 ? 0 : (props.currentPage - 1) * props.pageSize + 1,
);

const rangeEnd = computed(() =>
  Math.min(props.currentPage * props.pageSize, props.total),
);

const hasPrev = computed(() => props.currentPage > 1);
const hasNext = computed(() => rangeEnd.value < props.total);

/** 翻到上一页。 */
function goPrev() {
  if (hasPrev.value) emit("update:page", props.currentPage - 1);
}

/** 翻到下一页。 */
function goNext() {
  if (hasNext.value) emit("update:page", props.currentPage + 1);
}
</script>

<template>
  <div class="billing-pagination">
    <div class="billing-pagination__info">
      {{
        t("billing.list.pagination.summary", {
          start: rangeStart,
          end: rangeEnd,
          total,
        })
      }}
    </div>
    <div class="billing-pagination__btns">
      <button
        class="billing-pagination__btn"
        :disabled="!hasPrev"
        type="button"
        @click="goPrev"
      >
        {{ t("billing.list.pagination.prev") }}
      </button>
      <button
        class="billing-pagination__btn"
        :disabled="!hasNext"
        type="button"
        @click="goNext"
      >
        {{ t("billing.list.pagination.next") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.billing-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-top: 1px solid var(--color-border-1);
}

.billing-pagination__info {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.billing-pagination__btns {
  display: flex;
  gap: 8px;
}

.billing-pagination__btn {
  all: unset;
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  min-height: 32px;
  box-sizing: border-box;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  cursor: pointer;
}

.billing-pagination__btn:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
  opacity: 0.6;
}

.billing-pagination__btn:hover:not(:disabled) {
  background: var(--color-bg-overlay);
}
</style>
