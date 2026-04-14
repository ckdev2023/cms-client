<script lang="ts">
/**
 * 卡片内容区支持的内边距规格。
 */
export type CardPadding = "none" | "sm" | "md" | "lg";
</script>

<script setup lang="ts">
/**
 * 通用卡片容器，负责统一标题、边框、悬浮态和插槽结构。
 */
withDefaults(
  defineProps<{
    title?: string;
    padding?: CardPadding;
    bordered?: boolean;
    hoverable?: boolean;
  }>(),
  {
    padding: "md",
    bordered: true,
  },
);
</script>

<template>
  <div
    :class="[
      'ui-card',
      `ui-card--pad-${padding}`,
      {
        'ui-card--bordered': bordered,
        'ui-card--hoverable': hoverable,
      },
    ]"
  >
    <div v-if="$slots.header || title" class="ui-card__header">
      <slot name="header">
        <h3 class="ui-card__title">{{ title }}</h3>
      </slot>
      <div v-if="$slots.extra" class="ui-card__extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="ui-card__body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="ui-card__footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.ui-card {
  background-color: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}

.ui-card--bordered {
  border: 1px solid var(--color-border-1);
}

.ui-card--hoverable {
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

.ui-card--hoverable:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* --- Padding scale --- */

.ui-card--pad-none > .ui-card__header,
.ui-card--pad-none > .ui-card__body,
.ui-card--pad-none > .ui-card__footer {
  padding: 0;
}

.ui-card--pad-sm > .ui-card__header,
.ui-card--pad-sm > .ui-card__body,
.ui-card--pad-sm > .ui-card__footer {
  padding: 10px 12px;
}

.ui-card--pad-md > .ui-card__header,
.ui-card--pad-md > .ui-card__body,
.ui-card--pad-md > .ui-card__footer {
  padding: 16px 20px;
}

.ui-card--pad-lg > .ui-card__header,
.ui-card--pad-lg > .ui-card__body,
.ui-card--pad-lg > .ui-card__footer {
  padding: 24px 28px;
}

/* --- Header --- */

.ui-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid var(--color-border-1);
}

.ui-card__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  letter-spacing: var(--letter-spacing-tight);
}

.ui-card__extra {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* --- Footer --- */

.ui-card__footer {
  border-top: 1px solid var(--color-border-1);
}
</style>
