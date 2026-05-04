<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { FailureCloseoutInfo, SuccessCloseoutInfo } from "../types-detail";

/** 结案原因弹窗：展示案件归档详情（失败/成功结案信息）。 */
const { t } = useI18n();

interface CaseCloseReasonModalProps {
  open?: boolean;
  failureCloseout?: FailureCloseoutInfo | null;
  successCloseout?: SuccessCloseoutInfo | null;
  closeReason?: string | null;
  closedAt?: string | null;
  closedBy?: string | null;
  businessPhase?: string;
}

const props = defineProps<CaseCloseReasonModalProps>();

const emit = defineEmits<{
  close: [];
}>();

const backdropRef = ref<HTMLElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      nextTick(() => backdropRef.value?.focus());
    }
  },
);

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
 * 将失败帰因代码转为可展示文案。
 *
 * @param code - 失败帰因代码
 * @returns 对应的国际化文案
 */
function reasonDisplay(code: string | null | undefined): string {
  if (!code) return "—";
  const key = REASON_I18N_MAP[code];
  return key ? t(key) : code;
}

const isSuccess = computed(() => props.businessPhase === "CLOSED_SUCCESS");
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      ref="backdropRef"
      class="close-reason-modal-backdrop"
      data-testid="close-reason-modal-backdrop"
      tabindex="-1"
      aria-labelledby="close-reason-modal-title"
      role="dialog"
      aria-modal="true"
      @click.self="emit('close')"
      @keydown.esc.stop.prevent="emit('close')"
    >
      <div class="close-reason-modal" data-testid="close-reason-modal">
        <header class="close-reason-modal__header">
          <h2 id="close-reason-modal-title" class="close-reason-modal__title">
            {{
              isSuccess
                ? t("cases.detail.closeReasonModal.titleSuccess")
                : t("cases.detail.closeReasonModal.titleFailure")
            }}
          </h2>
          <button
            type="button"
            class="close-reason-modal__close-btn"
            :aria-label="t('cases.common.close')"
            @click="emit('close')"
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
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="close-reason-modal__body">
          <!-- Meta: closedAt / closedBy -->
          <dl class="close-reason-modal__meta">
            <div class="close-reason-modal__meta-item">
              <dt>{{ t("cases.detail.closeReasonModal.closedAt") }}</dt>
              <dd>{{ props.closedAt || "—" }}</dd>
            </div>
            <div class="close-reason-modal__meta-item">
              <dt>{{ t("cases.detail.closeReasonModal.closedBy") }}</dt>
              <dd>{{ props.closedBy || "—" }}</dd>
            </div>
          </dl>

          <!-- Failure Closeout Detail -->
          <section
            v-if="!isSuccess && (props.failureCloseout || props.closeReason)"
            class="close-reason-modal__section"
            data-testid="close-reason-modal-failure"
          >
            <h3 class="close-reason-modal__section-title">
              {{ t("cases.detail.closeReasonModal.failureReasonTitle") }}
            </h3>
            <dl class="close-reason-modal__detail-list">
              <div
                v-if="props.failureCloseout"
                class="close-reason-modal__detail-row"
              >
                <dt>
                  {{ t("cases.detail.overview.failureCloseout.reasonLabel") }}
                </dt>
                <dd class="close-reason-modal__reason-value">
                  {{ reasonDisplay(props.failureCloseout.reasonCode) }}
                </dd>
              </div>
              <div
                v-if="props.closeReason"
                class="close-reason-modal__detail-row"
              >
                <dt>
                  {{ t("cases.detail.closeReasonModal.closeReasonText") }}
                </dt>
                <dd>{{ props.closeReason }}</dd>
              </div>
            </dl>
          </section>

          <!-- Success Closeout Detail -->
          <section
            v-if="isSuccess && props.successCloseout"
            class="close-reason-modal__section"
            data-testid="close-reason-modal-success"
          >
            <h3 class="close-reason-modal__section-title">
              {{ t("cases.detail.closeReasonModal.successTitle") }}
            </h3>
            <ul class="close-reason-modal__checklist">
              <li
                v-for="pc in props.successCloseout.preconditions"
                :key="pc.code"
                class="close-reason-modal__checklist-item"
                :class="{
                  'close-reason-modal__checklist-item--done': pc.satisfied,
                }"
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
                  <path v-if="pc.satisfied" d="M20 6L9 17l-5-5" />
                  <circle v-else cx="12" cy="12" r="10" />
                </svg>
                <span>{{ pc.label }}</span>
              </li>
            </ul>
          </section>

          <!-- Fallback when no closeout info -->
          <p
            v-if="
              (isSuccess && !props.successCloseout) ||
              (!isSuccess && !props.failureCloseout && !props.closeReason)
            "
            class="close-reason-modal__empty"
          >
            {{ t("cases.detail.closeReasonModal.noCloseReasonRecorded") }}
          </p>
        </div>

        <footer class="close-reason-modal__footer">
          <Button
            size="sm"
            data-testid="close-reason-modal-ok"
            @click="emit('close')"
          >
            {{ t("cases.detail.closeReasonModal.close") }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.close-reason-modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
}

.close-reason-modal {
  width: min(480px, 90vw);
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-3);
  overflow: hidden;
}

.close-reason-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 12px;
  border-bottom: 1px solid var(--color-border-1);
}

.close-reason-modal__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.close-reason-modal__close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: var(--radius-md);
  color: var(--color-text-3);
  cursor: pointer;
}
.close-reason-modal__close-btn:hover {
  background: var(--color-bg-3);
  color: var(--color-text-1);
}

.close-reason-modal__body {
  padding: 20px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.close-reason-modal__meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
}
.close-reason-modal__meta-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.close-reason-modal__meta-item dt {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.close-reason-modal__meta-item dd {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.close-reason-modal__section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.close-reason-modal__section-title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.close-reason-modal__detail-list {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.close-reason-modal__detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.close-reason-modal__detail-row dt {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}
.close-reason-modal__detail-row dd {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}
.close-reason-modal__reason-value {
  font-weight: var(--font-weight-semibold);
}

.close-reason-modal__checklist {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.close-reason-modal__checklist-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}
.close-reason-modal__checklist-item--done {
  color: var(--color-success);
}
.close-reason-modal__checklist-item svg {
  flex-shrink: 0;
}

.close-reason-modal__empty {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.close-reason-modal__footer {
  display: flex;
  justify-content: flex-end;
  padding: 12px 24px 20px;
  border-top: 1px solid var(--color-border-1);
}
</style>
