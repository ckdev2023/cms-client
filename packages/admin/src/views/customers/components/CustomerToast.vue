<script setup lang="ts">
/**
 * Toast 通知容器静态骨架。
 * T07 负责接入 toast 状态管理与 5 种场景触发。
 */
defineProps<{
  title?: string;
  description?: string;
  visible?: boolean;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="customer-toast">
      <div v-if="visible" class="customer-toast">
        <div class="customer-toast__card">
          <div class="customer-toast__title">{{ title }}</div>
          <div v-if="description" class="customer-toast__desc">
            {{ description }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.customer-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
}

.customer-toast__card {
  padding: 12px 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-1);
  box-shadow: var(--shadow-1);
}

.customer-toast__title {
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.customer-toast__desc {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.customer-toast-enter-active,
.customer-toast-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.customer-toast-enter-from,
.customer-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
