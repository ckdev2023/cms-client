<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import type { AppLocale } from "../../i18n";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";
import { getOwnerOptions } from "../../shared/model/useOwnerOptions";
import LeadFilters from "./components/LeadFilters.vue";
import LeadBulkActionBar from "./components/LeadBulkActionBar.vue";
import LeadTable from "./components/LeadTable.vue";
import LeadPagination from "./components/LeadPagination.vue";
import LeadCreateModal from "./components/LeadCreateModal.vue";
import { BUSINESS_TYPE_OPTIONS, getLeadSamples } from "./fixtures";
import type {
  LeadCreateFormFields,
  LeadStatus,
  LeadSummary,
  LeadStatusFilter,
} from "./types";
import { useLeadCatalogOptions } from "./model/useLeadCatalogOptions";
import { useLeadFilters } from "./model/useLeadFilters";
import { useLeadSelection } from "./model/useLeadSelection";
import { useLeadCreateForm } from "./model/useLeadCreateForm";
import { useLeadToast } from "./model/useLeadToast";
import { useLeadDrafts } from "./model/useLeadDrafts";
import { useLeadBulkActions } from "./model/useLeadBulkActions";
import { createLeadRepository } from "./model/LeadRepository";
import { syncLeadCreateEntryFromRoute } from "./model/leadCreateEntry";
import { useLeadCreateActions } from "./model/useLeadCreateActions";
import type { LeadListResult } from "./model/LeadAdapterTypes";

/** 线索列表页组合层，装配筛选、表格、批量操作、新建弹窗、toast、草稿等子模块。 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();

const repository = createLeadRepository();
const groupOptions = computed(() => getActiveGroupOptions(locale.value));
const ownerOptions = computed(() => getOwnerOptions(locale.value));
const { apiOwnerOptions, apiGroupOptions } = useLeadCatalogOptions(locale);

const {
  scope,
  search,
  statusFilter,
  ownerFilter,
  groupFilter,
  businessTypeFilter,
  tagsFilter,
  dateFrom,
  dateTo,
  page,
  limit,
  resetFilters: resetFiltersRaw,
  toListParams,
} = useLeadFilters({
  groupOptions: getActiveGroupOptions(),
  ownerOptions: [],
  businessTypeOptions: BUSINESS_TYPE_OPTIONS,
  routeQuery: computed(() => route.query),
  replaceQuery: (query) =>
    router.replace({
      path: route.path,
      query: query as Record<string, string>,
    }),
});

const leads = ref<LeadSummary[]>([]);
const totalCount = ref(0);
const listLoading = ref(false);
const listError = ref<string | null>(null);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalCount.value / limit.value)),
);
const paginationStart = computed(() => (page.value - 1) * limit.value + 1);
const paginationEnd = computed(() =>
  Math.min(page.value * limit.value, totalCount.value),
);

/** 从服务端拉取线索列表，失败时回退到示例数据。 */
async function fetchLeads() {
  listLoading.value = true;
  listError.value = null;
  try {
    const result: LeadListResult = await repository.listLeads(toListParams());
    leads.value = result.items;
    totalCount.value = result.total;
  } catch {
    leads.value = getLeadSamples(locale.value as AppLocale);
    totalCount.value = leads.value.length;
  } finally {
    listLoading.value = false;
  }
}

watch(
  [
    scope,
    search,
    statusFilter,
    ownerFilter,
    groupFilter,
    businessTypeFilter,
    tagsFilter,
    dateFrom,
    dateTo,
    locale,
  ],
  () => {
    page.value = 1;
    fetchLeads();
  },
);
watch(page, () => {
  fetchLeads();
});

/** 重置筛选并刷新列表。 */
function resetFilters() {
  resetFiltersRaw();
  fetchLeads();
}
/** 翻到上一页。 */
function handlePrev() {
  if (page.value > 1) page.value--;
}
/** 翻到下一页。 */
function handleNext() {
  if (page.value < totalPages.value) page.value++;
}

const {
  selectedIds,
  selectedCount,
  toggleAll,
  toggleRow,
  clearSelection,
  isAllSelected,
  isIndeterminate,
} = useLeadSelection();

const allSelected = computed(() => isAllSelected(leads.value));
const indeterminate = computed(() => isIndeterminate(leads.value));

/**
 * 全选/取消全选当前筛选结果。
 *
 * @param checked - 是否选中
 */
function handleSelectAll(checked: boolean) {
  toggleAll(leads.value, checked);
}

const toast = useLeadToast();

const { drafts, saveDraft, removeDraft, getDraft } = useLeadDrafts({
  storage: window.localStorage,
});

const activeDraftId = ref<string | null>(null);
const bulk = useLeadBulkActions({ repository });

/**
 * 批量指派负责人后弹 toast 并清除选择。
 *
 * @param ownerId - 负责人选项值
 */
async function handleAssignOwner(ownerId: string) {
  const result = await bulk.assignOwner(
    selectedIds.value,
    leads.value,
    ownerId,
  );
  const label =
    apiOwnerOptions.value.find((o) => o.value === ownerId)?.label ??
    ownerOptions.value.find((o) => o.value === ownerId)?.label ??
    ownerId;
  toast.show({
    title: t("leads.list.toast.bulkAssign.title"),
    description: t("leads.list.toast.bulkAssign.description", {
      count: result.success,
      owner: label,
    }),
  });
  clearSelection();
  await fetchLeads();
}

/**
 * 批量调整跟进时间后弹 toast 并清除选择。
 *
 * @param date - 目标日期
 */
async function handleAdjustFollowUp(date: string) {
  const result = await bulk.adjustFollowUp(
    selectedIds.value,
    leads.value,
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
  await fetchLeads();
}

/**
 * 批量标记状态后弹 toast 并清除选择。
 *
 * @param status - 目标状态
 */
async function handleMarkStatus(status: LeadStatus) {
  const result = await bulk.markStatus(selectedIds.value, leads.value, status);
  toast.show({
    title: t("leads.list.toast.bulkStatus.title"),
    description: t("leads.list.toast.bulkStatus.description", {
      success: result.success,
      skipped: result.skipped,
    }),
  });
  clearSelection();
  await fetchLeads();
}

/**
 * 批量打标签后弹 toast 并清除选择。
 *
 * @param tags - 标签列表
 */
async function handleBulkTags(tags: string[]) {
  const result = await bulk.bulkTags(selectedIds.value, leads.value, tags);
  toast.show({
    title: t("leads.list.toast.bulkTags.title"),
    description: t("leads.list.toast.bulkTags.description", {
      count: result.success,
      tags: tags.join(", "),
    }),
  });
  clearSelection();
  await fetchLeads();
}

/**
 * 批量导出后弹 toast 并清除选择。
 *
 * @param format - 导出格式
 */
async function handleBulkExport(format: "csv" | "xlsx") {
  const result = await bulk.bulkExport(selectedIds.value, leads.value, format);
  toast.show({
    title: t("leads.list.toast.bulkExport.title"),
    description: t("leads.list.toast.bulkExport.description", {
      count: result.success,
      format: format.toUpperCase(),
    }),
  });
  clearSelection();
}

const modalOpen = ref(false);
const {
  fields: formFields,
  canCreate,
  resetForm,
  showDedupe: localShowDedupe,
  dedupeMatches: localDedupeMatches,
} = useLeadCreateForm({ existingLeads: () => leads.value });

const {
  createSubmitting,
  showDedupe,
  dedupeMatches,
  handleDedupCheck,
  resetServerDedup,
  createLead,
} = useLeadCreateActions({ repository, localShowDedupe, localDedupeMatches });

/** 打开新建线索弹窗。 */
function openModal() {
  modalOpen.value = true;
}

/** 关闭弹窗、清除活跃草稿并重置表单。 */
function closeModal() {
  modalOpen.value = false;
  activeDraftId.value = null;
  resetServerDedup();
  resetForm();
}

/** 提交创建线索，成功后移除草稿、关闭弹窗并刷新列表。 */
async function handleCreate() {
  const ok = await createLead(formFields);
  if (ok) {
    if (activeDraftId.value) removeDraft(activeDraftId.value);
    closeModal();
    toast.show({
      title: t("leads.list.toast.leadCreated.title"),
      description: t("leads.list.toast.leadCreated.description"),
    });
    await fetchLeads();
  } else {
    toast.show({
      title: t("leads.list.toast.createError.title"),
      description: t("leads.list.toast.createError.description"),
    });
  }
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
  fetchLeads();
  syncLeadCreateEntryFromRoute(route, router, openModal);
});

watch(
  () => route.fullPath,
  () => {
    syncLeadCreateEntryFromRoute(route, router, openModal);
  },
);
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
      :owner-options="apiOwnerOptions"
      :group-options="groupOptions"
      :business-type-filter="businessTypeFilter"
      :tags-filter="tagsFilter"
      :date-from="dateFrom"
      :date-to="dateTo"
      :filtered-count="totalCount"
      @update:scope="scope = $event"
      @update:search="search = $event"
      @update:status-filter="statusFilter = $event as LeadStatusFilter"
      @update:owner-filter="ownerFilter = $event"
      @update:group-filter="groupFilter = $event"
      @update:business-type-filter="businessTypeFilter = $event"
      @update:tags-filter="tagsFilter = $event"
      @update:date-from="dateFrom = $event"
      @update:date-to="dateTo = $event"
      @reset-filters="resetFilters"
    />

    <div class="leads-list-view__table-card">
      <LeadBulkActionBar
        :selected-count="selectedCount"
        :owner-options="apiOwnerOptions"
        @clear="clearSelection"
        @assign-owner="handleAssignOwner"
        @adjust-follow-up="handleAdjustFollowUp"
        @mark-status="handleMarkStatus"
        @bulk-tags="handleBulkTags"
        @bulk-export="handleBulkExport"
      />
      <LeadTable
        :leads="leads"
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
        :start="paginationStart"
        :end="paginationEnd"
        :total="totalCount"
        :page="page"
        :total-pages="totalPages"
        @prev="handlePrev"
        @next="handleNext"
      />
    </div>

    <LeadCreateModal
      :open="modalOpen"
      :fields="formFields"
      :owner-options="apiOwnerOptions"
      :group-options="apiGroupOptions"
      :can-create="canCreate"
      :submitting="createSubmitting"
      :show-dedupe="showDedupe"
      :dedupe-matches="dedupeMatches"
      @close="closeModal"
      @save-draft="handleSaveDraft"
      @create="handleCreate"
      @update:field="updateFormField"
      @dedup-check="handleDedupCheck"
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
