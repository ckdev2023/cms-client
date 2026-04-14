<script lang="ts">
/**
 * 分段控件选项。
 */
export interface SegmentOption<T extends string = string> {
  /**
   * 选项展示文案。
   */
  label: string;
  /**
   * 选项对应的取值。
   */
  value: T;
}
</script>

<script setup lang="ts" generic="T extends string = string">
/**
 * 通用分段控件，用于在有限选项之间快速切换当前值。
 */
defineProps<{
  modelValue: T;
  options: SegmentOption<T>[];
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: T];
}>();
</script>

<template>
  <div class="ui-segmented" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      role="tab"
      :aria-selected="modelValue === opt.value"
      :class="[
        'ui-segmented__btn',
        { 'ui-segmented__btn--active': modelValue === opt.value },
      ]"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped>
.ui-segmented {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
}

.ui-segmented__btn {
  border: 0;
  background: transparent;
  color: var(--color-text-2);
  padding: 8px 14px;
  border-radius: var(--radius-full);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  cursor: pointer;
  transition:
    background-color var(--transition-normal),
    color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.ui-segmented__btn--active {
  background: var(--color-bg-1);
  color: var(--color-text-1);
  box-shadow: var(--shadow-control);
}

.ui-segmented__btn:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: -2px;
}
</style>
