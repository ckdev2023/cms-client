<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { FailureCloseoutInfo } from "../types-detail";
import type { CaseDetailTab } from "../types";
import type { WriteActionFeedback } from "../model/useCaseDetailWriteActions";

/** 失败结案横幅：展示失败原因、后续动作与跳转入口。 */
const { t } = useI18n();

defineProps<{
  closeout: FailureCloseoutInfo;
  customerId?: string;
  clientName?: string;
  readonly?: boolean;
  writeFeedback?: WriteActionFeedback;
}>();

const emit = defineEmits<{
  (e: "closeCase"): void;
  (e: "switchTab", tab: CaseDetailTab): void;
}>();

const REASON_I18N_MAP: Record<string, string> = {
  VISA_REJECTED: "cases.detail.overview.failureCloseout.reasons.visaRejected",
  APPLICATION_REJECTED:
    "cases.detail.overview.failureCloseout.reasons.applicationRejected",
  CLIENT_WITHDRAWN:
    "cases.detail.overview.failureCloseout.reasons.clientWithdrawn",
  MANUAL_FAILURE_CLOSE:
    "cases.detail.overview.failureCloseout.reasons.manualClose",
};

/**
 * 将失败结案原因代码映射为 i18n key。
 * @param code - 失败结案原因代码。
 * @returns 对应的 i18n key；未知时返回 `null`。
 */
function reasonI18nKey(code: string | null): string | null {
  if (!code) return null;
  return REASON_I18N_MAP[code] ?? null;
}
</script>

<template>
  <Card padding="md" data-testid="failure-closeout-banner">
    <div class="fc-banner">
      <div class="fc-banner__header">
        <div class="fc-banner__icon">
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
            <path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
            />
          </svg>
        </div>
        <div class="fc-banner__title-block">
          <h3 class="fc-banner__title">
            {{ t("cases.detail.overview.failureCloseout.title") }}
          </h3>
          <p class="fc-banner__subtitle">
            {{ t("cases.detail.overview.failureCloseout.subtitle") }}
          </p>
        </div>
      </div>

      <div class="fc-banner__body">
        <div class="fc-banner__reason-row">
          <span class="fc-banner__label">
            {{ t("cases.detail.overview.failureCloseout.reasonLabel") }}
          </span>
          <span class="fc-banner__reason-chip">
            <template
              v-if="closeout.reasonCode && reasonI18nKey(closeout.reasonCode)"
            >
              {{ t(reasonI18nKey(closeout.reasonCode)!) }}
            </template>
            <template v-else-if="closeout.reasonLabel">
              {{ closeout.reasonLabel }}
            </template>
            <template v-else>
              {{ t("cases.detail.overview.failureCloseout.reasonUnknown") }}
            </template>
          </span>
        </div>

        <div class="fc-banner__status-row">
          <span class="fc-banner__label">
            {{ t("cases.detail.overview.failureCloseout.statusLabel") }}
          </span>
          <span
            :class="[
              'fc-banner__status-chip',
              closeout.canDirectClose
                ? 'fc-banner__status-chip--ready'
                : 'fc-banner__status-chip--pending',
            ]"
          >
            {{
              closeout.canDirectClose
                ? t("cases.detail.overview.failureCloseout.statusReady")
                : t("cases.detail.overview.failureCloseout.statusPending")
            }}
          </span>
        </div>

        <p v-if="closeout.closeReasonRequired" class="fc-banner__hint">
          {{ t("cases.detail.overview.failureCloseout.closeReasonHint") }}
        </p>
      </div>

      <div
        v-if="writeFeedback?.errorMessage && writeFeedback.serverErrorCode"
        class="fc-banner__error"
        role="alert"
      >
        {{
          writeFeedback.errorI18nKey
            ? t(writeFeedback.errorI18nKey)
            : writeFeedback.errorMessage
        }}
      </div>

      <div class="fc-banner__actions">
        <Button
          v-if="!readonly"
          variant="filled"
          tone="danger"
          size="sm"
          :disabled="writeFeedback?.submitting"
          @click="emit('closeCase')"
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
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
          {{ t("cases.detail.overview.failureCloseout.closeAction") }}
        </Button>
        <Button size="sm" @click="emit('switchTab', 'billing')">
          {{ t("cases.detail.overview.failureCloseout.viewBilling") }}
        </Button>
        <Button size="sm" @click="emit('switchTab', 'log')">
          {{ t("cases.detail.overview.failureCloseout.viewLog") }}
        </Button>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.fc-banner {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fc-banner__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.fc-banner__icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: rgba(220, 38, 38, 0.08);
  color: var(--color-danger, #dc2626);
}

.fc-banner__title-block {
  flex: 1;
  min-width: 0;
}

.fc-banner__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: #991b1b;
}

.fc-banner__subtitle {
  margin: 4px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.5;
}

.fc-banner__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(220, 38, 38, 0.03);
  border: 1px solid rgba(220, 38, 38, 0.1);
  border-radius: var(--radius-lg, 12px);
}

.fc-banner__reason-row,
.fc-banner__status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.fc-banner__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  min-width: 80px;
  flex-shrink: 0;
}

.fc-banner__reason-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  background: rgba(220, 38, 38, 0.08);
  color: #991b1b;
}

.fc-banner__status-chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
}

.fc-banner__status-chip--ready {
  background: rgba(245, 158, 11, 0.08);
  color: #92400e;
}

.fc-banner__status-chip--pending {
  background: var(--color-bg-3);
  color: var(--color-text-3);
}

.fc-banner__hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-style: italic;
}

.fc-banner__error {
  padding: 8px 12px;
  border-radius: var(--radius-default);
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.12);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: #991b1b;
}

.fc-banner__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
