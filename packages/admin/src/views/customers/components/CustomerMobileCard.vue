<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CustomerSummary } from "../types";
import ResponsiveTableRow from "../../../shared/ui/ResponsiveTableRow.vue";

/** 客户行移动端卡片。 */
defineProps<{
  customer: CustomerSummary;
  highlighted?: boolean;
}>();

const { t } = useI18n();
</script>

<template>
  <ResponsiveTableRow :highlighted="highlighted">
    <template #header>
      <div class="cust-card__identity">
        <div class="cust-card__avatar">
          {{ customer.displayName?.charAt(0) || "?" }}
        </div>
        <div class="cust-card__info">
          <a class="cust-card__name" :href="`#/customers/${customer.id}`">
            {{ customer.displayName }}
          </a>
          <span
            v-if="customer.phone || customer.email"
            class="cust-card__contact"
          >
            {{ [customer.phone, customer.email].filter(Boolean).join(" · ") }}
          </span>
        </div>
      </div>
    </template>
    <div class="cust-card__cases">
      {{
        t("customers.list.casesSummary", {
          total: customer.totalCases,
          active: customer.activeCases,
        })
      }}
    </div>
    <template #actions>
      <a class="cust-card__action-link" :href="`#/customers/${customer.id}`">
        {{ t("customers.list.actions.viewDetail") }}
      </a>
    </template>
  </ResponsiveTableRow>
</template>

<style scoped>
.cust-card__identity {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cust-card__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary-6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}
.cust-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.cust-card__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  text-decoration: none;
  font-size: var(--font-size-base);
}
.cust-card__name:hover {
  color: var(--color-primary-6);
}
.cust-card__contact {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cust-card__cases {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
}
.cust-card__action-link {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
}
.cust-card__action-link:hover {
  text-decoration: underline;
}
</style>
