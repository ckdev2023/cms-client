<script setup lang="ts">
import { computed, type Ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CustomerRepository } from "../model/CustomerRepository";
import { useCustomerBmvActionModel } from "../model/useCustomerBmvActionModel";
import { useCustomerBmvIntakeCardModel } from "../model/useCustomerBmvIntakeCardModel";
import type { CustomerDetail } from "../types";
import type { CustomerBmvAggregate } from "../types-bmv";

/**
 * 在客户基础信息区域展示经营管理签承接进度、下一步与建案门禁状态。
 */
const props = defineProps<{
  customer: CustomerDetail;
  repository: Pick<
    CustomerRepository,
    "sendBmvQuestionnaire" | "generateBmvQuote" | "recordBmvSign"
  >;
  refreshCustomer?: () => Promise<void>;
  aggregate?: CustomerBmvAggregate | null;
}>();

const emit = defineEmits<{
  (e: "transition-to-case"): void;
}>();

const { t, locale } = useI18n();
const customerRef = computed(() => props.customer);
const aggregateRef = computed(
  () => props.aggregate ?? null,
) as Ref<CustomerBmvAggregate | null>;
const { intakeCard } = useCustomerBmvIntakeCardModel({
  customer: customerRef,
  aggregate: aggregateRef,
  locale,
});
const { actions, feedbackTone, feedbackMessageKey } = useCustomerBmvActionModel(
  {
    customer: customerRef,
    repository: props.repository,
    refreshCustomer: props.refreshCustomer,
  },
);
</script>

<template>
  <section
    v-if="intakeCard"
    id="bmv-intake-card"
    class="bmv-intake-card"
    :aria-label="t('customers.detail.bmvIntake.ariaLabel')"
  >
    <div class="bmv-intake-card__header">
      <div>
        <p class="bmv-intake-card__eyebrow">
          {{ t("customers.detail.bmvIntake.eyebrow") }}
        </p>
        <h4 class="bmv-intake-card__title">
          {{ t("customers.detail.bmvIntake.title") }}
        </h4>
      </div>
      <Chip :tone="intakeCard.stage.tone">
        {{ t(intakeCard.stage.labelKey) }}
      </Chip>
    </div>

    <div class="bmv-intake-card__highlights">
      <article class="bmv-intake-card__highlight">
        <p class="bmv-intake-card__label">
          {{ t("customers.detail.bmvIntake.nextStep") }}
        </p>
        <p class="bmv-intake-card__value">
          {{ t(intakeCard.nextStepKey) }}
        </p>
      </article>
      <article class="bmv-intake-card__highlight">
        <p class="bmv-intake-card__label">
          {{ t("customers.detail.bmvIntake.gateHint") }}
        </p>
        <p class="bmv-intake-card__value">
          {{ t(intakeCard.gateHintKey) }}
        </p>
      </article>
    </div>

    <div class="bmv-intake-card__steps">
      <div
        v-for="item in intakeCard.stepStatuses"
        :key="item.labelKey"
        class="bmv-intake-card__step"
      >
        <span class="bmv-intake-card__label">{{ t(item.labelKey) }}</span>
        <Chip :tone="item.tone">{{ t(item.valueKey) }}</Chip>
      </div>
    </div>

    <div
      v-if="actions"
      id="bmv-intake-actions"
      class="bmv-intake-card__actions"
    >
      <div
        v-for="action in actions"
        :key="action.key"
        class="bmv-intake-card__action"
      >
        <div class="bmv-intake-card__action-copy">
          <p class="bmv-intake-card__action-title">{{ t(action.labelKey) }}</p>
          <p class="bmv-intake-card__action-hint">{{ t(action.hintKey) }}</p>
        </div>
        <Button
          size="sm"
          pill
          :variant="action.key === 'sign' ? 'filled' : 'outlined'"
          :tone="action.key === 'sign' ? 'primary' : 'neutral'"
          :disabled="action.disabled"
          :loading="action.loading"
          @click="action.run"
        >
          {{ t(action.labelKey) }}
        </Button>
      </div>
    </div>

    <p
      v-if="feedbackMessageKey"
      :class="[
        'bmv-intake-card__action-state',
        `bmv-intake-card__action-state--${feedbackTone}`,
      ]"
      role="status"
      aria-live="polite"
    >
      {{ t(feedbackMessageKey) }}
    </p>

    <dl class="bmv-intake-card__timeline">
      <div
        v-for="item in intakeCard.timeline"
        :key="item.labelKey"
        class="bmv-intake-card__timeline-item"
      >
        <dt class="bmv-intake-card__label">{{ t(item.labelKey) }}</dt>
        <dd class="bmv-intake-card__timeline-value">{{ item.value }}</dd>
      </div>
    </dl>

    <section
      v-if="intakeCard.quoteHistory.length"
      id="bmv-intake-quote"
      class="bmv-intake-card__section"
    >
      <h5 class="bmv-intake-card__section-title">
        {{ t("customers.detail.bmvIntake.quoteHistory.title") }}
      </h5>
      <ul class="bmv-intake-card__quote-list">
        <li
          v-for="quote in intakeCard.quoteHistory"
          :key="quote.id"
          class="bmv-intake-card__quote-item"
        >
          <span class="bmv-intake-card__quote-version">
            {{ quote.versionLabel }}
            <Chip v-if="quote.isCurrent" tone="success">
              {{ t("customers.detail.bmvIntake.quoteHistory.current") }}
            </Chip>
          </span>
          <span class="bmv-intake-card__quote-detail">
            {{ t("customers.detail.bmvIntake.quoteHistory.amount") }}:
            {{ quote.amount }}
          </span>
          <span
            class="bmv-intake-card__quote-detail bmv-intake-card__quote-detail--muted"
          >
            {{ quote.createdAt }}
          </span>
        </li>
      </ul>
    </section>

    <section
      v-if="intakeCard.surveyDataSummary"
      id="bmv-intake-survey"
      class="bmv-intake-card__section"
    >
      <h5 class="bmv-intake-card__section-title">
        {{ t("customers.detail.bmvIntake.surveyData.title") }}
      </h5>
      <p class="bmv-intake-card__survey-meta">
        {{
          t("customers.detail.bmvIntake.surveyData.fieldCount", {
            count: intakeCard.surveyDataSummary.fieldCount,
          })
        }}
        ·
        {{ intakeCard.surveyDataSummary.completedAt }}
      </p>
      <dl
        v-if="intakeCard.surveyDataSummary.highlightFields.length"
        class="bmv-intake-card__survey-fields"
      >
        <div
          v-for="(field, idx) in intakeCard.surveyDataSummary.highlightFields"
          :key="idx"
          class="bmv-intake-card__survey-field"
        >
          <dt class="bmv-intake-card__label">{{ field.label }}</dt>
          <dd class="bmv-intake-card__timeline-value">{{ field.value }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="intakeCard.linkedCase" class="bmv-intake-card__section">
      <h5 class="bmv-intake-card__section-title">
        {{ t("customers.detail.bmvIntake.caseStage.title") }}
      </h5>
      <dl class="bmv-intake-card__case-stage">
        <div class="bmv-intake-card__case-stage-item">
          <dt class="bmv-intake-card__label">
            {{ t("customers.detail.bmvIntake.caseStage.stage") }}
          </dt>
          <dd class="bmv-intake-card__timeline-value">
            {{ intakeCard.linkedCase.stage }}
          </dd>
        </div>
        <div
          v-if="intakeCard.linkedCase.postApprovalStage"
          class="bmv-intake-card__case-stage-item"
        >
          <dt class="bmv-intake-card__label">
            {{ t("customers.detail.bmvIntake.caseStage.postApprovalStage") }}
          </dt>
          <dd class="bmv-intake-card__timeline-value">
            {{ intakeCard.linkedCase.postApprovalStage }}
          </dd>
        </div>
        <div
          v-if="intakeCard.linkedCase.coeStatus"
          class="bmv-intake-card__case-stage-item"
        >
          <dt class="bmv-intake-card__label">
            {{ t("customers.detail.bmvIntake.caseStage.coeStatus") }}
          </dt>
          <dd class="bmv-intake-card__timeline-value">
            {{ intakeCard.linkedCase.coeStatus }}
          </dd>
        </div>
      </dl>
    </section>

    <section
      class="bmv-intake-card__section"
      v-if="intakeCard.reminders.length"
    >
      <h5 class="bmv-intake-card__section-title">
        {{ t("customers.detail.bmvIntake.reminders.title") }}
      </h5>
      <ul class="bmv-intake-card__reminder-list">
        <li
          v-for="reminder in intakeCard.reminders"
          :key="reminder.id"
          class="bmv-intake-card__reminder-item"
        >
          <span>{{ reminder.type }}</span>
          <span class="bmv-intake-card__quote-detail--muted">
            {{ reminder.dueAt }}
          </span>
          <Chip tone="warning">{{ reminder.status }}</Chip>
        </li>
      </ul>
    </section>

    <p v-if="intakeCard.note" class="bmv-intake-card__note">
      <span class="bmv-intake-card__label">
        {{ t("customers.detail.bmvIntake.note") }}
      </span>
      <span>{{ intakeCard.note }}</span>
    </p>

    <div
      v-if="intakeCard.canTransitionToCase"
      class="bmv-intake-card__transition"
    >
      <Button
        variant="filled"
        tone="primary"
        size="sm"
        pill
        @click="emit('transition-to-case')"
      >
        {{ t("customers.detail.bmvIntake.actions.transitionToCase") }}
      </Button>
    </div>
  </section>
</template>

<style scoped src="./customer-bmv-intake-card.css"></style>
