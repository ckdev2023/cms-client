<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import SegmentedControl, {
  type SegmentOption,
} from "../../../shared/ui/SegmentedControl.vue";
import type { CommFilter, CustomerComm } from "../types";
import { getCommChannelLabel } from "../types";
import { useCustomerCommsModel } from "../model/useCustomerCommsModel";

/** 沟通记录 Tab：展示按可见范围筛选的沟通时间线，保留"记录沟通"入口占位。 */
const props = defineProps<{
  customerId: string;
}>();

const { t } = useI18n();

const customerIdRef = computed(() => props.customerId);
const {
  commFilter,
  filteredComms,
  totalCount,
  internalCount,
  customerCount,
  setCommFilter,
} = useCustomerCommsModel(customerIdRef);

const segmentOptions = computed<SegmentOption<CommFilter>[]>(() => [
  { value: "all", label: t("customers.detail.commsTab.filterAll") },
  { value: "internal", label: t("customers.detail.commsTab.filterInternal") },
  { value: "customer", label: t("customers.detail.commsTab.filterCustomer") },
]);

/**
 * 根据可见范围返回 Chip 色调。
 *
 * @param c 沟通记录
 * @returns Chip 色调
 */
function visibilityTone(c: CustomerComm) {
  return c.visibility === "customer"
    ? ("primary" as const)
    : ("neutral" as const);
}

/**
 * 根据可见范围返回显示文案。
 *
 * @param c 沟通记录
 * @returns 可见范围标签
 */
function visibilityLabel(c: CustomerComm) {
  return c.visibility === "customer"
    ? t("customers.detail.commsTab.visCustomer")
    : t("customers.detail.commsTab.visInternal");
}

/**
 * 格式化 ISO 日期时间为可读格式。
 *
 * @param iso ISO 格式字符串
 * @returns 格式化后的日期时间
 */
function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return iso.replace("T", " ");
}
</script>

<template>
  <Card padding="lg">
    <div class="comms-tab">
      <div class="comms-tab__header">
        <div>
          <h3 class="comms-tab__title">
            {{ t("customers.detail.commsTab.title") }}
          </h3>
          <div class="comms-tab__stats">
            <Chip size="sm">
              {{ t("customers.detail.commsTab.total", { count: totalCount }) }}
            </Chip>
            <Chip size="sm">
              {{
                t("customers.detail.commsTab.internalCount", {
                  count: internalCount,
                })
              }}
            </Chip>
            <Chip size="sm" tone="primary">
              {{
                t("customers.detail.commsTab.customerCount", {
                  count: customerCount,
                })
              }}
            </Chip>
          </div>
        </div>
        <div class="comms-tab__actions">
          <SegmentedControl
            :model-value="commFilter"
            :options="segmentOptions"
            :aria-label="t('customers.detail.commsTab.filterLabel')"
            @update:model-value="setCommFilter"
          />
          <Button variant="filled" tone="primary" size="sm" disabled>
            {{ t("customers.detail.commsTab.addComm") }}
          </Button>
        </div>
      </div>

      <div v-if="filteredComms.length" class="comms-tab__timeline">
        <div class="comms-tab__axis" aria-hidden="true" />
        <article v-for="c in filteredComms" :key="c.id" class="comms-tab__item">
          <div class="comms-tab__item-header">
            <span class="comms-tab__item-summary">{{ c.summary }}</span>
            <div class="comms-tab__item-meta">
              <Chip size="sm">{{ getCommChannelLabel(c.type) }}</Chip>
              <Chip size="sm" :tone="visibilityTone(c)">
                {{ visibilityLabel(c) }}
              </Chip>
            </div>
          </div>
          <p v-if="c.detail" class="comms-tab__item-detail">{{ c.detail }}</p>
          <p v-if="c.nextAction" class="comms-tab__item-next">
            {{ t("customers.detail.commsTab.nextAction") }}{{ c.nextAction }}
          </p>
          <div class="comms-tab__item-footer">
            <span class="comms-tab__item-actor">{{ c.actor }}</span>
            <span class="comms-tab__item-time">
              {{ formatDateTime(c.occurredAt) }}
            </span>
          </div>
        </article>
      </div>

      <div v-else class="comms-tab__empty">
        <div class="comms-tab__empty-icon" aria-hidden="true">
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p class="comms-tab__empty-title">
          {{ t("customers.detail.commsTab.emptyTitle") }}
        </p>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.comms-tab {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.comms-tab__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.comms-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.comms-tab__stats {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.comms-tab__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.comms-tab__timeline {
  margin-top: 16px;
  position: relative;
  padding-left: 24px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  padding-top: 16px;
  padding-bottom: 16px;
  padding-right: 16px;
  background: var(--color-bg-2);
}

.comms-tab__axis {
  position: absolute;
  left: 10px;
  top: 16px;
  bottom: 16px;
  width: 1px;
  background: var(--color-border-1);
}

.comms-tab__item {
  position: relative;
  padding: 12px 0;
}

.comms-tab__item::before {
  content: "";
  position: absolute;
  left: -18px;
  top: 20px;
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--color-primary-6);
  border: 2px solid var(--color-bg-2);
}

.comms-tab__item + .comms-tab__item {
  border-top: 1px solid var(--color-border-1);
}

.comms-tab__item-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}

.comms-tab__item-summary {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.comms-tab__item-meta {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.comms-tab__item-detail {
  margin: 8px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  font-weight: var(--font-weight-semibold);
  line-height: 1.6;
}

.comms-tab__item-next {
  margin: 6px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-primary-6);
  font-weight: var(--font-weight-bold);
}

.comms-tab__item-footer {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.comms-tab__item-actor {
  font-weight: var(--font-weight-bold);
}

.comms-tab__empty {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  background: var(--color-bg-2);
}

.comms-tab__empty-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
}

.comms-tab__empty-title {
  margin: 16px 0 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
</style>
