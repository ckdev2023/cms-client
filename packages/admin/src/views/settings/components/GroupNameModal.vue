<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { GroupNameModalMode } from "../model/settingsControllers";

/** Group 名称弹窗，新建与重命名共用。 */
const props = defineProps<{
  open: boolean;
  mode: GroupNameModalMode;
  inputValue: string;
  canSubmit: boolean;
}>();

defineEmits<{
  "update:inputValue": [value: string];
  close: [];
  confirm: [];
}>();

const { t } = useI18n();

/**
 * 根据模式返回弹窗标题的 i18n 键。
 *
 * @returns i18n 键
 */
function titleKey(): string {
  return props.mode === "create"
    ? "settings.group.modal.createTitle"
    : "settings.group.modal.renameTitle";
}

/**
 * 根据模式返回确认按钮的 i18n 键。
 *
 * @returns i18n 键
 */
function confirmLabelKey(): string {
  return props.mode === "create"
    ? "settings.group.modal.create"
    : "settings.group.modal.rename";
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="gnm-overlay" @click.self="$emit('close')">
      <div
        class="gnm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t(titleKey())"
        @keydown.escape="$emit('close')"
      >
        <div class="gnm-header">
          <h3 class="gnm-header__title">{{ t(titleKey()) }}</h3>
          <button
            type="button"
            class="gnm-header__close"
            :aria-label="t('settings.group.modal.cancel')"
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

        <div class="gnm-body">
          <label class="gnm-label" for="groupNameInput">
            {{ t("settings.group.modal.nameLabel") }}
          </label>
          <input
            id="groupNameInput"
            type="text"
            class="gnm-input"
            :value="inputValue"
            :placeholder="t('settings.group.modal.namePlaceholder')"
            @input="
              $emit(
                'update:inputValue',
                ($event.target as HTMLInputElement).value,
              )
            "
            @keydown.enter="canSubmit && $emit('confirm')"
          />
        </div>

        <div class="gnm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.group.modal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmit"
            @click="$emit('confirm')"
          >
            {{ t(confirmLabelKey()) }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.gnm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.gnm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.gnm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.gnm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.gnm-header__close {
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

.gnm-header__close:hover {
  background: var(--color-fill-2);
}

.gnm-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 20px 24px;
}

.gnm-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.gnm-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-input, var(--color-border-2));
  border-radius: var(--radius-default);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.gnm-input:focus {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-outline, rgba(3, 105, 161, 0.15));
}

.gnm-input::placeholder {
  color: var(--color-text-4, var(--color-text-3));
}

.gnm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
