<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import LeadConvertedRecords from "./LeadConvertedRecords.vue";
import type { LeadConversionInfo, HeaderButtonStates } from "../types";

/** 转化信息 Tab：去重面板、转化操作卡片与已生成记录。 */
const props = defineProps<{
  conversion: LeadConversionInfo;
  buttonStates: HeaderButtonStates;
  readonly: boolean;
}>();

defineEmits<{
  convertCustomer: [];
  convertCase: [];
}>();

const { t } = useI18n();

const hasDedup = computed(() => props.conversion.dedupResult !== null);
const dedupIsLead = computed(
  () => props.conversion.dedupResult?.type === "lead",
);
const hasConvertedCustomer = computed(
  () => props.conversion.convertedCustomer !== null,
);
const hasConvertedCase = computed(
  () => props.conversion.convertedCase !== null,
);
const hasConversions = computed(() => props.conversion.conversions.length > 0);
const showActionCards = computed(
  () =>
    !hasConvertedCustomer.value && !hasConvertedCase.value && !props.readonly,
);
</script>

<template>
  <div class="conversion-tab">
    <Card padding="lg">
      <div v-if="!hasDedup" class="dedup-clean">
        <svg
          class="dedup-clean__icon"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span class="dedup-clean__text">
          {{ t("leads.detail.conversionTab.dedupClean") }}
        </span>
      </div>
      <div v-else class="dedup-hit">
        <div class="dedup-hit__header">
          <svg
            class="dedup-hit__warn-icon"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <p class="dedup-hit__title">
              {{ t("leads.detail.conversionTab.dedupTitle") }}
            </p>
            <p class="dedup-hit__message">
              {{ conversion.dedupResult!.message }}
            </p>
          </div>
        </div>
        <div class="dedup-hit__match">
          <template v-if="dedupIsLead">
            <p class="dedup-hit__match-name">
              {{ (conversion.dedupResult!.matchedRecord as any).name }}
            </p>
            <p class="dedup-hit__match-meta">
              {{ (conversion.dedupResult!.matchedRecord as any).id }} ·
              {{ (conversion.dedupResult!.matchedRecord as any).group }} ·
              {{ (conversion.dedupResult!.matchedRecord as any).statusLabel }}
            </p>
          </template>
          <template v-else>
            <p class="dedup-hit__match-name">
              {{ (conversion.dedupResult!.matchedRecord as any).name }}
            </p>
            <p class="dedup-hit__match-meta">
              {{ (conversion.dedupResult!.matchedRecord as any).id }} ·
              {{ (conversion.dedupResult!.matchedRecord as any).group }} ·
              {{ (conversion.dedupResult!.matchedRecord as any).summary }}
            </p>
          </template>
        </div>
        <Chip
          v-if="conversion.dedupResult!.userAction"
          tone="warning"
          size="sm"
        >
          {{ t("leads.detail.conversionTab.dedupConfirmed") }}
        </Chip>
      </div>
    </Card>

    <div v-if="showActionCards" class="conversion-tab__actions">
      <Card padding="lg">
        <div class="conversion-action">
          <div class="conversion-action__header">
            <div class="conversion-action__icon conversion-action__icon--case">
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <p class="conversion-action__title">
                {{ t("leads.detail.conversionTab.convertCaseTitle") }}
              </p>
              <p class="conversion-action__desc">
                {{ t("leads.detail.conversionTab.convertCaseDesc") }}
              </p>
            </div>
          </div>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="
              buttonStates.convertCase === 'disabled' ||
              buttonStates.convertCase === 'hidden'
            "
            @click="$emit('convertCase')"
          >
            {{ t("leads.detail.conversionTab.convertCaseTitle") }}
          </Button>
        </div>
      </Card>
      <Card padding="lg">
        <div class="conversion-action">
          <div class="conversion-action__header">
            <div
              class="conversion-action__icon conversion-action__icon--customer"
            >
              <svg
                width="20"
                height="20"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <p class="conversion-action__title">
                {{ t("leads.detail.conversionTab.convertCustomerTitle") }}
              </p>
              <p class="conversion-action__desc">
                {{ t("leads.detail.conversionTab.convertCustomerDesc") }}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            :disabled="
              buttonStates.convertCustomer === 'disabled' ||
              buttonStates.convertCustomer === 'hidden'
            "
            @click="$emit('convertCustomer')"
          >
            {{ t("leads.detail.conversionTab.convertCustomerTitle") }}
          </Button>
        </div>
      </Card>
    </div>

    <LeadConvertedRecords v-if="hasConversions" :conversion="conversion" />
  </div>
</template>

<style scoped>
.conversion-tab {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dedup-clean {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.dedup-clean__icon {
  color: var(--color-success);
  flex-shrink: 0;
}

.dedup-hit {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dedup-hit__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.dedup-hit__warn-icon {
  color: #d97706;
  flex-shrink: 0;
  margin-top: 2px;
}

.dedup-hit__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #92400e;
}

.dedup-hit__message {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: #92400e;
}

.dedup-hit__match {
  padding: 12px;
  border-radius: var(--radius-default, 10px);
  border: 1px solid #fde68a;
  background: var(--color-bg-1);
}

.dedup-hit__match-name {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.dedup-hit__match-meta {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.conversion-tab__actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .conversion-tab__actions {
    grid-template-columns: 1fr 1fr;
  }
}

.conversion-action {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conversion-action__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.conversion-action__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.conversion-action__icon--case {
  background-color: rgba(3, 105, 161, 0.1);
  color: var(--color-primary-6);
}

.conversion-action__icon--customer {
  background-color: rgba(22, 163, 74, 0.1);
  color: var(--color-success);
}

.conversion-action__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.conversion-action__desc {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
