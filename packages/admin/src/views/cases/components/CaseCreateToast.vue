<script setup lang="ts">
/** 案件新建流程中的底部 toast 通知。 */
defineProps<{
  title?: string;
  description?: string;
  visible?: boolean;
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="case-create-toast">
      <div v-if="visible" class="case-create-toast">
        <div class="case-create-toast__card">
          <div class="case-create-toast__title">{{ title }}</div>
          <div v-if="description" class="case-create-toast__desc">
            {{ description }}
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.case-create-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999;
}

.case-create-toast__card {
  padding: 12px 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-1);
  box-shadow: var(--shadow-1);
}

.case-create-toast__title {
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.case-create-toast__desc {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.case-create-toast-enter-active,
.case-create-toast-leave-active {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-normal);
}

.case-create-toast-enter-from,
.case-create-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px);
}
</style>
