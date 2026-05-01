<script lang="ts">
/**
 * 标签支持的语义色调。
 */
export type ChipTone = "neutral" | "primary" | "success" | "warning" | "danger";
/**
 * 标签支持的尺寸规格。
 */
export type ChipSize = "micro" | "md";
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
  line-height: var(--leading-3xl);
  letter-spacing: var(--letter-spacing-normal);
  border: 1px solid transparent;
}

/* --- Size --- */

.ui-chip--md {
  padding: 4px 10px;
  font-size: var(--font-size-sm);
}

.ui-chip--micro {
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
  color: var(--color-primary-7);
}

.ui-chip--primary[aria-selected="true"],
.ui-chip--primary.is-active,
.ui-chip--success[aria-selected="true"],
.ui-chip--success.is-active,
.ui-chip--warning[aria-selected="true"],
.ui-chip--warning.is-active,
.ui-chip--danger[aria-selected="true"],
.ui-chip--danger.is-active {
  color: #fff;
  background-color: transparent;
  border-color: rgba(255, 255, 255, 0.6);
}

/* --- Tone: success --- */

.ui-chip--success {
  background-color: rgba(22, 163, 74, 0.08);
  border-color: rgba(22, 163, 74, 0.18);
  color: #166534;
}

/* --- Tone: warning --- */

.ui-chip--warning {
  background-color: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.18);
  color: #92400e;
}

/* --- Tone: danger --- */

.ui-chip--danger {
  background-color: rgba(220, 38, 38, 0.07);
  border-color: rgba(220, 38, 38, 0.18);
  color: #991b1b;
}
</style>
