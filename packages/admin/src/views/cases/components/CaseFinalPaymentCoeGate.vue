<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { FinalPaymentGateInfo } from "../types-detail";
import type { WriteActionFeedback } from "../model/useCaseDetailWriteActions";

/** 最终付款与 COE 发送门禁：承载确认弹层与推进动作。 */
const { t } = useI18n();
const props = withDefaults(
  defineProps<{
    gate: FinalPaymentGateInfo;
    writeFeedback?: WriteActionFeedback;
    readonly?: boolean;
  }>(),
  {
    writeFeedback: () => ({
      submitting: false,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    }),
    readonly: false,
  },
);
const emit = defineEmits<{
  (e: "advance-to-coe"): void;
  (e: "switch-tab", tab: string): void;
}>();
const showConfirm = ref(false);
const isSubmitting = computed(() => props.writeFeedback.submitting);
const hasGateError = computed(
  () => props.writeFeedback.isGateBlock && props.writeFeedback.errorI18nKey,
);
/**
 * 打开发送 COE 的二次确认态。
 * @returns 无。
 */
function handleSendCoe(): void {
  if (!props.gate.canAdvanceToCoe || props.readonly) return;
  showConfirm.value = true;
}
/**
 * 确认发送 COE，并向上抛出推进事件。
 * @returns 无。
 */
function confirmSendCoe(): void {
  showConfirm.value = false;
  emit("advance-to-coe");
}
/**
 * 取消发送 COE 的确认态。
 * @returns 无。
 */
function cancelConfirm(): void {
  showConfirm.value = false;
}
</script>

<template>
  <Card padding="md" data-testid="final-payment-coe-gate">
    <div class="fpg__header">
      <div class="fpg__header-left">
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
          <path
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span class="fpg__title">
          {{ t("cases.detail.overview.finalPaymentGate.title") }}
        </span>
      </div>
      <span
        class="fpg__gate-badge"
        :class="{
          'fpg__gate-badge--success': gate.canAdvanceToCoe,
          'fpg__gate-badge--blocked': !gate.canAdvanceToCoe,
        }"
        data-testid="coe-gate-badge"
      >
        {{
          gate.canAdvanceToCoe
            ? t("cases.detail.overview.finalPaymentGate.coeReady")
            : t("cases.detail.overview.finalPaymentGate.coeBlocked")
        }}
      </span>
    </div>

    <!-- Payment status row -->
    <div class="fpg__status-row">
      <span class="fpg__status-label">
        {{ t("cases.detail.overview.finalPaymentGate.paymentStatus") }}
      </span>
      <div class="fpg__status-value">
        <span
          class="fpg__status-dot"
          :class="{
            'fpg__status-dot--success': gate.paymentCleared,
            'fpg__status-dot--warning': !gate.paymentCleared,
          }"
        />
        <span
          :class="{
            'fpg__status-text--success': gate.paymentCleared,
            'fpg__status-text--warning': !gate.paymentCleared,
          }"
          data-testid="payment-status-text"
        >
          {{
            gate.paymentCleared
              ? t("cases.detail.overview.finalPaymentGate.paymentCleared")
              : t("cases.detail.overview.finalPaymentGate.paymentOutstanding")
          }}
        </span>
        <span v-if="gate.outstandingLabel" class="fpg__outstanding-amount">
          {{
            t("cases.detail.overview.finalPaymentGate.outstandingAmount", {
              amount: gate.outstandingLabel,
            })
          }}
        </span>
      </div>
    </div>

    <!-- COE gate status row -->
    <div class="fpg__status-row">
      <span class="fpg__status-label">
        {{ t("cases.detail.overview.finalPaymentGate.coeGateStatus") }}
      </span>
      <div class="fpg__status-value">
        <span
          class="fpg__status-dot"
          :class="{
            'fpg__status-dot--success': gate.canAdvanceToCoe,
            'fpg__status-dot--danger': !gate.canAdvanceToCoe,
          }"
        />
        <span
          :class="{
            'fpg__status-text--success': gate.canAdvanceToCoe,
            'fpg__status-text--danger': !gate.canAdvanceToCoe,
          }"
        >
          {{
            gate.canAdvanceToCoe
              ? t("cases.detail.overview.finalPaymentGate.coeReady")
              : t("cases.detail.overview.finalPaymentGate.coeBlocked")
          }}
        </span>
      </div>
    </div>

    <!-- Blockers list -->
    <div
      v-if="gate.blockers.length > 0"
      class="fpg__blockers"
      data-testid="coe-gate-blockers"
    >
      <div
        v-for="blocker in gate.blockers"
        :key="blocker.code"
        class="fpg__blocker-item"
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
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <span>
          {{
            blocker.code === "final_payment_outstanding"
              ? t("cases.detail.overview.finalPaymentGate.blockerPayment")
              : t("cases.detail.overview.finalPaymentGate.blockerBillingRisk")
          }}
        </span>
      </div>
    </div>

    <!-- Server gate-block error feedback -->
    <div
      v-if="hasGateError"
      class="fpg__error-banner"
      role="alert"
      data-testid="coe-gate-error"
    >
      <svg
        width="16"
        height="16"
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
      <span>{{ t(writeFeedback.errorI18nKey!) }}</span>
    </div>

    <!-- Action buttons -->
    <div class="fpg__actions">
      <Button
        v-if="!readonly"
        variant="filled"
        tone="primary"
        size="sm"
        :disabled="!gate.canAdvanceToCoe || isSubmitting"
        :loading="isSubmitting"
        data-testid="send-coe-button"
        @click="handleSendCoe"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
        </svg>
        {{ t("cases.detail.overview.finalPaymentGate.sendCoe") }}
      </Button>
      <Button
        v-if="!gate.paymentCleared && !readonly"
        size="sm"
        @click="emit('switch-tab', 'billing')"
      >
        {{ t("cases.constants.detailTabs.billing") }}
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
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </div>

    <!-- Confirmation dialog (inline) -->
    <div
      v-if="showConfirm"
      class="fpg__confirm-overlay"
      data-testid="coe-confirm-dialog"
    >
      <div class="fpg__confirm-dialog">
        <h4 class="fpg__confirm-title">
          {{ t("cases.detail.overview.finalPaymentGate.confirmTitle") }}
        </h4>
        <p class="fpg__confirm-desc">
          {{ t("cases.detail.overview.finalPaymentGate.confirmDesc") }}
        </p>
        <div class="fpg__confirm-actions">
          <Button size="sm" @click="cancelConfirm">
            {{ t("cases.detail.overview.finalPaymentGate.cancelAction") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :loading="isSubmitting"
            @click="confirmSendCoe"
          >
            {{ t("cases.detail.overview.finalPaymentGate.confirmAction") }}
          </Button>
        </div>
      </div>
    </div>

    <p class="fpg__hint">
      {{ t("cases.detail.overview.finalPaymentGate.sendCoeHint") }}
    </p>
  </Card>
</template>

<style scoped>
.fpg__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
  margin-bottom: 16px;
}
.fpg__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--color-text-2);
}
.fpg__title {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.fpg__gate-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
}
.fpg__gate-badge--success {
  background: rgba(22, 163, 74, 0.1);
  color: var(--color-success, #16a34a);
  border: 1px solid rgba(22, 163, 74, 0.18);
}
.fpg__gate-badge--blocked {
  background: rgba(220, 38, 38, 0.1);
  color: #991b1b;
  border: 1px solid rgba(220, 38, 38, 0.18);
}

/* ── Status rows ── */
.fpg__status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-1);
}
.fpg__status-row:last-of-type {
  border-bottom: none;
}
.fpg__status-label {
  flex-shrink: 0;
  min-width: 100px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.fpg__status-value {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.fpg__status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}
.fpg__status-dot--success {
  background: var(--color-success, #16a34a);
}
.fpg__status-dot--warning {
  background: #f59e0b;
}
.fpg__status-dot--danger {
  background: var(--color-danger, #dc2626);
}
.fpg__status-text--success {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-success, #16a34a);
}
.fpg__status-text--warning {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #92400e;
}
.fpg__status-text--danger {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #991b1b;
}
.fpg__outstanding-amount {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  padding: 1px 6px;
  background: rgba(245, 158, 11, 0.08);
  border-radius: var(--radius-full);
}

/* ── Blockers ── */
.fpg__blockers {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(220, 38, 38, 0.03);
  border: 1px solid rgba(220, 38, 38, 0.08);
  border-radius: var(--radius-md, 6px);
}
.fpg__blocker-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: #991b1b;
}
.fpg__blocker-item svg {
  flex-shrink: 0;
  margin-top: 1px;
}

/* ── Error banner ── */
.fpg__error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.12);
  border-radius: var(--radius-md, 6px);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: #991b1b;
}
.fpg__error-banner svg {
  flex-shrink: 0;
}

/* ── Actions ── */
.fpg__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

/* ── Hint ── */
.fpg__hint {
  margin: 12px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  line-height: 1.5;
}

/* ── Confirm dialog ── */
.fpg__confirm-overlay {
  margin-top: 16px;
  padding: 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-lg, 12px);
}
.fpg__confirm-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.fpg__confirm-desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  line-height: 1.6;
}
.fpg__confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}
</style>
