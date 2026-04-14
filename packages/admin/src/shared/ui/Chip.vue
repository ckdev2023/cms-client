<script lang="ts">
/**
 * 标签支持的语义色调。
 */
export type ChipTone = "neutral" | "primary" | "success" | "warning" | "danger";
/**
 * 标签支持的尺寸规格。
 */
export type ChipSize = "sm" | "md";
</script>

<script setup lang="ts">
/**
 * 通用标签组件，支持色调、尺寸与圆点提示态。
 */
withDefaults(
  defineProps<{
    tone?: ChipTone;
    size?: ChipSize;
    dot?: boolean;
  }>(),
  {
    tone: "neutral",
    size: "md",
  },
);
</script>

<template>
  <span
    :class="[
      'ui-chip',
      `ui-chip--${tone}`,
      `ui-chip--${size}`,
      { 'ui-chip--dot': dot },
    ]"
  >
    <span v-if="dot" class="ui-chip__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style scoped>
.ui-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: var(--radius-full);
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
  line-height: 1.1;
  border: 1px solid transparent;
}

/* --- Size --- */

.ui-chip--md {
  padding: 4px 10px;
  font-size: var(--font-size-sm);
}

.ui-chip--sm {
  padding: 2px 8px;
  font-size: var(--font-size-xs);
}

/* --- Dot indicator --- */

.ui-chip__dot {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background-color: currentColor;
  flex-shrink: 0;
}

/* --- Tone: neutral --- */

.ui-chip--neutral {
  background-color: var(--color-bg-3);
  border-color: var(--color-border-2);
  color: var(--color-text-2);
}

/* --- Tone: primary --- */

.ui-chip--primary {
  background-color: rgba(3, 105, 161, 0.08);
  border-color: rgba(3, 105, 161, 0.18);
  color: var(--color-primary-6);
}

/* --- Tone: success --- */

.ui-chip--success {
  background-color: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.18);
  color: var(--color-success);
}

/* --- Tone: warning --- */

.ui-chip--warning {
  background-color: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.18);
  color: #b45309;
}

/* --- Tone: danger --- */

.ui-chip--danger {
  background-color: rgba(220, 38, 38, 0.07);
  border-color: rgba(220, 38, 38, 0.18);
  color: var(--color-danger);
}
</style>
