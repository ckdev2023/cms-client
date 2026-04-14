<script setup lang="ts">
/**
 * 线索列表页组合层，装配筛选、表格、批量操作、新建弹窗、toast、草稿等子模块。
 */
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import LeadFilters from "./components/LeadFilters.vue";
import LeadBulkActionBar from "./components/LeadBulkActionBar.vue";
import LeadTable from "./components/LeadTable.vue";
import LeadPagination from "./components/LeadPagination.vue";
import LeadCreateModal from "./components/LeadCreateModal.vue";
import LeadToast from "./components/LeadToast.vue";
import {
  LEAD_SAMPLES,
  GROUP_OPTIONS,
  OWNER_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
} from "./fixtures";
import type {
  LeadCreateFormFields,
  LeadStatus,
  LeadStatusFilter,
} from "./types";
import { useLeadFilters } from "./model/useLeadFilters";
import { useLeadSelection } from "./model/useLeadSelection";
import { useLeadCreateForm } from "./model/useLeadCreateForm";
import { useLeadToast } from "./model/useLeadToast";
import { useLeadDrafts } from "./model/useLeadDrafts";
import { useLeadBulkActions } from "./model/useLeadBulkActions";

/** 线索列表页组合层，装配筛选、表格、批量操作、弹窗、toast、草稿等子模块。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const {
  scope,
  search,
  statusFilter,
  ownerFilter,
  groupFilter,
  businessTypeFilter,
  dateFrom,
  dateTo,
  resetFilters,
  applyFilters,
} = useLeadFilters({
  groupOptions: GROUP_OPTIONS,
  ownerOptions: OWNER_OPTIONS,
  businessTypeOptions: BUSINESS_TYPE_OPTIONS,
});

const filteredLeads = computed(() => applyFilters(LEAD_SAMPLES));

const {
  selectedIds,
  selectedCount,
  toggleAll,
  toggleRow,
  clearSelection,
  isAllSelected,
  isIndeterminate,
} = useLeadSelection();

const allSelected = computed(() => isAllSelected(filteredLeads.value));
const indeterminate = computed(() => isIndeterminate(filteredLeads.value));

/**
 * 全选/取消全选当前筛选结果。
 *
 * @param checked - 是否选中
 */
function handleSelectAll(checked: boolean) {
  toggleAll(filteredLeads.value, checked);
}

const toast = useLeadToast();

const { drafts, saveDraft, removeDraft, getDraft } = useLeadDrafts({
  storage: window.localStorage,
});

const activeDraftId = ref<string | null>(null);

const bulk = useLeadBulkActions();

/**
 * 批量指派负责人后弹 toast 并清除选择。
 *
 * @param ownerId - 负责人选项值
 */
async function handleAssignOwner(ownerId: string) {
  const result = await bulk.assignOwner(
    selectedIds.value,
    filteredLeads.value,
    ownerId,
  );
  const label =
    OWNER_OPTIONS.find((o) => o.value === ownerId)?.label ?? ownerId;
  toast.show({
    title: t("leads.list.toast.bulkAssign.title"),
    description: t("leads.list.toast.bulkAssign.description", {
      count: result.success,
      owner: label,
    }),
  });
  clearSelection();
}

/**
 * 批量调整跟进时间后弹 toast 并清除选择。
 *
 * @param date - 目标日期
 */
async function handleAdjustFollowUp(date: string) {
  const result = await bulk.adjustFollowUp(
    selectedIds.value,
    filteredLeads.value,
    date,
  );
  toast.show({
    title: t("leads.list.toast.bulkFollowUp.title"),
    description: t("leads.list.toast.bulkFollowUp.description", {
      count: result.success,
      date,
    }),
  });
  clearSelection();
}

/**
 * 批量标记状态后弹 toast 并清除选择。
 *
 * @param status - 目标状态
 */
async function handleMarkStatus(status: LeadStatus) {
  const result = await bulk.markStatus(
    selectedIds.value,
    filteredLeads.value,
    status,
  );
  toast.show({
    title: t("leads.list.toast.bulkStatus.title"),
    description: t("leads.list.toast.bulkStatus.description", {
      success: result.success,
      skipped: result.skipped,
    }),
  });
  clearSelection();
}

const modalOpen = ref(false);

const {
  fields: formFields,
  canCreate,
  showDedupe,
  dedupeMatches,
  resetForm,
} = useLeadCreateForm({ existingLeads: () => LEAD_SAMPLES });

/** 打开新建线索弹窗。 */
function openModal() {
  modalOpen.value = true;
}

/** 关闭弹窗、清除活跃草稿并重置表单。 */
function closeModal() {
  modalOpen.value = false;
  activeDraftId.value = null;
  resetForm();
}

/** 创建线索：若来自草稿则移除草稿，关闭弹窗并弹 toast。 */
function handleCreate() {
  if (activeDraftId.value) {
    removeDraft(activeDraftId.value);
  }
  closeModal();
  toast.show({
    title: t("leads.list.toast.leadCreated.title"),
    description: t("leads.list.toast.leadCreated.description"),
  });
}

/** 保存草稿到 localStorage，关闭弹窗并弹 toast。 */
function handleSaveDraft() {
  saveDraft(formFields);
  closeModal();
  toast.show({
    title: t("leads.list.toast.draftSaved.title"),
    description: t("leads.list.toast.draftSaved.description"),
  });
}

/**
 * 从草稿行恢复表单并打开弹窗。
 *
 * @param draftId - 草稿 ID
 */
function handleResumeDraft(draftId: string) {
  const draft = getDraft(draftId);
  if (!draft) return;
  Object.assign(formFields, draft.fields);
  activeDraftId.value = draftId;
  openModal();
  toast.show({
    title: t("leads.list.toast.draftLoaded.title"),
    description: t("leads.list.toast.draftLoaded.description"),
  });
}

/**
 * 删除草稿。
 *
 * @param draftId - 草稿 ID
 */
function handleRemoveDraft(draftId: string) {
  removeDraft(draftId);
}

/**
 * 更新弹窗表单中的单个字段。
 *
 * @param name - 字段名
 * @param value - 字段值
 */
function updateFormField(name: keyof LeadCreateFormFields, value: string) {
  formFields[name] = value;
}

onMounted(() => {
  if (route.query.action === "new") {
    openModal();
    router.replace({ ...route, query: { ...route.query, action: undefined } });
  }
});
</script>

<template>
  <div class="leads-list-view">
    <PageHeader
      :title="t('leads.list.title')"
      :subtitle="t('leads.list.subtitle')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('shell.nav.items.leads') },
      ]"
    >
      <template #actions>
        <Button variant="filled" tone="primary" @click="openModal">
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
          {{ t("leads.list.addLead") }}
        </Button>
      </template>
    </PageHeader>

    <LeadFilters
      :scope="scope"
      :search="search"
      :status-filter="statusFilter"
      :owner-filter="ownerFilter"
      :group-filter="groupFilter"
      :business-type-filter="businessTypeFilter"
      :date-from="dateFrom"
      :date-to="dateTo"
      :filtered-count="filteredLeads.length"
      @update:scope="scope = $event"
      @update:search="search = $event"
      @update:status-filter="statusFilter = $event as LeadStatusFilter"
      @update:owner-filter="ownerFilter = $event"
      @update:group-filter="groupFilter = $event"
      @update:business-type-filter="businessTypeFilter = $event"
      @update:date-from="dateFrom = $event"
      @update:date-to="dateTo = $event"
      @reset-filters="resetFilters"
    />

    <div class="leads-list-view__table-card">
      <LeadBulkActionBar
        :selected-count="selectedCount"
        @clear="clearSelection"
        @assign-owner="handleAssignOwner"
        @adjust-follow-up="handleAdjustFollowUp"
        @mark-status="handleMarkStatus"
      />
      <LeadTable
        :leads="filteredLeads"
        :drafts="drafts"
        :selected-ids="selectedIds"
        :all-selected="allSelected"
        :indeterminate="indeterminate"
        @select-all="handleSelectAll"
        @select-row="toggleRow"
        @resume-draft="handleResumeDraft"
        @remove-draft="handleRemoveDraft"
        @open-create-modal="openModal"
      />
      <LeadPagination
        :start="1"
        :end="filteredLeads.length"
        :total="filteredLeads.length"
      />
    </div>

    <LeadCreateModal
      :open="modalOpen"
      :fields="formFields"
      :can-create="canCreate"
      :show-dedupe="showDedupe"
      :dedupe-matches="dedupeMatches"
      @close="closeModal"
      @save-draft="handleSaveDraft"
      @create="handleCreate"
      @update:field="updateFormField"
    />
    <LeadToast
      :visible="toast.visible.value"
      :title="toast.title.value"
      :description="toast.description.value"
    />
  </div>
</template>

<style scoped>
.leads-list-view {
  display: grid;
  gap: 24px;
}

.leads-list-view__table-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
</style>
