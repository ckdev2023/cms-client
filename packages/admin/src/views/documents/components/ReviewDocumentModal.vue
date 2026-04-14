<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/**
 * 审核/退回弹窗（P0-CONTRACT §8.2）。
 *
 * - approve 模式：仅确认，无需填写原因
 * - reject 模式：退回原因 textarea 必填
 */
const { t } = useI18n();

defineProps<{
  open: boolean;
  mode: "approve" | "reject";
  docName: string;
  rejectReason?: string;
  canConfirm?: boolean;
}>();

defineEmits<{
  close: [];
  "update:rejectReason": [value: string];
  confirm: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="review-backdrop" @click.self="$emit('close')">
      <div
        class="review-modal"
        role="dialog"
        :aria-label="
          mode === 'approve'
            ? t('documents.review.approveTitle')
            : t('documents.review.rejectTitle')
        "
      >
        <div class="review-modal__header">
          <h3 class="review-modal__title">
            {{
              mode === "approve"
                ? t("documents.review.approveTitle")
                : t("documents.review.rejectTitle")
            }}
          </h3>
          <button
            class="review-modal__close"
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

        <div class="review-modal__body">
          <div class="review-modal__field">
            <label class="review-modal__label">
              {{ t("documents.review.docName") }}
            </label>
            <p class="review-modal__text">{{ docName }}</p>
          </div>

          <div class="review-modal__field">
            <label class="review-modal__label">
              {{ t("documents.review.conclusion") }}
            </label>
            <p
              :class="[
                'review-modal__text',
                'review-modal__text--conclusion',
                mode === 'approve'
                  ? 'review-modal__text--approve'
                  : 'review-modal__text--reject',
              ]"
            >
              {{
                mode === "approve"
                  ? t("documents.review.conclusionApprove")
                  : t("documents.review.conclusionReject")
              }}
            </p>
          </div>

          <div v-if="mode === 'reject'" class="review-modal__field">
            <label class="review-modal__label">
              {{ t("documents.review.rejectReasonLabel") }}
              <span class="review-modal__required">*</span>
            </label>
            <textarea
              class="review-modal__textarea"
              :value="rejectReason"
              :placeholder="t('documents.review.rejectReasonPlaceholder')"
              rows="3"
              @input="
                $emit(
                  'update:rejectReason',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
          </div>
        </div>

        <div class="review-modal__footer">
          <Button variant="outlined" @click="$emit('close')">
            {{ t("documents.review.cancel") }}
          </Button>
          <Button
            variant="filled"
            :tone="mode === 'approve' ? 'primary' : 'danger'"
            :disabled="mode === 'reject' && !canConfirm"
            @click="$emit('confirm')"
          >
            {{
              mode === "approve"
                ? t("documents.review.confirmApprove")
                : t("documents.review.confirmReject")
            }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.review-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.review-modal {
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

.review-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.review-modal__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.review-modal__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.review-modal__close:hover {
  color: var(--color-text-1);
}

.review-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.review-modal__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.review-modal__required {
  color: #dc2626;
}

.review-modal__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  font-weight: var(--font-weight-semibold);
}

.review-modal__text--approve {
  color: var(--color-success, #16a34a);
}

.review-modal__text--reject {
  color: var(--color-danger, #dc2626);
}

.review-modal__textarea {
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

.review-modal__textarea:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.review-modal__textarea::placeholder {
  color: var(--color-text-placeholder);
}

.review-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
