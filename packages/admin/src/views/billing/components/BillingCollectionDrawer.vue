<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CollectionResult, CollectionResultDetail } from "../types";

/**
 * 批量催款明细抽屉——展示成功/跳过/失败三段式催款结果，
 * 按 caseNo + reasonCode i18n 呈现每条催款明细。
 */

const props = withDefaults(
  defineProps<{
    open?: boolean;
    result?: CollectionResult | null;
  }>(),
  {
    open: false,
    result: null,
  },
);

defineEmits<{
  close: [];
}>();

const { t } = useI18n();

const successDetails = computed<CollectionResultDetail[]>(
  () => props.result?.details.filter((d) => d.result === "success") ?? [],
);

const skippedDetails = computed<CollectionResultDetail[]>(
  () => props.result?.details.filter((d) => d.result === "skipped") ?? [],
);

const failedDetails = computed<CollectionResultDetail[]>(
  () => props.result?.details.filter((d) => d.result === "failed") ?? [],
);

/**
 * 根据跳过原因码返回国际化标签。
 *
 * @param detail - 催款明细条目
 * @returns i18n 后的原因描述
 */
function skipReasonLabel(detail: CollectionResultDetail): string {
  if (!detail.reason) return "";
  return t(`billing.bulkCollect.skipReason.${detail.reason}`);
}
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="open" class="drawer-overlay" @click.self="$emit('close')">
        <aside class="drawer" role="dialog" aria-modal="true">
          <header class="drawer__header">
            <h2 class="drawer__title">
              {{ t("billing.bulkCollect.drawer.title") }}
            </h2>
            <button
              class="drawer__close"
              type="button"
              :aria-label="t('billing.paymentModal.closeAriaLabel')"
              @click="$emit('close')"
            >
              <svg
                class="drawer__close-icon"
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
          </header>

          <div class="drawer__body">
            <div v-if="!result" class="drawer__empty">
              {{ t("billing.bulkCollect.drawer.empty") }}
            </div>

            <template v-else>
              <div class="drawer__summary">
                <span class="drawer__badge drawer__badge--success">
                  {{ t("billing.bulkCollect.drawer.successLabel") }}
                  {{ result.success }}
                </span>
                <span class="drawer__badge drawer__badge--skip">
                  {{ t("billing.bulkCollect.drawer.skippedLabel") }}
                  {{ result.skipped }}
                </span>
                <span class="drawer__badge drawer__badge--fail">
                  {{ t("billing.bulkCollect.drawer.failedLabel") }}
                  {{ result.failed }}
                </span>
              </div>

              <ul
                v-if="successDetails.length"
                class="drawer__list"
                data-section="success"
              >
                <li
                  v-for="(d, index) in successDetails"
                  :key="'s-' + (d.taskId ?? d.caseNo ?? index)"
                  class="drawer__item drawer__item--success"
                >
                  <span class="drawer__case-no">{{
                    d.caseNo ?? t("billing.bulkCollect.drawer.unknownCase")
                  }}</span>
                  <span v-if="d.taskId" class="drawer__task-id">{{
                    d.taskId
                  }}</span>
                </li>
              </ul>

              <ul
                v-if="skippedDetails.length"
                class="drawer__list"
                data-section="skipped"
              >
                <li
                  v-for="(d, index) in skippedDetails"
                  :key="'k-' + (d.caseNo ?? d.reason ?? '') + '-' + index"
                  class="drawer__item drawer__item--skip"
                >
                  <span class="drawer__case-no">{{
                    d.caseNo ?? t("billing.bulkCollect.drawer.unknownCase")
                  }}</span>
                  <span class="drawer__reason">{{ skipReasonLabel(d) }}</span>
                </li>
              </ul>

              <ul
                v-if="failedDetails.length"
                class="drawer__list"
                data-section="failed"
              >
                <li
                  v-for="(d, index) in failedDetails"
                  :key="'f-' + (d.caseNo ?? d.reason ?? '') + '-' + index"
                  class="drawer__item drawer__item--fail"
                >
                  <span class="drawer__case-no">{{
                    d.caseNo ?? t("billing.bulkCollect.drawer.unknownCase")
                  }}</span>
                  <span class="drawer__reason">{{ skipReasonLabel(d) }}</span>
                </li>
              </ul>
            </template>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: flex-end;
}

.drawer {
  width: 420px;
  max-width: 100%;
  height: 100%;
  background: var(--color-bg-1);
  box-shadow:
    -4px 0 24px rgba(0, 0, 0, 0.1),
    -1px 0 4px rgba(0, 0, 0, 0.06);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border-1);
  flex-shrink: 0;
}

.drawer__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  margin: 0;
}

.drawer__close {
  all: unset;
  flex-shrink: 0;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-md);
  transition: color var(--transition-fast);
}

.drawer__close:hover {
  color: var(--color-text-1);
}

.drawer__close-icon {
  width: 20px;
  height: 20px;
}

.drawer__body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
}

.drawer__empty {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  text-align: center;
  padding: 24px 0;
}

.drawer__summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.drawer__badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  font-variant-numeric: tabular-nums;
}

.drawer__badge--success {
  background: var(--color-green-bg, #ecfdf5);
  color: var(--color-green-text, #065f46);
}

.drawer__badge--skip {
  background: var(--color-orange-bg, #fffbeb);
  color: var(--color-warning-text);
}

.drawer__badge--fail {
  background: var(--color-red-bg, #fef2f2);
  color: var(--color-danger-text);
}

.drawer__list {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
}

.drawer__item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-1);
  font-size: var(--font-size-sm);
}

.drawer__item:last-child {
  border-bottom: none;
}

.drawer__item--success {
  color: var(--color-green-text, #065f46);
}

.drawer__item--skip {
  color: var(--color-warning-text);
}

.drawer__item--fail {
  color: var(--color-danger-text);
}

.drawer__case-no {
  font-weight: var(--font-weight-extrabold);
  flex-shrink: 0;
}

.drawer__task-id {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.drawer__reason {
  font-size: var(--font-size-xs);
  color: inherit;
  opacity: 0.8;
}

/* --- Transition --- */

.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 200ms ease;
}

.drawer-enter-active .drawer,
.drawer-leave-active .drawer {
  transition: transform 200ms ease;
}

.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}

.drawer-enter-from .drawer,
.drawer-leave-to .drawer {
  transform: translateX(100%);
}
</style>
