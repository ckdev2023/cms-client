<script lang="ts">
/**
 * 搜索输入框支持的视觉变体。
 */
export type SearchFieldVariant = "box" | "inline";
</script>

<script setup lang="ts">
/**
 * 通用搜索输入框，支持独立搜索框与行内筛选两种模式。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    variant?: SearchFieldVariant;
    label?: string;
  }>(),
  {
    modelValue: "",
    placeholder: "搜索…",
    variant: "box",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

/**
 * 同步输入框内容到 `v-model`。
 *
 * @param event 输入事件对象
 */
function onInput(event: Event) {
  emit("update:modelValue", (event.target as HTMLInputElement).value);
}
</script>

<template>
  <div :class="['ui-search', `ui-search--${props.variant}`]" role="search">
    <svg
      class="ui-search__icon"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
    <input
      type="search"
      class="ui-search__input"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :aria-label="props.label ?? props.placeholder"
      @input="onInput"
    />
    <slot name="trailing" />
  </div>
</template>

<style scoped>
.ui-search {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ui-search__icon {
  flex: 0 0 auto;
  color: var(--color-text-3);
}

.ui-search__input {
  width: 100%;
  border: none;
  outline: none;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  background: transparent;
  font-family: inherit;
}

.ui-search__input::placeholder {
  color: var(--color-text-placeholder);
  font-weight: var(--font-weight-semibold);
}

/* --- Variant: box (topbar / standalone search) --- */

.ui-search--box {
  flex: 1 1 auto;
  min-width: 180px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  background: var(--color-bg-1);
  box-shadow: var(--shadow-subtle);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.ui-search--box:focus-within {
  border-color: var(--color-primary-6);
  box-shadow: var(--shadow-focus-ring);
}

/* --- Variant: inline (table / list filter) --- */

.ui-search--inline {
  position: relative;
  padding: 0;
  border: none;
  background: transparent;
}

.ui-search--inline .ui-search__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  pointer-events: none;
}

.ui-search--inline .ui-search__input {
  background-color: var(--color-bg-control);
  border: none;
  border-radius: var(--radius-default);
  padding: 8px 12px 8px 36px;
  font-size: var(--font-size-base);
  width: min(360px, 100%);
  transition:
    background-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.ui-search--inline .ui-search__input:focus {
  background-color: var(--color-bg-1);
  box-shadow: 0 0 0 2px var(--color-primary-6);
}
</style>
