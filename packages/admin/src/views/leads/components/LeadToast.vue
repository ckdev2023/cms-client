<script setup lang="ts">
/**
 * Toast 通知容器（底部居中，同 customers 样式）。
 */
defineProps<{
  title?: string;
  description?: string;
  visible?: boolean;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="lead-toast">
      <div v-if="visible" class="lead-toast">
        <div class="lead-toast__card">
          <div class="lead-toast__title">{{ title }}</div>
          <div v-if="description" class="lead-toast__desc">
            {{ description }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lead-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
}

.lead-toast__card {
  padding: 12px 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-1);
  box-shadow: var(--shadow-1);
}

.lead-toast__title {
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.lead-toast__desc {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.lead-toast-enter-active,
.lead-toast-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.lead-toast-enter-from,
.lead-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
