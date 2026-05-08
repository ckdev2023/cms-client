<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "../../shared/model/useToast";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import { getGroupOptions } from "../../shared/model/useGroupOptions";
import { getActiveUserOptions } from "../../shared/model/useOrgUserOptions";
import CaseSummaryCards from "./components/CaseSummaryCards.vue";
import CaseFilters from "./components/CaseFilters.vue";
import CaseTable from "./components/CaseTable.vue";
import CasePagination from "./components/CasePagination.vue";
import { createCaseRepository } from "./model/CaseRepository";
import { useCaseListModel } from "./model/useCaseListModel";
import { buildCaseCreateRoute } from "./query";

/** 案件列表页：装配筛选、摘要卡片、表格等子模块。 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const toast = useToast();

const repository = createCaseRepository();
const ownerOptions = computed<import("./types").CaseOwnerOption[]>(() =>
  getActiveUserOptions().map((u) => ({
    ...u,
    initials: u.label.slice(0, 2),
    avatarClass: "bg-gray-200",
    group: null,
  })),
);
const groupOptions = computed(() => getGroupOptions("filter", locale.value));

const {
  filters,
  customerId,
  filteredCases,
  total,
  page,
  pageSize,
  totalPages,
  loading,
  error,
  customerLabel,
  summaryCards,
  setPage,
  refetch,
  ...actions
} = useCaseListModel({
  repository,
  routeQuery: computed(() => route.query),
  replaceQuery: (query) =>
    router.replace({
      path: route.path,
      query: query as Record<string, string>,
    }),
  onInvalidStage: (raw) => {
    toast.add({
      title: t("cases.list.invalidStageWarning", { value: raw }),
      tone: "warning",
    });
  },
});

const paginationStart = computed(() => {
  if (total.value === 0) return 0;
  return (page.value - 1) * pageSize + 1;
});

const paginationEnd = computed(() => {
  if (total.value === 0) return 0;
  return Math.min(page.value * pageSize, total.value);
});
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
          @click="$router.push(buildCaseCreateRoute({}))"
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
      :filtered-count="total"
      :owner-options="ownerOptions"
      :group-options="groupOptions"
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

    <!-- Error state -->
    <div v-if="error" class="case-list-view__error" role="alert">
      <p class="case-list-view__error-text">{{ t("cases.list.error") }}</p>
      <Button variant="outlined" size="sm" @click="refetch">
        {{ t("cases.list.retry") }}
      </Button>
    </div>

    <div class="case-list-view__table-card">
      <!-- Loading overlay -->
      <div v-if="loading" class="case-list-view__loading" aria-live="polite">
        <div class="case-list-view__spinner" aria-hidden="true" />
        <span class="case-list-view__loading-text">{{
          t("cases.list.loading")
        }}</span>
      </div>

      <template v-else-if="!error">
        <CaseTable :cases="filteredCases" />

        <CasePagination
          v-if="total > 0"
          :page="page"
          :total-pages="totalPages"
          :start="paginationStart"
          :end="paginationEnd"
          :total="total"
          @prev="setPage(page - 1)"
          @next="setPage(page + 1)"
        />
      </template>
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
  min-height: 200px;
}

.case-list-view__error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-danger-bg, #fef2f2);
  border: 1px solid var(--color-danger-border, #fecaca);
  border-radius: var(--radius-xl);
}

.case-list-view__error-text {
  margin: 0;
  flex: 1;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-danger-text);
}

.case-list-view__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 64px 24px;
}

.case-list-view__spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border-1);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: case-list-spin 0.8s linear infinite;
}

@keyframes case-list-spin {
  to {
    transform: rotate(360deg);
  }
}

.case-list-view__loading-text {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}
</style>
