<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 密码重置结果弹窗，一次性展示临时密码并提供复制功能。 */
defineProps<{
  open: boolean;
  temporaryPassword: string;
}>();

defineEmits<{
  close: [];
}>();

const { t } = useI18n();
const copied = ref(false);

async function copyPassword(password: string) {
  try {
    await navigator.clipboard.writeText(password);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    /* clipboard API not available */
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="prm-overlay" @click.self="$emit('close')">
      <div
        class="prm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.members.passwordModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="prm-header">
          <h3 class="prm-header__title">
            {{ t("settings.members.passwordModal.title") }}
          </h3>
          <button
            type="button"
            class="prm-header__close"
            :aria-label="t('settings.members.passwordModal.close')"
            @click="$emit('close')"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="prm-body">
          <p class="prm-notice">
            {{ t("settings.members.passwordModal.notice") }}
          </p>

          <div class="prm-password-box">
            <code class="prm-password-value">{{ temporaryPassword }}</code>
            <button
              type="button"
              class="prm-copy-btn"
              :aria-label="t('settings.members.passwordModal.copy')"
              @click="copyPassword(temporaryPassword)"
            >
              {{
                copied
                  ? t("settings.members.passwordModal.copied")
                  : t("settings.members.passwordModal.copy")
              }}
            </button>
          </div>
        </div>

        <div class="prm-footer">
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.members.passwordModal.close") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.prm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.prm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.prm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.prm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.prm-header__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: background 0.15s;
}

.prm-header__close:hover {
  background: var(--color-fill-2);
}

.prm-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.prm-notice {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.6;
}

.prm-password-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
}

.prm-password-value {
  flex: 1;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  word-break: break-all;
  font-family: var(--font-mono, monospace);
}

.prm-copy-btn {
  flex-shrink: 0;
  padding: 6px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.prm-copy-btn:hover {
  background: var(--color-primary-1);
  border-color: var(--color-primary-6);
}

.prm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
