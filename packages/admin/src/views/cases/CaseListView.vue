<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import CaseSummaryCards from "./components/CaseSummaryCards.vue";
import CaseFilters from "./components/CaseFilters.vue";
import CaseTable from "./components/CaseTable.vue";
import { SAMPLE_CASE_LIST, deriveCaseSummaryCards } from "./fixtures";
import { useCaseListModel } from "./model/useCaseListModel";

/** 案件列表页：装配筛选、摘要卡片、表格等子模块。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const { filters, customerId, filteredCases, customerLabel, ...actions } =
  useCaseListModel({
    allCases: () => SAMPLE_CASE_LIST,
    routeQuery: computed(() => route.query),
    replaceQuery: (query) =>
      router.replace({
        path: route.path,
        query: query as Record<string, string>,
      }),
  });

const summaryCards = computed(() =>
  deriveCaseSummaryCards(filteredCases.value),
);
</script>

<template>
  <div class="case-list-view">
    <PageHeader
      :title="t('shell.nav.items.cases')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('shell.nav.items.cases') },
      ]"
    >
      <template #actions>
        <Button
          variant="filled"
          tone="primary"
          @click="$router.push('/cases/create')"
        >
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
            <path d="M12 4v16m8-8H4" />
          </svg>
          {{ t("shell.topbar.createCase") }}
        </Button>
      </template>
    </PageHeader>

    <CaseSummaryCards :cards="summaryCards" />

    <CaseFilters
      :scope="filters.scope"
      :search="filters.search"
      :stage="filters.stage"
      :owner="filters.owner"
      :group="filters.group"
      :risk="filters.risk"
      :validation="filters.validation"
      :filtered-count="filteredCases.length"
      :customer-id="customerId"
      :customer-label="customerLabel"
      @update:scope="actions.setScope"
      @update:search="actions.setSearch"
      @update:stage="actions.setStage"
      @update:owner="actions.setOwner"
      @update:group="actions.setGroup"
      @update:risk="actions.setRisk"
      @update:validation="actions.setValidation"
      @clear-customer="actions.clearCustomerId"
      @reset-filters="actions.resetFilters"
    />

    <div class="case-list-view__table-card">
      <CaseTable :cases="filteredCases" />
    </div>
  </div>
</template>

<style scoped>
.case-list-view {
  display: grid;
  gap: 24px;
}

.case-list-view__table-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
</style>
