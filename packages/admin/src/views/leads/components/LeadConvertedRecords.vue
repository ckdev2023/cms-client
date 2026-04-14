<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { LeadConversionInfo } from "../types";

/** 已生成转化记录：展示已转客户/案件卡片及建档记录时间线。 */
const props = defineProps<{
  conversion: LeadConversionInfo;
}>();

const { t } = useI18n();

const hasConvertedCustomer = computed(
  () => props.conversion.convertedCustomer !== null,
);
const hasConvertedCase = computed(
  () => props.conversion.convertedCase !== null,
);
</script>

<template>
  <div class="converted-records">
    <h3 class="converted-records__title">
      {{ t("leads.detail.conversionTab.recordsTitle") }}
    </h3>
    <Card v-if="hasConvertedCustomer" padding="lg">
      <div class="converted-record">
        <div class="converted-record__icon converted-record__icon--customer">
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
        <div class="converted-record__info">
          <p class="converted-record__name">
            {{ conversion.convertedCustomer!.name }}
          </p>
          <p class="converted-record__meta">
            {{ conversion.convertedCustomer!.id }} ·
            {{ conversion.convertedCustomer!.group }} ·
            {{ conversion.convertedCustomer!.convertedAt }}
          </p>
        </div>
        <Button size="sm">
          {{ t("leads.detail.conversionTab.viewCustomer") }}
        </Button>
      </div>
    </Card>
    <Card v-if="hasConvertedCase" padding="lg">
      <div class="converted-record">
        <div class="converted-record__icon converted-record__icon--case">
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
        <div class="converted-record__info">
          <p class="converted-record__name">
            {{ conversion.convertedCase!.title }}
          </p>
          <p class="converted-record__meta">
            {{ conversion.convertedCase!.id }} ·
            {{ conversion.convertedCase!.type }} ·
            {{ conversion.convertedCase!.convertedAt }}
          </p>
        </div>
        <Button size="sm">
          {{ t("leads.detail.conversionTab.viewCase") }}
        </Button>
      </div>
    </Card>

    <div
      v-if="conversion.conversions.length"
      class="converted-records__history"
    >
      <h4 class="converted-records__history-title">
        {{ t("leads.detail.conversionTab.historyTitle") }}
      </h4>
      <div
        v-for="rec in conversion.conversions"
        :key="rec.id"
        class="history-item"
      >
        <Chip :tone="rec.type === 'customer' ? 'success' : 'primary'" size="sm">
          {{
            rec.type === "customer"
              ? t("leads.detail.conversionTab.typeCustomer")
              : t("leads.detail.conversionTab.typeCase")
          }}
        </Chip>
        <span class="history-item__label">{{ rec.label }}</span>
        <span class="history-item__meta">
          {{ rec.time }} · {{ rec.operator }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.converted-records {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.converted-records__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.converted-record {
  display: flex;
  align-items: center;
  gap: 12px;
}

.converted-record__icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.converted-record__icon--customer {
  background-color: rgba(22, 163, 74, 0.1);
  color: var(--color-success);
}

.converted-record__icon--case {
  background-color: rgba(3, 105, 161, 0.1);
  color: var(--color-primary-6);
}

.converted-record__info {
  flex: 1;
  min-width: 0;
}

.converted-record__name {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.converted-record__meta {
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.converted-records__history {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.converted-records__history-title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.history-item__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.history-item__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
