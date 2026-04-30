<script setup lang="ts">
import { useToast } from "../model/useToast";

/** 全局 Toast 通知容器，固定在右上角按队列展示消息并自动消失。 */
const { items, dismiss } = useToast();
</script>

<template>
  <Teleport to="body">
    <div v-if="items.length > 0" class="ui-toast-container" aria-live="polite">
      <TransitionGroup name="ui-toast">
        <div
          v-for="item in items"
          :key="item.id"
          :class="['ui-toast', `ui-toast--${item.tone}`]"
          role="alert"
        >
          <div class="ui-toast__body">
            <span class="ui-toast__title">{{ item.title }}</span>
            <span v-if="item.description" class="ui-toast__desc">{{
              item.description
            }}</span>
          </div>
          <button
            class="ui-toast__close"
            :aria-label="'close'"
            @click="dismiss(item.id)"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.ui-toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 400px;
  pointer-events: none;
}

.ui-toast {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-lg, 10px);
  border: 1px solid var(--color-border-1, #e5e7eb);
  background: var(--color-bg-1, #fff);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.08),
    0 1px 3px rgba(0, 0, 0, 0.04);
  pointer-events: auto;
  min-width: 280px;
}

.ui-toast--success {
  border-left: 3px solid var(--color-success, #16a34a);
}

.ui-toast--info {
  border-left: 3px solid var(--color-primary-6, #3b82f6);
}

.ui-toast--warning {
  border-left: 3px solid var(--color-warning-icon, #d97706);
}

.ui-toast--error {
  border-left: 3px solid var(--color-danger, #dc2626);
}

.ui-toast__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.ui-toast__title {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-1, #1f2937);
  line-height: 1.4;
}

.ui-toast__desc {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-3, #6b7280);
  line-height: 1.5;
}

.ui-toast__close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: -2px -4px -2px 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-3, #9ca3af);
  border-radius: var(--radius-sm, 4px);
  cursor: pointer;
  transition: color var(--transition-fast, 100ms);
}

.ui-toast__close:hover {
  color: var(--color-text-1, #1f2937);
}

.ui-toast-enter-active {
  transition: all 200ms ease-out;
}

.ui-toast-leave-active {
  transition: all 150ms ease-in;
}

.ui-toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.ui-toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
