<script setup lang="ts">
import { watch } from "vue";
import { useI18n } from "vue-i18n";
import type { BillingPlanNode, RegisterPaymentFormFields } from "../types";
import { usePaymentModal } from "../model/usePaymentModal";
import Button from "../../../shared/ui/Button.vue";

/**
 * 登记回款弹窗：金额、日期、关联节点、凭证、备注 5 个字段。
 *
 * 内部使用 usePaymentModal 管理表单状态与校验；
 * 金额超限为软提示（不阻断）；多未结清节点未选择时阻断提交。
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    nodes?: BillingPlanNode[];
  }>(),
  {
    nodes: () => [],
  },
);

const emit = defineEmits<{
  close: [];
  submit: [fields: RegisterPaymentFormFields];
}>();

const { t } = useI18n();
const modal = usePaymentModal();

watch(
  () => props.open,
  (val) => {
    if (val) {
      modal.open(props.nodes);
    } else if (modal.isOpen.value) {
      modal.close();
    }
  },
);

/** 提交回款表单并关闭弹窗。 */
function handleSubmit() {
  if (!modal.canSubmit.value) return;
  emit("submit", { ...modal.fields.value });
  emit("close");
}

/** 关闭弹窗。 */
function handleClose() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="pm-overlay" @click.self="handleClose">
      <div
        class="pm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('billing.paymentModal.title')"
      >
        <!-- Header -->
        <div class="pm-header">
          <h3 class="pm-header__title">
            {{ t("billing.paymentModal.title") }}
          </h3>
          <button
            class="pm-header__close"
            type="button"
            :aria-label="t('billing.paymentModal.closeAriaLabel')"
            @click="handleClose"
          >
            <svg
              class="pm-header__close-icon"
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

        <!-- Body -->
        <div class="pm-body">
          <p class="pm-body__hint">{{ t("billing.paymentModal.hint") }}</p>

          <div class="pm-fields">
            <!-- 金额 -->
            <div class="pm-field">
              <label class="pm-label">
                {{ t("billing.paymentModal.fields.amount") }}
                <span class="pm-label__required">*</span>
              </label>
              <input
                v-model="modal.fields.value.amount"
                type="number"
                class="pm-input"
                min="1"
                :placeholder="
                  t('billing.paymentModal.fields.amountPlaceholder')
                "
              />
              <div
                v-if="modal.amountExceedsNode.value"
                class="pm-field__warning"
              >
                {{ t("billing.paymentModal.fields.amountWarning") }}
              </div>
            </div>

            <!-- 日期 -->
            <div class="pm-field">
              <label class="pm-label">
                {{ t("billing.paymentModal.fields.date") }}
                <span class="pm-label__required">*</span>
              </label>
              <input
                v-model="modal.fields.value.date"
                type="date"
                class="pm-input"
              />
            </div>

            <!-- 关联收费节点 -->
            <div class="pm-field">
              <label class="pm-label">{{
                t("billing.paymentModal.fields.node")
              }}</label>
              <select
                v-model="modal.fields.value.billingPlanId"
                class="pm-input pm-input--select"
              >
                <option value="">
                  {{ t("billing.paymentModal.fields.nodePlaceholder") }}
                </option>
                <option
                  v-for="node in modal.availableNodes.value"
                  :key="node.id"
                  :value="node.id"
                >
                  {{ node.name }} — ¥{{
                    node.amount.toLocaleString("ja-JP")
                  }}
                  ({{ node.dueDate }})
                </option>
              </select>
              <div
                v-if="modal.needsNodeSelection.value"
                class="pm-field__error"
              >
                {{ t("billing.paymentModal.fields.nodeError") }}
              </div>
            </div>

            <!-- 付款凭证 -->
            <div class="pm-field">
              <label class="pm-label">{{
                t("billing.paymentModal.fields.receipt")
              }}</label>
              <input
                v-model="modal.fields.value.receipt"
                type="text"
                class="pm-input"
                :placeholder="
                  t('billing.paymentModal.fields.receiptPlaceholder')
                "
              />
              <div class="pm-field__sub">
                {{ t("billing.paymentModal.fields.receiptHint") }}
              </div>
            </div>

            <!-- 备注 -->
            <div class="pm-field">
              <label class="pm-label">{{
                t("billing.paymentModal.fields.note")
              }}</label>
              <textarea
                v-model="modal.fields.value.note"
                class="pm-input pm-input--textarea"
                rows="2"
                :placeholder="t('billing.paymentModal.fields.notePlaceholder')"
              />
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="pm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="md"
            @click="handleClose"
          >
            {{ t("billing.paymentModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="md"
            :disabled="!modal.canSubmit.value"
            @click="handleSubmit"
          >
            {{ t("billing.paymentModal.submit") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pm-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.pm-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.pm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-1);
}

.pm-header__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.pm-header__close {
  all: unset;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-default);
  transition: color var(--transition-fast);
}

.pm-header__close:hover {
  color: var(--color-text-1);
}

.pm-header__close-icon {
  width: 20px;
  height: 20px;
}

.pm-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.pm-body__hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
  margin: 0 0 20px;
}

.pm-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.pm-field {
  display: flex;
  flex-direction: column;
}

.pm-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  margin-bottom: 6px;
}

.pm-label__required {
  color: var(--color-danger);
}

.pm-input {
  appearance: none;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  padding: 8px 12px;
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.pm-input:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.pm-input--select {
  cursor: pointer;
}

.pm-input--textarea {
  resize: vertical;
  min-height: 56px;
}

.pm-field__warning {
  font-size: var(--font-size-xs);
  color: #92400e;
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-default);
  padding: 8px 12px;
  margin-top: 8px;
  font-weight: var(--font-weight-semibold);
}

.pm-field__error {
  font-size: var(--font-size-xs);
  color: #991b1b;
  margin-top: 4px;
  font-weight: var(--font-weight-semibold);
}

.pm-field__sub {
  font-size: 11px;
  color: var(--color-text-3);
  margin-top: 4px;
  font-weight: var(--font-weight-semibold);
}

.pm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}
</style>
