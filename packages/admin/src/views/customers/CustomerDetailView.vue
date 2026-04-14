<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Card from "../../shared/ui/Card.vue";
import CustomerDetailHeader from "./components/CustomerDetailHeader.vue";
import CustomerCaseSummaryStrip from "./components/CustomerCaseSummaryStrip.vue";
import CustomerBasicInfoTab from "./components/CustomerBasicInfoTab.vue";
import CustomerCasesTab from "./components/CustomerCasesTab.vue";
import CustomerContactsTab from "./components/CustomerContactsTab.vue";
import CustomerCommsTab from "./components/CustomerCommsTab.vue";
import CustomerLogsTab from "./components/CustomerLogsTab.vue";
import { useCustomerDetailModel } from "./model/useCustomerDetailModel";
import { DETAIL_TABS } from "./types";

/** 客户详情页：组合头部、案件摘要条与 Tab 内容面板。 */
const { t } = useI18n();
const route = useRoute();

const customerId = computed(() => route.params.id as string);
const { activeTab, customer, notFound, avatarInitials, switchTab } =
  useCustomerDetailModel(customerId);

const tabPlaceholder = computed(() => {
  const tabLabel = t(`customers.detail.tabs.${activeTab.value}`);
  return t("customers.detail.placeholderMessage", { tab: tabLabel });
});
</script>

<template>
  <div class="customer-detail-view">
    <template v-if="customer">
      <Card padding="lg">
        <CustomerDetailHeader
          :customer="customer"
          :avatar-initials="avatarInitials"
          @create-case="() => {}"
          @batch-create-case="() => {}"
        />
      </Card>

      <Card padding="lg">
        <CustomerCaseSummaryStrip :customer="customer" />
      </Card>

      <div
        class="customer-detail-view__tabs"
        role="tablist"
        :aria-label="t('customers.detail.tabsLabel')"
      >
        <button
          v-for="tab in DETAIL_TABS"
          :key="tab"
          type="button"
          role="tab"
          :id="`customerTab-${tab}`"
          :aria-controls="`customerPanel-${tab}`"
          :class="['customer-detail-view__tab', { active: activeTab === tab }]"
          :aria-selected="activeTab === tab"
          @click="switchTab(tab)"
        >
          {{ t(`customers.detail.tabs.${tab}`) }}
        </button>
      </div>

      <section
        class="customer-detail-view__panel"
        role="tabpanel"
        :id="`customerPanel-${activeTab}`"
        :aria-labelledby="`customerTab-${activeTab}`"
      >
        <CustomerBasicInfoTab
          v-if="activeTab === 'basic'"
          :customer="customer"
        />
        <CustomerCasesTab
          v-else-if="activeTab === 'cases'"
          :customer-id="customer.id"
        />
        <CustomerContactsTab
          v-else-if="activeTab === 'contacts'"
          :customer-id="customer.id"
        />
        <CustomerCommsTab
          v-else-if="activeTab === 'comms'"
          :customer-id="customer.id"
        />
        <CustomerLogsTab
          v-else-if="activeTab === 'log'"
          :customer-id="customer.id"
        />
        <p v-else class="customer-detail-view__placeholder">
          {{ tabPlaceholder }}
        </p>
      </section>
    </template>

    <div v-else-if="notFound" class="customer-detail-view__not-found">
      <p>{{ t("customers.detail.notFound") }}</p>
      <a href="#/customers">{{ t("shell.nav.items.customers") }}</a>
    </div>
  </div>
</template>

<style scoped>
.customer-detail-view {
  display: grid;
  gap: 20px;
}

.customer-detail-view__tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border-1);
  overflow-x: auto;
}

.customer-detail-view__tab {
  padding: 10px 20px;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.customer-detail-view__tab:hover {
  color: var(--color-text-1);
}

.customer-detail-view__tab.active {
  color: var(--color-primary-6);
  border-bottom-color: var(--color-primary-6);
  font-weight: var(--font-weight-black);
}

.customer-detail-view__panel {
  display: grid;
  gap: 16px;
}

.customer-detail-view__placeholder {
  margin: 0;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-3);
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-lg, 16px);
}

.customer-detail-view__not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-3);
}

.customer-detail-view__not-found a {
  color: var(--color-primary-6);
  text-decoration: none;
  font-weight: var(--font-weight-semibold);
}

.customer-detail-view__not-found a:hover {
  text-decoration: underline;
}
</style>
