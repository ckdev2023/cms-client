<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { LeadMutationFailure } from "../model/useLeadDetailModel";

/**
 * 线索「标记流失」对话框。
 *
 * - lostReason 必填（与 server `lost_reason is required` 校验一致）。
 * - 失败时由父组件传入 `error` prop 来 inline 渲染错误条；弹窗保持打开。
 */
const props = defineProps<{
  submitting?: boolean;
  error?: LeadMutationFailure | null;
}>();

const emit = defineEmits<{
  confirm: [reason: string];
  close: [];
}>();

const { t } = useI18n();

const reason = ref("");

const canConfirm = computed(
  () => reason.value.trim() !== "" && !props.submitting,
);

const genericErrorMessage = computed(() => {
  if (!props.error) return null;
  return t(props.error.messageKey);
});

/** 提交流失原因 */
function handleConfirm(): void {
  const trimmed = reason.value.trim();
  if (!trimmed || props.submitting) return;
  emit("confirm", trimmed);
}
</script>

<template>
  <Teleport to="body">
    <div class="lead-mark-lost-backdrop" @click.self="$emit('close')">
      <div
        class="lead-mark-lost-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="lead-mark-lost-dialog"
      >
        <h3 class="lead-mark-lost-dialog__title">
          {{ t("leads.detail.markLostDialog.title") }}
        </h3>
        <p class="lead-mark-lost-dialog__desc">
          {{ t("leads.detail.markLostDialog.description") }}
        </p>

        <p
          v-if="genericErrorMessage"
          class="lead-mark-lost-dialog__error"
          role="alert"
          aria-live="assertive"
          data-testid="lead-mark-lost-dialog-error"
        >
          {{ genericErrorMessage }}
        </p>

        <label class="lead-mark-lost-dialog__label">
          <span>
            {{ t("leads.detail.markLostDialog.reasonLabel") }}
            <span class="lead-mark-lost-dialog__required">*</span>
          </span>
          <textarea
            v-model="reason"
            class="lead-mark-lost-dialog__textarea"
            rows="3"
            :placeholder="t('leads.detail.markLostDialog.reasonPlaceholder')"
            autocomplete="off"
            data-testid="lead-mark-lost-dialog-reason"
          ></textarea>
        </label>

        <div class="lead-mark-lost-dialog__actions">
          <Button size="sm" @click="$emit('close')">
            {{ t("leads.detail.convertDedup.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canConfirm"
            data-testid="lead-mark-lost-dialog-confirm"
            @click="handleConfirm"
          >
            {{ t("leads.detail.markLostDialog.confirmBtn") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lead-mark-lost-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lead-mark-lost-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 420px;
  width: 100%;
}

.lead-mark-lost-dialog__title {
  margin: 0 0 8px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.lead-mark-lost-dialog__desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.lead-mark-lost-dialog__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger-border, #fbbcbc);
  background: var(--color-danger-bg, #fff5f5);
  color: var(--color-danger-text, #c53030);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-sm);
}

.lead-mark-lost-dialog__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.lead-mark-lost-dialog__required {
  color: #dc2626;
}

.lead-mark-lost-dialog__textarea {
  padding: 8px 10px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md, 6px);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  resize: vertical;
}

.lead-mark-lost-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
