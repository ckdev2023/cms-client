<script setup lang="ts">
/**
 * 移动端卡片行壳：提供 header / default(body) / actions 三段式布局，
 * 供各表格在 ResponsiveTable 的 #mobile-card slot 内复用。
 */
defineProps<{
  highlighted?: boolean;
}>();
</script>

<template>
  <div :class="['rt-row', { 'rt-row--highlighted': highlighted }]">
    <div v-if="$slots.header" class="rt-row__header">
      <slot name="header" />
    </div>
    <div v-if="$slots.default" class="rt-row__body">
      <slot />
    </div>
    <div v-if="$slots.actions" class="rt-row__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.rt-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rt-row--highlighted {
  background: rgba(37, 99, 235, 0.06);
  border-radius: var(--radius-lg, 12px);
  margin: -4px;
  padding: 4px;
}

.rt-row__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.rt-row__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-2, #4e5969);
}

.rt-row__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding-top: 4px;
  border-top: 1px solid var(--color-border-1, #e5e6eb);
}
</style>
