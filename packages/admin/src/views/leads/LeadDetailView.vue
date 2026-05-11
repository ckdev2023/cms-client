<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter, type LocationQuery } from "vue-router";
import Card from "../../shared/ui/Card.vue";
import Button from "../../shared/ui/Button.vue";
import LeadDetailHeader from "./components/LeadDetailHeader.vue";
import LeadBannerStrip from "./components/LeadBannerStrip.vue";
import LeadInfoTab from "./components/LeadInfoTab.vue";
import LeadFollowupsTab from "./components/LeadFollowupsTab.vue";
import LeadConversionTab from "./components/LeadConversionTab.vue";
import LeadLogTab from "./components/LeadLogTab.vue";
import LeadConvertCustomerDialog from "./components/LeadConvertCustomerDialog.vue";
import LeadConvertCaseDialog from "./components/LeadConvertCaseDialog.vue";
import LeadEditInfoDialog from "./components/LeadEditInfoDialog.vue";
import LeadChangeStatusDialog from "./components/LeadChangeStatusDialog.vue";
import LeadMarkLostDialog from "./components/LeadMarkLostDialog.vue";
import LeadConversationsTab from "./components/LeadConversationsTab.vue";
import {
  useLeadDetailModel,
  type LeadConvertCaseFailure,
} from "./model/useLeadDetailModel";
import { useLeadCatalogOptions } from "./model/useLeadCatalogOptions";
import { useLeadHeaderDialogs } from "./model/useLeadHeaderDialogs";
import { useLeadHeaderNavigation } from "./model/useLeadHeaderNavigation";
import { useCurrentUserId } from "../../auth/model/adminSession";
import { LEAD_DETAIL_TABS } from "./types";
import { useToast } from "../../shared/model/useToast";
import type {
  LeadConvertCustomerInput,
  LeadConvertCaseInput,
} from "./model/LeadAdapter";

/** 线索详情页：组合头部、Banner、Tab 栏与四个内容面板。 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const currentUserId = useCurrentUserId();

const leadId = computed(() => route.params.id as string);
const routeQuery = computed(() => route.query);

/**
 * 合并更新当前线索详情页的路由查询参数；`undefined` 表示移除该键。
 *
 * @param patch - 局部 query 覆盖
 */
function replaceLeadDetailQuery(
  patch: Record<string, string | undefined>,
): void {
  const next: LocationQuery = { ...route.query };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) delete next[k];
    else next[k] = v;
  }
  void router.replace({ query: next });
}

const {
  activeTab,
  lead,
  notFound,
  isReadonly,
  banner,
  buttonStates,
  avatarInitials,
  loading,
  switchTab,
  followupForm,
  canSubmitFollowup,
  submitFollowup,
  resetFollowupForm,
  logCategory,
  filteredLog,
  setLogCategory,
  convertDedupResult,
  showConvertDedupPrompt,
  convertSubmitting,
  convertCustomer,
  convertCase,
  confirmConvertDedup,
  dismissConvertDedup,
  submitting: followupSubmitting,
  updateSubmitting,
  transitionSubmitting,
  markLostSubmitting,
  updateLead,
  transitionStatus,
  markLost,
} = useLeadDetailModel(leadId, {
  routeQuery,
  replaceQuery: replaceLeadDetailQuery,
});

const { apiOwnerOptions, apiGroupOptions } = useLeadCatalogOptions(locale);

const showConvertCustomerDialog = ref(false);
const showConvertCaseDialog = ref(false);
const convertCaseError = ref<LeadConvertCaseFailure | null>(null);
const toast = tryUseToast();

const {
  showEditInfoDialog,
  editInfoError,
  openEditInfoDialog,
  closeEditInfoDialog,
  handleEditInfoConfirm,
  showChangeStatusDialog,
  changeStatusError,
  openChangeStatusDialog,
  closeChangeStatusDialog,
  handleChangeStatusConfirm,
  showMarkLostDialog,
  markLostError,
  openMarkLostDialog,
  closeMarkLostDialog,
  handleMarkLostConfirm,
} = useLeadHeaderDialogs({ t, toast, updateLead, transitionStatus, markLost });

/** 打开转客户弹窗 */
function openConvertCustomerDialog(): void {
  showConvertCustomerDialog.value = true;
}

/** 打开转案件弹窗 */
function openConvertCaseDialog(): void {
  convertCaseError.value = null;
  showConvertCaseDialog.value = true;
}

async function handleSubmitFollowup(): Promise<void> {
  const ready = canSubmitFollowup.value;
  const result = await submitFollowup();
  if (!ready) return;
  if (result === null) {
    toast?.add({
      title: t("leads.detail.followupsTab.submitFailedTitle"),
      description: t("leads.detail.followupsTab.submitFailedDesc"),
      tone: "error",
    });
  }
}

watch(
  () => [route.query.resumeConvert, route.query.tab, lead.value?.id] as const,
  () => {
    if (!lead.value) return;
    if (route.query.resumeConvert !== "1") return;
    if (route.query.tab !== "conversion") return;
    openConvertCaseDialog();
    replaceLeadDetailQuery({ resumeConvert: undefined });
  },
  { immediate: true },
);

const { handleViewCustomer, handleViewCase } = useLeadHeaderNavigation({
  lead,
  router,
});

/** 关闭转案件弹窗并清空遗留的错误状态 */
function closeConvertCaseDialog(): void {
  showConvertCaseDialog.value = false;
  convertCaseError.value = null;
}

async function handleConvertCustomerConfirm(
  input: LeadConvertCustomerInput,
): Promise<void> {
  showConvertCustomerDialog.value = false;
  await convertCustomer(input);
}

async function handleConvertCaseConfirm(
  input: LeadConvertCaseInput,
): Promise<void> {
  convertCaseError.value = null;
  const failure = await convertCase(input);
  if (failure === null) {
    showConvertCaseDialog.value = false;
    return;
  }
  convertCaseError.value = failure;
  if (failure.kind === "generic") {
    toast?.add({
      title: t("leads.errors.convertCaseFailedToast.title"),
      description: t(failure.messageKey),
      tone: "error",
    });
  }
}

/**
 * 安全获取全局 Toast 控制器。在测试或未初始化场景下静默返回 null，
 * 避免线索详情视图在缺少 toast 单例时崩溃。
 *
 * @returns Toast 控制器实例，单例未初始化时返回 null
 */
function tryUseToast() {
  try {
    return useToast();
  } catch {
    return null;
  }
}
</script>

<template>
  <div class="lead-detail-view">
    <template v-if="lead">
      <Card padding="lg">
        <LeadDetailHeader
          :lead="lead"
          :avatar-initials="avatarInitials"
          :button-states="buttonStates"
          @convert-customer="openConvertCustomerDialog"
          @convert-case="openConvertCaseDialog"
          @view-customer="handleViewCustomer"
          @view-case="handleViewCase"
          @mark-lost="openMarkLostDialog"
          @edit-info="openEditInfoDialog"
          @change-status="openChangeStatusDialog"
        />
      </Card>

      <LeadBannerStrip
        v-if="banner"
        :banner="banner"
        :convert-case-state="buttonStates.convertCase"
        @convert-case="openConvertCaseDialog"
      />

      <div
        class="lead-detail-view__tabs"
        role="tablist"
        :aria-label="t('leads.detail.tabsLabel')"
      >
        <button
          v-for="tab in LEAD_DETAIL_TABS"
          :key="tab"
          type="button"
          role="tab"
          :id="`leadTab-${tab}`"
          :aria-controls="`leadPanel-${tab}`"
          :class="['lead-detail-view__tab', { active: activeTab === tab }]"
          :aria-selected="activeTab === tab"
          @click="switchTab(tab)"
        >
          {{ t(`leads.detail.tabs.${tab}`) }}
        </button>
      </div>

      <section
        class="lead-detail-view__panel"
        role="tabpanel"
        :id="`leadPanel-${activeTab}`"
        :aria-labelledby="`leadTab-${activeTab}`"
      >
        <LeadInfoTab
          v-if="activeTab === 'info'"
          :info="lead.info"
          :owner-id="lead.ownerId"
          :readonly="isReadonly"
        />
        <LeadFollowupsTab
          v-else-if="activeTab === 'followups'"
          :followups="lead.followups"
          :followup-form="followupForm"
          :can-submit-followup="canSubmitFollowup"
          :submitting="followupSubmitting"
          :readonly="isReadonly"
          @submit-followup="handleSubmitFollowup"
          @reset-followup="resetFollowupForm"
        />
        <LeadConversationsTab
          v-else-if="activeTab === 'conversations'"
          :lead-id="lead.id"
        />
        <LeadConversionTab
          v-else-if="activeTab === 'conversion'"
          :conversion="lead.conversion"
          :button-states="buttonStates"
          :readonly="isReadonly"
          @convert-customer="openConvertCustomerDialog"
          @convert-case="openConvertCaseDialog"
          @view-customer="handleViewCustomer"
          @view-case="handleViewCase"
        />
        <LeadLogTab
          v-else-if="activeTab === 'log'"
          :log="lead.log"
          :log-category="logCategory"
          :filtered-log="filteredLog"
          @set-log-category="setLogCategory"
        />
      </section>
    </template>

    <div v-else-if="loading" class="lead-detail-view__loading">
      <p>{{ t("shared.loading") }}</p>
    </div>

    <div v-else-if="notFound" class="lead-detail-view__not-found">
      <p>{{ t("leads.detail.notFound") }}</p>
      <a href="#/leads">{{ t("leads.detail.backToList") }}</a>
    </div>
  </div>

  <LeadConvertCustomerDialog
    v-if="showConvertCustomerDialog && lead"
    :default-locale="lead.info.language || 'zh'"
    :submitting="convertSubmitting"
    @confirm="handleConvertCustomerConfirm"
    @close="showConvertCustomerDialog = false"
  />

  <LeadConvertCaseDialog
    v-if="showConvertCaseDialog && lead"
    :lead-id="lead.id"
    :intended-case-type="lead.intendedCaseType"
    :owner-user-id="lead.ownerId || currentUserId || ''"
    :group-id="lead.groupId"
    :converted-customer-id="lead.conversion.convertedCustomer?.id"
    :submitting="convertSubmitting"
    :error="convertCaseError"
    @confirm="handleConvertCaseConfirm"
    @clear-error="convertCaseError = null"
    @close="closeConvertCaseDialog"
  />

  <LeadEditInfoDialog
    v-if="showEditInfoDialog && lead"
    :lead="lead"
    :owner-options="apiOwnerOptions"
    :group-options="apiGroupOptions"
    :submitting="updateSubmitting"
    :error="editInfoError"
    @confirm="handleEditInfoConfirm"
    @close="closeEditInfoDialog"
  />

  <LeadChangeStatusDialog
    v-if="showChangeStatusDialog && lead"
    :current-status="lead.status"
    :submitting="transitionSubmitting"
    :error="changeStatusError"
    @confirm="handleChangeStatusConfirm"
    @close="closeChangeStatusDialog"
  />

  <LeadMarkLostDialog
    v-if="showMarkLostDialog && lead"
    :submitting="markLostSubmitting"
    :error="markLostError"
    @confirm="handleMarkLostConfirm"
    @close="closeMarkLostDialog"
  />

  <Teleport to="body">
    <div
      v-if="showConvertDedupPrompt && convertDedupResult"
      class="lead-detail-view__dedup-backdrop"
      @click.self="dismissConvertDedup"
    >
      <div class="lead-detail-view__dedup-dialog" role="alertdialog">
        <h3 class="lead-detail-view__dedup-title">
          {{ t("leads.detail.convertDedup.title") }}
        </h3>
        <p class="lead-detail-view__dedup-desc">
          {{ t("leads.detail.convertDedup.description") }}
        </p>
        <ul
          v-if="
            convertDedupResult.leads.length > 0 ||
            convertDedupResult.customers.length > 0
          "
          class="lead-detail-view__dedup-list"
        >
          <li v-for="m in convertDedupResult.leads" :key="'l-' + m.id">
            {{ m.name }}
            <span v-if="m.phone || m.email">
              ({{ [m.phone, m.email].filter(Boolean).join(" · ") }})
            </span>
          </li>
          <li v-for="m in convertDedupResult.customers" :key="'c-' + m.id">
            {{ m.name }}
            <span v-if="m.phone || m.email">
              ({{ [m.phone, m.email].filter(Boolean).join(" · ") }})
            </span>
          </li>
        </ul>
        <div class="lead-detail-view__dedup-actions">
          <Button size="sm" @click="dismissConvertDedup">
            {{ t("leads.detail.convertDedup.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="convertSubmitting"
            @click="confirmConvertDedup"
          >
            {{ t("leads.detail.convertDedup.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped src="./lead-detail-view.css"></style>
