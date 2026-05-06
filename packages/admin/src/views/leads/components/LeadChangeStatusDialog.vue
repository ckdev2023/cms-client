<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import { getChangeStatusDialogOptions, type LeadStatus } from "../types";
import type { LeadStatusInput } from "../model/LeadAdapter";
import type { LeadMutationFailure } from "../model/useLeadDetailModel";

/**
 * 线索状态调整对话框。
 *
 * - 目标状态由当前状态 + `LEAD_STATUS_TRANSITIONS` 白名单派生，并过滤掉
 *   `lost` / `converted_case`（这两个由专用按钮承担）。
 * - 当当前状态没有可推进目标时，提示用户使用专用按钮，仍允许关闭弹窗。
 * - 失败时由父组件传入 `error` prop 来 inline 渲染错误条；弹窗保持打开。
 */
const props = defineProps<{
  currentStatus: LeadStatus;
  submitting?: boolean;
  error?: LeadMutationFailure | null;
}>();

const emit = defineEmits<{
  confirm: [input: LeadStatusInput];
  close: [];
}>();

const { t } = useI18n();

const options = computed(() =>
  getChangeStatusDialogOptions(props.currentStatus),
);

const selected = ref<LeadStatus | "">("");

watch(
  () => props.currentStatus,
  () => {
    selected.value = "";
  },
);

const canConfirm = computed(() => selected.value !== "" && !props.submitting);

const genericErrorMessage = computed(() => {
  if (!props.error) return null;
  return t(props.error.messageKey);
});

/** 提交目标状态；UI 已限制只可选合法白名单内的状态 */
function handleConfirm(): void {
  if (!canConfirm.value || selected.value === "") return;
  emit("confirm", { toStatus: selected.value });
}
</script>

<template>
  <Teleport to="body">
    <div class="lead-change-status-backdrop" @click.self="$emit('close')">
      <div
        class="lead-change-status-dialog"
        role="dialog"
        aria-modal="true"
        data-testid="lead-change-status-dialog"
      >
        <h3 class="lead-change-status-dialog__title">
          {{ t("leads.detail.changeStatusDialog.title") }}
        </h3>
        <p class="lead-change-status-dialog__desc">
          {{ t("leads.detail.changeStatusDialog.description") }}
        </p>

        <p
          v-if="genericErrorMessage"
          class="lead-change-status-dialog__error"
          role="alert"
          aria-live="assertive"
          data-testid="lead-change-status-dialog-error"
        >
          {{ genericErrorMessage }}
        </p>

        <p
          v-if="options.length === 0"
          class="lead-change-status-dialog__empty"
          data-testid="lead-change-status-dialog-empty"
        >
          {{ t("leads.detail.changeStatusDialog.noOptions") }}
        </p>

        <label v-else class="lead-change-status-dialog__label">
          <span>{{ t("leads.detail.changeStatusDialog.statusLabel") }}</span>
          <select
            v-model="selected"
            name="leadChangeStatus.toStatus"
            class="lead-change-status-dialog__select"
            data-testid="lead-change-status-dialog-select"
          >
            <option value="" disabled>
              {{ t("leads.detail.changeStatusDialog.statusPlaceholder") }}
            </option>
            <option v-for="status in options" :key="status" :value="status">
              {{ t(`leads.list.status.${status}`) }}
            </option>
          </select>
        </label>

        <div class="lead-change-status-dialog__actions">
          <Button size="sm" @click="$emit('close')">
            {{ t("leads.detail.convertDedup.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canConfirm"
            data-testid="lead-change-status-dialog-confirm"
            @click="handleConfirm"
          >
            {{ t("leads.detail.changeStatusDialog.confirmBtn") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.lead-change-status-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lead-change-status-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 420px;
  width: 100%;
}

.lead-change-status-dialog__title {
  margin: 0 0 8px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.lead-change-status-dialog__desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.lead-change-status-dialog__error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border: 1px solid var(--color-danger-border, #fbbcbc);
  background: var(--color-danger-bg, #fff5f5);
  color: var(--color-danger-text, #c53030);
  border-radius: var(--radius-md, 8px);
  font-size: var(--font-size-sm);
}

.lead-change-status-dialog__empty {
  margin: 0 0 16px;
  padding: 10px 12px;
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
}

.lead-change-status-dialog__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 20px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.lead-change-status-dialog__select {
  padding: 6px 10px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md, 6px);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
}

.lead-change-status-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
