<script lang="ts">
/**
 * 搜索输入框支持的视觉变体。
 */
export type SearchFieldVariant = "box" | "inline";
</script>

<script setup lang="ts">
import { onBeforeUnmount, watch } from "vue";

/**
 * 通用搜索输入框，支持独立搜索框与行内筛选两种模式。
 *
 * 通过 `debounceMs` 可延迟 `update:modelValue` 的触发，
 * 用于服务端搜索场景，避免逐字键入触发请求风暴。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    variant?: SearchFieldVariant;
    label?: string;
    id?: string;
    name?: string;
    debounceMs?: number;
  }>(),
  {
    modelValue: "",
    placeholder: "搜索…",
    variant: "box",
    debounceMs: 0,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingValue: string | null = null;

/** 取消尚未触发的延迟定时器。 */
function clearTimer() {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/** 立即提交 `pendingValue`，无挂起值时为空操作。 */
function flushPending() {
  if (pendingValue === null) return;
  const value = pendingValue;
  pendingValue = null;
  clearTimer();
  emit("update:modelValue", value);
}

watch(
  () => props.modelValue,
  () => {
    pendingValue = null;
    clearTimer();
  },
);

onBeforeUnmount(() => {
  flushPending();
});

/**
 * 同步输入框内容到 `v-model`，按 `debounceMs` 延迟。
 *
 * @param event 输入事件对象
 */
function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  if (props.debounceMs <= 0) {
    pendingValue = null;
    clearTimer();
    emit("update:modelValue", value);
    return;
  }
  pendingValue = value;
  clearTimer();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    flushPending();
  }, props.debounceMs);
}

/**
 * 处理 `change` 事件（Enter 或失焦时触发），立即结清待发送值。
 *
 * @param event 输入事件对象
 */
function onChange(event: Event) {
  if (props.debounceMs <= 0) return;
  const value = (event.target as HTMLInputElement).value;
  pendingValue = value;
  flushPending();
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
      :id="props.id"
      :name="props.name"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :aria-label="props.label ?? props.placeholder"
      @input="onInput"
      @change="onChange"
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
  border-radius: var(--radius-md);
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
