<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import Card from "../../shared/ui/Card.vue";
import LeadDetailHeader from "./components/LeadDetailHeader.vue";
import LeadBannerStrip from "./components/LeadBannerStrip.vue";
import LeadInfoTab from "./components/LeadInfoTab.vue";
import LeadFollowupsTab from "./components/LeadFollowupsTab.vue";
import LeadConversionTab from "./components/LeadConversionTab.vue";
import LeadLogTab from "./components/LeadLogTab.vue";
import { useLeadDetailModel } from "./model/useLeadDetailModel";
import { LEAD_DETAIL_TABS } from "./types";

/** 线索详情页：组合头部、Banner、Tab 栏与四个内容面板。 */
const { t } = useI18n();
const route = useRoute();

const leadId = computed(() => route.params.id as string);
const {
  activeTab,
  lead,
  notFound,
  isReadonly,
  banner,
  buttonStates,
  avatarInitials,
  switchTab,
  followupForm,
  canSubmitFollowup,
  submitFollowup,
  resetFollowupForm,
  logCategory,
  filteredLog,
  setLogCategory,
} = useLeadDetailModel(leadId);
</script>

<template>
  <div class="lead-detail-view">
    <template v-if="lead">
      <Card padding="lg">
        <LeadDetailHeader
          :lead="lead"
          :avatar-initials="avatarInitials"
          :button-states="buttonStates"
          @convert-customer="() => {}"
          @convert-case="() => {}"
          @mark-lost="() => {}"
          @edit-info="() => {}"
          @change-status="() => {}"
        />
      </Card>

      <LeadBannerStrip
        v-if="banner"
        :banner="banner"
        @convert-case="() => {}"
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
        <LeadConversionTab
          v-else-if="activeTab === 'conversion'"
          :conversion="lead.conversion"
          :button-states="buttonStates"
          :readonly="isReadonly"
          @convert-customer="() => {}"
          @convert-case="() => {}"
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

    <div v-else-if="notFound" class="lead-detail-view__not-found">
      <p>{{ t("leads.detail.notFound") }}</p>
      <a href="#/leads">{{ t("leads.detail.backToList") }}</a>
    </div>
  </div>
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
  font-weight: var(--font-weight-black);
}

.lead-detail-view__panel {
  display: grid;
  gap: 16px;
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
</style>
