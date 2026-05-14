<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { BillingPlanNode } from "../types";
import type { CreatePaymentInput } from "../model/BillingAdapterUrls";
import {
  type BillingMutationResult,
  resolveMilestoneLabel,
} from "../model/BillingAdapters";
import { usePaymentModal } from "../model/usePaymentModal";
import Button from "../../../shared/ui/Button.vue";

/**
 * 登记回款弹窗：接收 caseId，打开时拉取收费计划，提交走 createPayment → toast → refresh。
 */
const props = withDefaults(
  defineProps<{
    open: boolean;
    caseId: string;
    defaultBillingPlanId?: string;
    getBillingPlanNodes: (caseId: string) => Promise<BillingPlanNode[]>;
    createPayment: (
      input: CreatePaymentInput,
    ) => Promise<BillingMutationResult>;
  }>(),
  {
    caseId: "",
    defaultBillingPlanId: "",
  },
);

const emit = defineEmits<{
  close: [];
  submitted: [];
}>();

const { t } = useI18n();
const modal = usePaymentModal();
/** Chromium：number 不配 max 时常将 spinbutton valuemax 暴露为 0，与固定 min=1 叠在一起会拦住合法回款。金额输入始终绑定 max：选中节点应收 > 0 时封顶为该额，否则用大数（含「计划尚未拉取 / 多节点未选 / 节点金额为 0」；超限提示与服务端仍收口）。 */
const PAYMENT_AMOUNT_MAX_WHEN_NODE_UNPRICED = Number.MAX_SAFE_INTEGER;
const paymentAmountMaxAttrs = computed(() => {
  const n = modal.selectedNode.value;
  if (n != null && n.amount > 0) {
    return { max: n.amount };
  }
  return { max: PAYMENT_AMOUNT_MAX_WHEN_NODE_UNPRICED };
});
/** 嵌套在普通对象内的 ref 在模板里不易追踪；computed 保证未结清列表更新后下拉会重绘。 */
const availableBillingNodes = computed(() => modal.availableNodes.value);
const loadingNodes = ref(false);
const nodeError = ref<string | null>(null);
const submitting = ref(false);

/**
 * 弹窗多在 deep-link 首帧打开；先让 Vue 与微任务队列落稳再拉收费计划，避免与路由/会话注入竞态。
 */
async function alignSessionBeforeBillingRead(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
}

watch(
  () => [props.open, props.caseId] as const,
  async ([open, caseId]) => {
    if (open && caseId) {
      loadingNodes.value = true;
      nodeError.value = null;
      try {
        await alignSessionBeforeBillingRead();
        const nodes = await props.getBillingPlanNodes(caseId.trim());
        modal.open(nodes);
        if (props.defaultBillingPlanId) {
          const exists = modal.availableNodes.value.some(
            (n) => n.id === props.defaultBillingPlanId,
          );
          if (exists) {
            modal.fields.value.billingPlanId = props.defaultBillingPlanId;
          }
        }
      } catch (e) {
        nodeError.value = e instanceof Error ? e.message : String(e);
      } finally {
        loadingNodes.value = false;
      }
    } else if (!open) {
      if (modal.isOpen.value) modal.close();
      nodeError.value = null;
      submitting.value = false;
    }
  },
  { immediate: true },
);

async function handleSubmit() {
  if (!modal.canSubmit.value || submitting.value) return;
  submitting.value = true;
  try {
    await props.createPayment({
      billingPlanId: modal.fields.value.billingPlanId,
      amountReceived: modal.parsedAmount.value,
      receivedAt: modal.fields.value.date,
      paymentMethod: modal.fields.value.receipt || null,
      note: modal.fields.value.note || null,
    });
    emit("submitted");
    emit("close");
  } catch {
    nodeError.value = t("billing.paymentModal.submitError");
  } finally {
    submitting.value = false;
  }
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

          <div v-if="loadingNodes" class="pm-body__loading">
            {{ t("billing.paymentModal.loadingNodes") }}
          </div>

          <div v-else-if="nodeError" class="pm-body__error">
            {{ nodeError }}
          </div>

          <div v-else class="pm-fields">
            <!-- 金额 -->
            <div class="pm-field">
              <label class="pm-label" for="payment-amount">
                {{ t("billing.paymentModal.fields.amount") }}
                <span class="pm-label__required">*</span>
              </label>
              <input
                id="payment-amount"
                name="amount"
                v-model="modal.fields.value.amount"
                type="number"
                class="pm-input"
                min="1"
                v-bind="paymentAmountMaxAttrs"
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
              <label class="pm-label" for="payment-date">
                {{ t("billing.paymentModal.fields.date") }}
                <span class="pm-label__required">*</span>
              </label>
              <input
                id="payment-date"
                name="date"
                v-model="modal.fields.value.date"
                type="date"
                class="pm-input"
              />
            </div>

            <!-- 关联收费计划（仅多行遗留数据时展示选择器） -->
            <div v-if="availableBillingNodes.length > 1" class="pm-field">
              <label class="pm-label" for="payment-billingPlanId">{{
                t("billing.paymentModal.fields.node")
              }}</label>
              <select
                id="payment-billingPlanId"
                name="billingPlanId"
                v-model="modal.fields.value.billingPlanId"
                class="pm-input pm-input--select"
              >
                <option value="">
                  {{ t("billing.paymentModal.fields.nodePlaceholder") }}
                </option>
                <option
                  v-for="node in availableBillingNodes"
                  :key="node.id"
                  :value="node.id"
                >
                  {{ resolveMilestoneLabel(node.name, t) }} — ¥{{
                    node.amount.toLocaleString("ja-JP")
                  }}<template v-if="node.dueDate">
                    ({{ node.dueDate }})</template
                  >
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
              <label class="pm-label" for="payment-receipt">{{
                t("billing.paymentModal.fields.receipt")
              }}</label>
              <input
                id="payment-receipt"
                name="receipt"
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
              <label class="pm-label" for="payment-note">{{
                t("billing.paymentModal.fields.note")
              }}</label>
              <textarea
                id="payment-note"
                name="note"
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
            :disabled="!modal.canSubmit.value || submitting || loadingNodes"
            @click="handleSubmit"
          >
            {{
              submitting
                ? t("billing.paymentModal.submitting")
                : t("billing.paymentModal.submit")
            }}
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
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.pm-header__close {
  all: unset;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-md);
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

.pm-body__loading {
  text-align: center;
  padding: 32px 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.pm-body__error {
  padding: 12px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-danger-text);
  background: rgba(220, 38, 38, 0.06);
  border-radius: var(--radius-md);
  font-weight: var(--font-weight-semibold);
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
  border-radius: var(--radius-md);
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
  color: var(--color-warning-text);
  background: rgba(245, 158, 11, 0.1);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin-top: 8px;
  font-weight: var(--font-weight-semibold);
}

.pm-field__error {
  font-size: var(--font-size-xs);
  color: var(--color-danger-text);
  margin-top: 4px;
  font-weight: var(--font-weight-semibold);
}

.pm-field__sub {
  font-size: var(--font-size-xs);
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
