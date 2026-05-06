<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
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
import ConversationDetailView from "../conversations/ConversationDetailView.vue";
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
  updateSubmitting,
  transitionSubmitting,
  markLostSubmitting,
  updateLead,
  transitionStatus,
  markLost,
} = useLeadDetailModel(leadId);

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
          :readonly="isReadonly"
          @submit-followup="submitFollowup"
          @reset-followup="resetFollowupForm"
        />
        <template v-else-if="activeTab === 'conversations'">
          <ConversationDetailView
            v-if="lead.conversationId"
            compact
            auto-mark-read
            :conversation-id="lead.conversationId"
          />
          <div v-else class="lead-detail-view__no-conversations">
            <p>{{ t("leads.detail.conversationsTab.empty") }}</p>
          </div>
        </template>
        <LeadConversionTab
          v-else-if="activeTab === 'conversion'"
          :conversion="lead.conversion"
          :button-states="buttonStates"
          :readonly="isReadonly"
          @convert-customer="openConvertCustomerDialog"
          @convert-case="openConvertCaseDialog"
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
    :intended-case-type="lead.intendedCaseType"
    :owner-user-id="lead.ownerId || currentUserId || ''"
    :group-id="lead.groupId"
    :submitting="convertSubmitting"
    :error="convertCaseError"
    @confirm="handleConvertCaseConfirm"
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

<style scoped>
.lead-detail-view {
  display: grid;
  gap: 20px;
}

.lead-detail-view__tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--color-border-1);
  overflow-x: auto;
}

.lead-detail-view__tab {
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

.lead-detail-view__tab:hover {
  color: var(--color-text-1);
}

.lead-detail-view__tab.active {
  color: var(--color-primary-6);
  border-bottom-color: var(--color-primary-6);
  font-weight: var(--font-weight-bold);
}

.lead-detail-view__panel {
  display: grid;
  gap: 16px;
}

.lead-detail-view__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 24px;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
}

.lead-detail-view__not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-3);
}

.lead-detail-view__not-found a {
  color: var(--color-primary-6);
  text-decoration: none;
  font-weight: var(--font-weight-semibold);
}

.lead-detail-view__not-found a:hover {
  text-decoration: underline;
}

.lead-detail-view__no-conversations {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-3);
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-lg, 16px);
  font-size: var(--font-size-sm);
}

.lead-detail-view__dedup-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lead-detail-view__dedup-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 480px;
  width: 100%;
}

.lead-detail-view__dedup-title {
  margin: 0 0 8px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning-text);
}

.lead-detail-view__dedup-desc {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.lead-detail-view__dedup-list {
  margin: 0 0 16px;
  padding: 0 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.lead-detail-view__dedup-list li {
  margin-bottom: 4px;
}

.lead-detail-view__dedup-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
