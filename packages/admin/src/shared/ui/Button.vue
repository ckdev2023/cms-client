<script lang="ts">
/**
 * 按钮支持的视觉样式。
 */
export type ButtonVariant = "filled" | "outlined" | "ghost";
/**
 * 按钮支持的语义色调。
 */
export type ButtonTone = "primary" | "neutral" | "danger";
/**
 * 按钮支持的尺寸规格。
 */
export type ButtonSize = "sm" | "md" | "lg";
</script>

<script setup lang="ts">
import { computed } from "vue";

/**
 * 通用按钮组件，统一处理尺寸、色调、加载态与禁用态。
 */
const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant;
    tone?: ButtonTone;
    size?: ButtonSize;
    pill?: boolean;
    square?: boolean;
    loading?: boolean;
    disabled?: boolean;
  }>(),
  {
    variant: "outlined",
    tone: "neutral",
    size: "md",
  },
);

const isDisabled = computed(() => props.disabled || props.loading);
</script>

<template>
  <button
    :class="[
      'ui-btn',
      `ui-btn--${variant}`,
      `ui-btn--tone-${tone}`,
      `ui-btn--${size}`,
      {
        'ui-btn--pill': pill,
        'ui-btn--square': square,
        'ui-btn--loading': loading,
      },
    ]"
    :disabled="isDisabled || undefined"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true" />
    <span
      class="ui-btn__content"
      :class="{ 'ui-btn__content--hidden': loading }"
    >
      <slot />
    </span>
  </button>
</template>

<style scoped>
.ui-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  font-family: inherit;
  font-weight: var(--font-weight-black);
  letter-spacing: var(--letter-spacing-normal);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition:
    background-color var(--transition-normal),
    border-color var(--transition-normal),
    color var(--transition-normal),
    box-shadow var(--transition-normal),
    transform var(--transition-fast);
}

.ui-btn:active:not(:disabled) {
  transform: translateY(1px);
}

.ui-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ui-btn:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 2px;
}

/* --- Size --- */

.ui-btn--sm {
  padding: 6px 10px;
  font-size: var(--font-size-sm);
  border-radius: var(--radius-md);
}

.ui-btn--md {
  padding: 10px 14px;
  font-size: var(--font-size-base);
  border-radius: var(--radius-default);
}

.ui-btn--lg {
  padding: 12px 18px;
  font-size: var(--font-size-lg);
  border-radius: var(--radius-lg);
}

/* --- Square (icon-only) --- */

.ui-btn--square.ui-btn--sm {
  width: 32px;
  height: 32px;
  padding: 0;
}

.ui-btn--square.ui-btn--md {
  width: 38px;
  height: 38px;
  padding: 0;
}

.ui-btn--square.ui-btn--lg {
  width: 44px;
  height: 44px;
  padding: 0;
}

/* --- Pill --- */

.ui-btn--pill {
  border-radius: var(--radius-full);
}

/* --- Tone (local custom properties) --- */

.ui-btn--tone-primary {
  --_accent: var(--color-primary-6);
  --_accent-hover: var(--color-primary-7);
}

.ui-btn--tone-neutral {
  --_accent: var(--color-text-1);
  --_accent-hover: var(--color-text-1);
}

.ui-btn--tone-danger {
  --_accent: var(--color-danger);
  --_accent-hover: #b91c1c;
}

/* --- Variant: filled --- */

.ui-btn--filled {
  background-color: var(--_accent);
  color: #fff;
}

.ui-btn--filled:hover:not(:disabled) {
  background-color: var(--_accent-hover);
}

.ui-btn--filled.ui-btn--tone-primary {
  box-shadow: var(--shadow-primary-btn);
}

.ui-btn--filled.ui-btn--tone-neutral {
  background-color: var(--color-bg-overlay);
  color: var(--color-text-1);
  border-color: var(--color-border-2);
}

.ui-btn--filled.ui-btn--tone-neutral:hover:not(:disabled) {
  background-color: var(--color-bg-overlay-hover);
}

/* --- Variant: outlined --- */

.ui-btn--outlined {
  background-color: var(--color-bg-overlay);
  border-color: var(--color-border-2);
  color: var(--_accent);
}

.ui-btn--outlined:hover:not(:disabled) {
  background-color: var(--color-bg-overlay-hover);
}

/* --- Variant: ghost --- */

.ui-btn--ghost {
  background-color: transparent;
  border-color: transparent;
  color: var(--_accent);
}

.ui-btn--ghost:hover:not(:disabled) {
  background-color: var(--color-bg-overlay);
}

/* --- Loading --- */

.ui-btn__spinner {
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: var(--radius-full);
  animation: ui-btn-spin 600ms linear infinite;
}

@keyframes ui-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

.ui-btn__content--hidden {
  visibility: hidden;
}
</style>
