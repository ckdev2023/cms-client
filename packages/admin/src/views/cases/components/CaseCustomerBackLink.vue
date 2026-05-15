<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { buildCustomerDetailHrefFromCase } from "../query";

/** 客户回链：在案件概览中返回所属客户详情页。 */
const { t } = useI18n();

defineProps<{
  customerId: string;
  casePk: string;
  client: string;
  groupName?: string | null;
}>();
</script>

<template>
  <div class="customer-link" data-testid="overview-customer-back-link">
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
      <path
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
    <span class="customer-link__label">
      {{ t("cases.detail.overview.customerLabel") }}
    </span>
    <a
      :href="buildCustomerDetailHrefFromCase(customerId, casePk)"
      class="customer-link__href"
    >
      {{ client }}
    </a>
    <span v-if="groupName" class="customer-link__group">
      {{ groupName }}
    </span>
  </div>
</template>

<style scoped>
.customer-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--color-bg-2, #fafafa);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}
.customer-link__label {
  font-weight: var(--font-weight-semibold);
}
.customer-link__href {
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
  text-decoration: none;
}
.customer-link__href:hover {
  text-decoration: underline;
}
.customer-link__group {
  margin-left: auto;
  padding: 1px 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  color: var(--color-text-3);
}
</style>
