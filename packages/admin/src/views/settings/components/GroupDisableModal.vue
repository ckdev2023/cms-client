<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** Group 停用确认弹窗，区分有引用与无引用两种文案。 */
defineProps<{
  open: boolean;
  groupName: string;
  customerCount: number;
  caseCount: number;
  hasReferences: boolean;
}>();

defineEmits<{
  close: [];
  confirm: [];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="gdm-overlay" @click.self="$emit('close')">
      <div
        class="gdm-dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-label="t('settings.group.disableModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="gdm-header">
          <h3 class="gdm-header__title">
            {{ t("settings.group.disableModal.title") }}
          </h3>
          <button
            type="button"
            class="gdm-header__close"
            :aria-label="t('settings.group.disableModal.cancel')"
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

        <div class="gdm-body">
          <p v-if="hasReferences" class="gdm-message gdm-message--warning">
            {{
              t("settings.group.disableModal.confirmReferenced", {
                name: groupName,
                customerCount,
                caseCount,
              })
            }}
          </p>
          <p v-else class="gdm-message">
            {{
              t("settings.group.disableModal.confirmSimple", {
                name: groupName,
              })
            }}
          </p>
        </div>

        <div class="gdm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.group.disableModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="danger"
            size="sm"
            @click="$emit('confirm')"
          >
            {{ t("settings.group.disableModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gdm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.gdm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.gdm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.gdm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.gdm-header__close {
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

.gdm-header__close:hover {
  background: var(--color-fill-2);
}

.gdm-body {
  padding: 16px 24px;
}

.gdm-message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.6;
}

.gdm-message--warning {
  padding: 12px 16px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: var(--radius-default);
  color: var(--color-text-1);
}

.gdm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
