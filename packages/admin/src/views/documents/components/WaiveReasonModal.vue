<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { WaivedReasonCode } from "../types";
import { WAIVED_REASONS, WAIVED_REASON_CODES } from "../constants";

/**
 * 标记无需提供弹窗（P0-CONTRACT §8.3）。
 *
 * - 原因码 select 必选
 * - 原因码为「其他」时备注 textarea 必填
 */
const { t } = useI18n();

defineProps<{
  open: boolean;
  targetLabel?: string;
  reasonCode: WaivedReasonCode | "";
  reasonNote: string;
  noteRequired: boolean;
  canConfirm: boolean;
}>();

defineEmits<{
  close: [];
  "update:reasonCode": [value: WaivedReasonCode | ""];
  "update:reasonNote": [value: string];
  confirm: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="waive-backdrop" @click.self="$emit('close')">
      <div
        class="waive-modal"
        role="dialog"
        :aria-label="t('documents.waive.title')"
      >
        <div class="waive-modal__header">
          <h3 class="waive-modal__title">
            {{ t("documents.waive.title") }}
          </h3>
          <button
            class="waive-modal__close"
            type="button"
            @click="$emit('close')"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="waive-modal__body">
          <div v-if="targetLabel" class="waive-modal__field">
            <label class="waive-modal__label">
              {{ t("documents.waive.targetLabel") }}
            </label>
            <p class="waive-modal__text">{{ targetLabel }}</p>
          </div>

          <div class="waive-modal__field">
            <label class="waive-modal__label">
              {{ t("documents.waive.reasonCodeLabel") }}
              <span class="waive-modal__required">*</span>
            </label>
            <select
              class="waive-modal__select"
              :value="reasonCode"
              @change="
                $emit(
                  'update:reasonCode',
                  ($event.target as HTMLSelectElement)
                    .value as WaivedReasonCode,
                )
              "
            >
              <option value="" disabled>
                {{ t("documents.waive.reasonCodePlaceholder") }}
              </option>
              <option
                v-for="code in WAIVED_REASON_CODES"
                :key="code"
                :value="code"
              >
                {{ WAIVED_REASONS[code].label }}
              </option>
            </select>
          </div>

          <div class="waive-modal__field">
            <label class="waive-modal__label">
              {{ t("documents.waive.reasonNoteLabel") }}
              <span v-if="noteRequired" class="waive-modal__required">*</span>
            </label>
            <textarea
              class="waive-modal__textarea"
              :value="reasonNote"
              :placeholder="t('documents.waive.reasonNotePlaceholder')"
              rows="3"
              @input="
                $emit(
                  'update:reasonNote',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
            <p v-if="noteRequired" class="waive-modal__hint">
              {{ t("documents.waive.reasonNoteRequired") }}
            </p>
          </div>
        </div>

        <div class="waive-modal__footer">
          <Button variant="outlined" @click="$emit('close')">
            {{ t("documents.waive.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canConfirm"
            @click="$emit('confirm')"
          >
            {{ t("documents.waive.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.waive-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.waive-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.waive-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.waive-modal__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.waive-modal__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.waive-modal__close:hover {
  color: var(--color-text-1);
}

.waive-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.waive-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.waive-modal__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.waive-modal__required {
  color: #dc2626;
}

.waive-modal__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  font-weight: var(--font-weight-semibold);
}

.waive-modal__select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  appearance: none;
  cursor: pointer;
  transition: border-color var(--transition-normal);
}

.waive-modal__select:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.waive-modal__textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  resize: vertical;
  transition: border-color var(--transition-normal);
}

.waive-modal__textarea:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.waive-modal__textarea::placeholder {
  color: var(--color-text-placeholder);
}

.waive-modal__hint {
  margin: 0;
  font-size: 11px;
  color: #dc2626;
  font-weight: var(--font-weight-semibold);
}

.waive-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
