<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 案件新建向导底部：步骤提示、预签约门禁警告、前往客户详情恢复入口与上一步/下一步/提交。 */
defineProps<{
  currentStep: number;
  gateBlocked: boolean;
  showGoToCustomerResume: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  canGoNext: boolean;
  canSubmit: boolean;
  submitting: boolean;
  nextLabel: string;
}>();

defineEmits<{
  prev: [];
  next: [];
  submit: [];
  goToCustomer: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div class="cc__footer">
    <div class="cc__footer-inner">
      <div class="cc__footer-left">
        <span class="cc__footer-hint">
          {{
            t("cases.create.navigation.stepHint", {
              current: currentStep,
              total: 4,
            })
          }}
          <span
            v-if="gateBlocked"
            class="cc__footer-gate-warn"
            data-testid="footer-gate-warn"
          >
            — {{ t("cases.create.preSignGate.blockedTitle") }}
          </span>
        </span>
        <button
          v-if="showGoToCustomerResume"
          type="button"
          class="cc__footer-customer-link"
          data-testid="case-create-footer-go-to-customer"
          @click="$emit('goToCustomer')"
        >
          {{ t("cases.create.preSignGate.goToCustomer") }}
        </button>
      </div>
      <div class="cc__footer-actions">
        <Button v-if="!isFirstStep" @click="$emit('prev')">
          {{ t("cases.create.navigation.prev") }}
        </Button>
        <Button
          v-if="!isLastStep"
          variant="filled"
          tone="primary"
          :disabled="!canGoNext"
          @click="$emit('next')"
        >
          {{ nextLabel }}
        </Button>
        <Button
          v-if="isLastStep"
          variant="filled"
          tone="primary"
          :disabled="!canSubmit"
          :loading="submitting"
          @click="$emit('submit')"
        >
          {{ t("cases.create.navigation.submit") }}
        </Button>
      </div>
    </div>
  </div>
</template>
