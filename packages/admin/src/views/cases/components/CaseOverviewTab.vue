<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import CaseOverviewSidebar from "./CaseOverviewSidebar.vue";
import CaseOverviewStatCards from "./CaseOverviewStatCards.vue";
import CaseOverviewNextAction from "./CaseOverviewNextAction.vue";
import CaseOverviewTimeline from "./CaseOverviewTimeline.vue";
import CaseWorkflowStepSection from "./CaseWorkflowStepSection.vue";
import CaseSurveyQuoteSection from "./CaseSurveyQuoteSection.vue";
import CaseCustomerBackLink from "./CaseCustomerBackLink.vue";
import CaseProviderProgress from "./CaseProviderProgress.vue";
import CaseFinalPaymentCoeGate from "./CaseFinalPaymentCoeGate.vue";
import CaseSupplementRoundPanel from "./CaseSupplementRoundPanel.vue";
import CaseReminderFailureBanner from "./CaseReminderFailureBanner.vue";
import CaseFailureCloseoutBanner from "./CaseFailureCloseoutBanner.vue";
import CaseCloseReasonModal from "./CaseCloseReasonModal.vue";
import { resolveGroupLabel } from "../../../shared/model/groupOptions";
import { resolveLocalizedCustomerName } from "../model/CaseAdapterCustomerLocale";
import type { CaseDetailTab } from "../types";
import type { CaseDetail } from "../types-detail";
import type { WriteActionFeedback } from "../model/useCaseDetailWriteActions";
import { isRenderableFinalPaymentGate } from "../model/CaseAdapterFinalPaymentGate";

/** 概览 Tab：组合统计卡、下一动作、时间线、侧边栏与各类提示横幅。 */
const { locale } = useI18n();
const props = defineProps<{
  detail: CaseDetail;
  writeFeedback?: WriteActionFeedback;
  readonly?: boolean;
  isTerminal?: boolean;
  canRunValidation?: boolean;
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
  (e: "advanceToCoe"): void;
  (e: "retryReminder"): void;
  (e: "failureClose"): void;
}>();

const closeReasonModalOpen = ref(false);

const resolvedGroupName = computed(() => {
  if (!props.detail.groupName) return undefined;
  return resolveGroupLabel(props.detail.groupName, undefined, locale.value);
});

const localizedClientName = computed(() =>
  resolveLocalizedCustomerName(
    props.detail.customerLocalizedNames,
    props.detail.client,
    locale.value,
  ),
);

const renderableFinalPaymentGate = computed(() =>
  isRenderableFinalPaymentGate(props.detail.finalPaymentGate)
    ? props.detail.finalPaymentGate
    : null,
);
</script>

<template>
  <div class="overview-tab">
    <CaseCustomerBackLink
      v-if="detail.customerId"
      :customer-id="detail.customerId"
      :client="localizedClientName"
      :group-name="resolvedGroupName"
    />

    <CaseOverviewStatCards :detail="detail" :is-terminal="isTerminal" />

    <CaseWorkflowStepSection
      v-if="detail.workflowStep"
      :workflow-step="detail.workflowStep"
      :management-stage="detail.stageCode"
      :supplement-count="detail.supplementCount"
    />

    <CaseSurveyQuoteSection
      v-if="detail.surveyStatus || detail.quoteStatus"
      :survey-status="detail.surveyStatus"
      :quote-status="detail.quoteStatus"
      :pre-sign-gate="detail.preSignGate"
    />

    <CaseFinalPaymentCoeGate
      v-if="renderableFinalPaymentGate"
      :gate="renderableFinalPaymentGate"
      :write-feedback="writeFeedback"
      :readonly="readonly ?? detail.readonly"
      @advance-to-coe="emit('advanceToCoe')"
      @switch-tab="(tab) => emit('switchTab', tab as CaseDetailTab)"
    />

    <CaseSupplementRoundPanel
      v-if="detail.supplementRound"
      :info="detail.supplementRound"
      :readonly="readonly ?? detail.readonly"
      @switch-tab="(tab) => emit('switchTab', tab as CaseDetailTab)"
    />
    <CaseReminderFailureBanner
      v-if="detail.reminderFailure"
      :info="detail.reminderFailure"
      :write-feedback="writeFeedback"
      :readonly="readonly ?? detail.readonly"
      @retry-reminder="emit('retryReminder')"
    />

    <CaseFailureCloseoutBanner
      v-if="detail.failureCloseout"
      :closeout="detail.failureCloseout"
      :customer-id="detail.customerId"
      :client-name="localizedClientName"
      :readonly="readonly ?? detail.readonly"
      :write-feedback="writeFeedback"
      @close-case="emit('failureClose')"
      @switch-tab="(tab) => emit('switchTab', tab as CaseDetailTab)"
    />

    <CaseProviderProgress :items="detail.providerProgress" />

    <div class="overview-tab__main-grid">
      <div class="overview-tab__main-left">
        <CaseOverviewNextAction
          :detail="detail"
          :is-terminal="isTerminal"
          :can-run-validation="canRunValidation"
          @switch-tab="(tab) => emit('switchTab', tab)"
          @open-close-reason="closeReasonModalOpen = true"
        />

        <CaseOverviewTimeline
          :timeline="detail.timeline"
          @switch-tab="(tab) => emit('switchTab', tab)"
        />
      </div>

      <CaseOverviewSidebar
        :detail="detail"
        :is-terminal="isTerminal"
        @switch-tab="(tab) => emit('switchTab', tab)"
      />
    </div>

    <CaseCloseReasonModal
      :open="closeReasonModalOpen"
      :failure-closeout="detail.failureCloseout"
      :success-closeout="detail.successCloseout"
      :close-reason="detail.closeReason"
      :closed-at="detail.closedAt"
      :closed-by="detail.closedBy"
      :business-phase="detail.businessPhase"
      @close="closeReasonModalOpen = false"
    />
  </div>
</template>

<style scoped>
.overview-tab {
  display: grid;
  gap: 20px;
}

.overview-tab__main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}
@media (max-width: 1024px) {
  .overview-tab__main-grid {
    grid-template-columns: 1fr;
  }
}
.overview-tab__main-left {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
</style>
