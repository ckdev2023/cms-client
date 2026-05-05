<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { RiskAckReasonCode } from "../types";
import type { BillingRiskAckInput } from "../model/BillingAdapterUrls";
import Button from "../../../shared/ui/Button.vue";

/** 收费风险确认弹窗，用于提交风险确认原因和证据。 */

const REASON_CODES: RiskAckReasonCode[] = [
  "customer_promise",
  "internal_review",
  "partial_settled",
  "other",
];

const props = defineProps<{
  open: boolean;
  caseId: string;
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [input: BillingRiskAckInput];
}>();

const { t } = useI18n();

const reasonCode = ref<RiskAckReasonCode | "">("");
const reasonNote = ref("");
const evidenceUrl = ref("");

const canSubmit = computed(() => {
  if (!reasonCode.value) return false;
  if (reasonCode.value === "other" && !reasonNote.value.trim()) return false;
  return true;
});

watch(
  () => props.open,
  (val) => {
    if (!val) {
      reasonCode.value = "";
      reasonNote.value = "";
      evidenceUrl.value = "";
    }
  },
);

/** 提交风险确认。 */
function handleSubmit() {
  if (!canSubmit.value || props.submitting) return;
  const input: BillingRiskAckInput = {
    reasonCode: reasonCode.value,
  };
  if (reasonNote.value.trim()) input.reasonNote = reasonNote.value.trim();
  if (evidenceUrl.value.trim()) input.evidenceUrl = evidenceUrl.value.trim();
  emit("submit", input);
}

/** 关闭弹窗。 */
function handleClose() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ra-overlay" @click.self="handleClose">
      <div
        class="ra-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('billing.riskAck.modal.title')"
      >
        <div class="ra-header">
          <h3 class="ra-header__title">
            {{ t("billing.riskAck.modal.title") }}
          </h3>
          <button
            class="ra-header__close"
            type="button"
            aria-label="Close"
            @click="handleClose"
          >
            <svg
              class="ra-header__close-icon"
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

        <div class="ra-body">
          <div v-if="error" class="ra-body__error">{{ error }}</div>

          <div class="ra-fields">
            <div class="ra-field">
              <label class="ra-label" for="risk-ack-reasonCode">
                {{ t("billing.riskAck.modal.title") }}
                <span class="ra-label__required">*</span>
              </label>
              <select
                id="risk-ack-reasonCode"
                name="reasonCode"
                v-model="reasonCode"
                class="ra-input ra-input--select"
                data-testid="risk-ack-reason-code"
              >
                <option value="" disabled>—</option>
                <option v-for="code in REASON_CODES" :key="code" :value="code">
                  {{ t(`billing.riskAck.reasonCode.${code}`) }}
                </option>
              </select>
            </div>

            <div class="ra-field">
              <label class="ra-label" for="risk-ack-reasonNote">
                {{ t("billing.riskAck.reasonNote.placeholder") }}
                <span v-if="reasonCode === 'other'" class="ra-label__required"
                  >*</span
                >
              </label>
              <textarea
                id="risk-ack-reasonNote"
                name="reasonNote"
                v-model="reasonNote"
                class="ra-input ra-input--textarea"
                rows="3"
                :placeholder="t('billing.riskAck.reasonNote.placeholder')"
              />
            </div>

            <div class="ra-field">
              <label class="ra-label" for="risk-ack-evidenceUrl">{{
                t("billing.riskAck.evidenceUrl.placeholder")
              }}</label>
              <input
                id="risk-ack-evidenceUrl"
                name="evidenceUrl"
                v-model="evidenceUrl"
                type="url"
                class="ra-input"
                :placeholder="t('billing.riskAck.evidenceUrl.placeholder')"
              />
            </div>
          </div>
        </div>

        <div class="ra-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="md"
            @click="handleClose"
          >
            {{ t("billing.riskAck.modal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="md"
            :disabled="!canSubmit || submitting"
            @click="handleSubmit"
          >
            {{ t("billing.riskAck.modal.submit") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ra-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.ra-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.ra-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-1);
}

.ra-header__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.ra-header__close {
  all: unset;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-md);
  transition: color var(--transition-fast);
}

.ra-header__close:hover {
  color: var(--color-text-1);
}

.ra-header__close-icon {
  width: 20px;
  height: 20px;
}

.ra-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.ra-body__error {
  padding: 12px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
  background: rgba(220, 38, 38, 0.06);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
  margin-bottom: 16px;
}

.ra-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ra-field {
  display: flex;
  flex-direction: column;
}

.ra-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  margin-bottom: 6px;
}

.ra-label__required {
  color: var(--color-danger);
}

.ra-input {
  appearance: none;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.ra-input:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.ra-input--select {
  cursor: pointer;
}

.ra-input--textarea {
  resize: vertical;
  min-height: 72px;
}

.ra-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}
</style>
