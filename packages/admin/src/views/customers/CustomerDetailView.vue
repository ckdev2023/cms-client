<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import Card from "../../shared/ui/Card.vue";
import CustomerDetailHeader from "./components/CustomerDetailHeader.vue";
import CustomerCaseSummaryStrip from "./components/CustomerCaseSummaryStrip.vue";
import CustomerBasicInfoTab from "./components/CustomerBasicInfoTab.vue";
import CustomerCasesTab from "./components/CustomerCasesTab.vue";
import CustomerContactsTab from "./components/CustomerContactsTab.vue";
import CustomerCommsTab from "./components/CustomerCommsTab.vue";
import CustomerLogsTab from "./components/CustomerLogsTab.vue";
import CustomerResumeCaseCreateBanner from "./components/CustomerResumeCaseCreateBanner.vue";
import CustomerResumeLeadCaseBanner from "./components/CustomerResumeLeadCaseBanner.vue";
import CustomerToast from "./components/CustomerToast.vue";
import { useCustomerCreateCaseGateModel } from "./model/useCustomerCreateCaseGateModel";
import { useCustomerDetailModel } from "./model/useCustomerDetailModel";
import { createCustomerRepository } from "./model/CustomerRepository";
import { useCustomerToast } from "./model/useCustomerToast";
import { buildCaseCreateRoute } from "../cases/query";
import type { CaseCreateQueryParams } from "../cases/query";
import { useResumeCaseCreateBanner } from "./model/useResumeCaseCreateBanner";
import { useResumeLeadCaseCreateBanner } from "./model/useResumeLeadCaseCreateBanner";
import { DETAIL_TABS, type CustomerBmvProfile, type DetailTab } from "./types";
import {
  resolveGroupLabel,
  resolveGroupValue,
} from "../../shared/model/groupOptions";
import Button from "../../shared/ui/Button.vue";

/** 客户详情页：组合头部、案件摘要条与 Tab 内容面板。 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const repository = createCustomerRepository();

const customerId = computed(() =>
  route.matched.at(-1)?.name === "customer-detail" &&
  typeof route.params.id === "string"
    ? route.params.id
    : "",
);

const {
  refreshResumeCaseCreateHash,
  showResumeCaseCreateBanner,
  continueResumeCaseCreate,
  dismissResumeCaseCreate,
} = useResumeCaseCreateBanner(customerId);

const {
  refreshResumeLeadCaseCreateHash,
  showResumeLeadCaseCreateBanner,
  continueResumeLeadCaseCreate,
  dismissResumeLeadCaseCreate,
} = useResumeLeadCaseCreateBanner(customerId);

const bmvEnabled = ref<boolean | undefined>(undefined);
const bmvFlagState = computed<"enabled" | "disabled" | undefined>(() => {
  if (bmvEnabled.value === undefined) return undefined;
  return bmvEnabled.value ? "enabled" : "disabled";
});

onMounted(async () => {
  refreshResumeCaseCreateHash();
  refreshResumeLeadCaseCreateHash();
  bmvEnabled.value = await repository.isBmvEnabled();
});

watch(customerId, () => {
  refreshResumeCaseCreateHash();
  refreshResumeLeadCaseCreateHash();
});

const routeTab = computed(() => {
  const tab = route.query.tab;
  return typeof tab === "string" ? tab : undefined;
});

/**
 * 切换客户详情 Tab，并同步更新路由查询参数。
 * @param tab - 目标详情 Tab。
 * @returns 无。
 */
function handleTabChange(tab: DetailTab): void {
  const query: Record<string, string | undefined> = {
    ...route.query,
    tab: tab === "basic" ? undefined : tab,
  };
  void router.replace({ query });
}

const {
  activeTab,
  customer,
  notFound,
  errorCode,
  avatarInitials,
  switchTab,
  retry,
} = useCustomerDetailModel({
  customerId,
  repository,
  routeTab,
  onTabChange: handleTabChange,
});
const { createCaseGate } = useCustomerCreateCaseGateModel({
  customer,
  bmvEnabled,
});
const customerToast = useCustomerToast();
const {
  visible: customerToastVisible,
  title: customerToastTitle,
  description: customerToastDescription,
} = customerToast;

const createCaseHint = computed(() => {
  const blockedReasonKey = createCaseGate.value.blockedReasonKey;
  return blockedReasonKey ? t(blockedReasonKey) : null;
});

/**
 * 当建案被门禁阻断时展示统一 toast，并返回是否已阻断。
 * @returns 是否已经阻断建案操作。
 */
function notifyCreateCaseBlocked(): boolean {
  const blockedReasonKey = createCaseGate.value.blockedReasonKey;
  if (!blockedReasonKey) return false;
  customerToast.show({
    title: t("customers.detail.actions.createCaseGate.blockedTitle"),
    description: t(blockedReasonKey),
  });
  return true;
}

/**
 * 提取 BMV 建案入口所需的四项前提状态查询参数。
 * @param profile - 客户的 BMV 档案；为空时返回空参数对象。
 * @returns 仅包含 BMV 状态字段的 query 参数片段。
 */
function buildBmvStatusQueryParams(
  profile: CustomerBmvProfile | null | undefined,
): Pick<
  CaseCreateQueryParams,
  | "bmvQuestionnaireStatus"
  | "bmvQuoteStatus"
  | "bmvSignStatus"
  | "bmvIntakeStatus"
> {
  return {
    bmvQuestionnaireStatus: profile?.questionnaireStatus ?? undefined,
    bmvQuoteStatus: profile?.quoteStatus ?? undefined,
    bmvSignStatus: profile?.signStatus ?? undefined,
    bmvIntakeStatus: profile?.intakeStatus ?? undefined,
  };
}

/**
 * 构建从客户详情跳转到建案页所需的默认参数。
 * @returns 建案参数；客户信息不完整时返回 `null`。
 */
function buildCustomerCreateParams(): CaseCreateQueryParams | null {
  const c = customer.value;
  if (!c?.id?.trim()) return null;
  const groupId = resolveGroupValue(c.group) ?? undefined;
  const profile = c.bmvProfile;
  return {
    customerId: c.id,
    customerName: c.displayName,
    customerKana: c.furigana,
    customerGroup: groupId,
    customerGroupLabel: resolveGroupLabel(
      c.group,
      t("shared.group.disabledSuffix"),
      locale.value,
    ),
    customerContact: [c.phone, c.email].filter(Boolean).join(" / "),
    ...buildBmvStatusQueryParams(profile),
  };
}

/**
 * 构造单客户建案入口参数；若满足 BMV 已签约门禁则显式附带 `templateId=bmv`。
 * @returns 单客户建案 query 参数；当前客户无效时返回 `null`。
 */
function buildSingleCreateParams(): CaseCreateQueryParams | null {
  const params = buildCustomerCreateParams();
  const profile = customer.value?.bmvProfile;
  if (!params || !profile) return params;
  if (
    profile.signStatus === "signed" &&
    profile.intakeStatus === "ready_for_case_creation"
  ) {
    return { ...params, templateId: "bmv" };
  }
  return params;
}

/** 跳转到案件新建页，并透传当前客户 ID 与默认值作为来源上下文。 */
function handleCreateCase() {
  if (notifyCreateCaseBlocked()) return;
  const params = buildSingleCreateParams();
  if (!params) return;
  void router.push(buildCaseCreateRoute(params));
}

/** BMV 承接卡片「转正式案件」——携带 templateCode=bmv + lead 继承字段跳转建案页。 */
function handleTransitionToCase() {
  const params = buildCustomerCreateParams();
  if (!params) return;
  const profile = customer.value?.bmvProfile;
  void router.push(
    buildCaseCreateRoute({
      ...params,
      templateCode: "bmv",
      sourceLeadId: profile?.sourceLeadId ?? undefined,
      ownerUserId: profile?.leadOwnerUserId ?? undefined,
      customerGroup: profile?.leadGroupId ?? params.customerGroup,
      ...(profile?.signStatus === "signed" ? { templateId: "bmv" } : {}),
    }),
  );
}

/** 跳转到家族批量建案场景，并透传当前客户 ID 与默认值。 */
function handleBatchCreateCase() {
  if (notifyCreateCaseBlocked()) return;
  const params = buildCustomerCreateParams();
  if (!params) return;
  void router.push(buildCaseCreateRoute(params, true));
}

const tabPlaceholder = computed(() => {
  const tabLabel = t(`customers.detail.tabs.${activeTab.value}`);
  return t("customers.detail.placeholderMessage", { tab: tabLabel });
});

const detailErrorState = computed(() => {
  switch (errorCode.value) {
    case "unauthorized":
      return {
        titleKey: "customers.detail.errorState.unauthorizedTitle",
        descriptionKey: "customers.detail.errorState.unauthorizedDescription",
      };
    case "requestFailed":
      return {
        titleKey: "customers.detail.errorState.requestFailedTitle",
        descriptionKey: "customers.detail.errorState.requestFailedDescription",
      };
    default:
      return null;
  }
});

/** 重新拉取客户详情，用于异常态重试。 */
function handleRetry(): void {
  void retry();
}
</script>

<template>
  <div class="customer-detail-view">
    <template v-if="customer">
      <CustomerResumeCaseCreateBanner
        :visible="showResumeCaseCreateBanner"
        @continue="continueResumeCaseCreate"
        @dismiss="dismissResumeCaseCreate"
      />
      <CustomerResumeLeadCaseBanner
        :visible="showResumeLeadCaseCreateBanner"
        @continue="continueResumeLeadCaseCreate"
        @dismiss="dismissResumeLeadCaseCreate"
      />

      <Card padding="lg">
        <CustomerDetailHeader
          :customer="customer"
          :avatar-initials="avatarInitials"
          :create-case-disabled="createCaseGate.single.disabled"
          :batch-create-case-disabled="createCaseGate.batch.disabled"
          :create-case-hint="createCaseHint"
          @create-case="handleCreateCase"
          @batch-create-case="handleBatchCreateCase"
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
          :repository="repository"
          :refresh-customer="retry"
          :bmv-enabled="bmvEnabled"
          :bmv-flag-state="bmvFlagState"
          @transition-to-case="handleTransitionToCase"
        />
        <CustomerCasesTab
          v-else-if="activeTab === 'cases'"
          :customer-id="customer.id"
          :customer-name="customer.displayName"
          :repository="repository"
        />
        <CustomerContactsTab
          v-else-if="activeTab === 'contacts'"
          :customer-id="customer.id"
          :repository="repository"
          :batch-create-case-disabled="createCaseGate.batch.disabled"
          :batch-create-case-hint="createCaseHint"
          :customer-defaults="buildCustomerCreateParams() ?? undefined"
        />
        <CustomerCommsTab
          v-else-if="activeTab === 'comms'"
          :customer-id="customer.id"
          :repository="repository"
        />
        <CustomerLogsTab
          v-else-if="activeTab === 'log'"
          :customer-id="customer.id"
          :repository="repository"
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

    <div v-else-if="detailErrorState" class="customer-detail-view__error-state">
      <p class="customer-detail-view__error-title">
        {{ t(detailErrorState.titleKey) }}
      </p>
      <p class="customer-detail-view__error-description">
        {{ t(detailErrorState.descriptionKey) }}
      </p>
      <div class="customer-detail-view__error-actions">
        <Button variant="filled" tone="primary" size="sm" @click="handleRetry">
          {{ t("customers.detail.errorState.retry") }}
        </Button>
        <a href="#/customers">{{
          t("customers.detail.errorState.backToList")
        }}</a>
      </div>
    </div>

    <CustomerToast
      :visible="customerToastVisible"
      :title="customerToastTitle"
      :description="customerToastDescription"
    />
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
  font-weight: var(--font-weight-bold);
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

.customer-detail-view__error-state {
  display: grid;
  justify-items: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-3);
}

.customer-detail-view__error-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.customer-detail-view__error-description {
  margin: 0;
  max-width: 520px;
}

.customer-detail-view__error-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.customer-detail-view__not-found a {
  color: var(--color-primary-6);
  text-decoration: none;
  font-weight: var(--font-weight-semibold);
}

.customer-detail-view__error-actions a {
  color: var(--color-primary-6);
  text-decoration: none;
  font-weight: var(--font-weight-semibold);
}

.customer-detail-view__not-found a:hover {
  text-decoration: underline;
}

.customer-detail-view__error-actions a:hover {
  text-decoration: underline;
}
</style>
