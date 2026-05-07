<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 成员停用二次确认弹窗。 */
defineProps<{
  open: boolean;
  memberName: string;
}>();

defineEmits<{
  close: [];
  confirm: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mdcm-overlay" @click.self="$emit('close')">
      <div
        class="mdcm-dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-label="t('settings.members.disableModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="mdcm-header">
          <h3 class="mdcm-header__title">
            {{ t("settings.members.disableModal.title") }}
          </h3>
          <button
            type="button"
            class="mdcm-header__close"
            :aria-label="t('settings.members.disableModal.cancel')"
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

        <div class="mdcm-body">
          <p class="mdcm-message">
            {{
              t("settings.members.disableModal.confirm", {
                name: memberName,
              })
            }}
          </p>
        </div>

        <div class="mdcm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.members.disableModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="danger"
            size="sm"
            @click="$emit('confirm')"
          >
            {{ t("settings.members.disableModal.confirmButton") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mdcm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.mdcm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.mdcm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.mdcm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.mdcm-header__close {
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

.mdcm-header__close:hover {
  background: var(--color-fill-2);
}

.mdcm-body {
  padding: 16px 24px;
}

.mdcm-message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: var(--leading-relaxed);
}

.mdcm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
