<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * Toast 通知区，固定在右下角。
 *
 * 由父组件（或 useBillingToast composable）驱动显隐与内容。
 */
const { t } = useI18n();

withDefaults(
  defineProps<{
    visible?: boolean;
    title?: string;
    description?: string;
  }>(),
  {
    visible: false,
    title: "",
    description: "",
  },
);

defineEmits<{
  dismiss: [];
}>();
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="visible"
        class="billing-toast"
        role="status"
        aria-live="polite"
      >
        <div class="billing-toast__body">
          <div class="billing-toast__title">{{ title }}</div>
          <div v-if="description" class="billing-toast__desc">
            {{ description }}
          </div>
        </div>
        <button
          class="billing-toast__close"
          type="button"
          :aria-label="t('billing.paymentModal.closeAriaLabel')"
          @click="$emit('dismiss')"
        >
          <svg
            class="billing-toast__close-icon"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.billing-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 60;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 280px;
  max-width: 400px;
  padding: 14px 16px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.12),
    0 2px 6px rgba(0, 0, 0, 0.06);
}

.billing-toast__body {
  flex: 1;
}

.billing-toast__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.billing-toast__desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
}

.billing-toast__close {
  all: unset;
  flex-shrink: 0;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-default);
  transition: color var(--transition-fast);
}

.billing-toast__close:hover {
  color: var(--color-text-1);
}

.billing-toast__close-icon {
  width: 16px;
  height: 16px;
}

/* --- Transition --- */

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
