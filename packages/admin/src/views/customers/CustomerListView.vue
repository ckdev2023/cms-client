<script setup lang="ts">
/**
 * 客户列表页组合层，装配筛选、表格、批量操作、新建弹窗、toast、草稿等子模块。
 */
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import CustomerSummaryCards from "./components/CustomerSummaryCards.vue";
import CustomerFilters from "./components/CustomerFilters.vue";
import CustomerBulkActionBar from "./components/CustomerBulkActionBar.vue";
import CustomerTable from "./components/CustomerTable.vue";
import CustomerPagination from "./components/CustomerPagination.vue";
import CustomerCreateModal from "./components/CustomerCreateModal.vue";
import CustomerToast from "./components/CustomerToast.vue";
import { CURRENT_VIEWER, GROUP_OPTIONS, OWNER_OPTIONS } from "./fixtures";
import type { CustomerCreateFormFields, SummaryCardData } from "./types";
import { useCustomerCreateForm } from "./model/useCustomerCreateForm";
import { useCustomerToast } from "./model/useCustomerToast";
import { useCustomerDrafts } from "./model/useCustomerDrafts";
import { deriveCustomerSummaryStats } from "./model/useCustomerFilters";
import { useCustomerListModel } from "./model/useCustomerListModel";
import { createCustomerRepository } from "./model/CustomerRepository";

/** 客户列表页组合层，装配筛选、表格、批量操作、弹窗、toast、草稿等子模块。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const repository = createCustomerRepository();
const listModel = useCustomerListModel({ repository });
const {
  filters,
  filteredCustomers,
  selectedIds,
  selectedCount,
  isAllSelected,
  isIndeterminate,
  bulkLoading,
  page,
  totalPages,
  total,
  setScope,
  setSearch,
  setGroup,
  setOwner,
  setActiveCases,
  resetFilters,
  setPage,
  retry,
  toggleSelectAll,
  toggleSelectRow,
  clearSelection,
  bulkAssignOwner,
  bulkChangeGroup,
} = listModel;

const summaryCards = computed<SummaryCardData[]>(() => {
  const stats = deriveCustomerSummaryStats(
    filteredCustomers.value,
    CURRENT_VIEWER,
  );
  return [
    { key: "mine", variant: "primary", value: stats.mine },
    { key: "group", variant: "info", value: stats.group },
    { key: "active", variant: "warning", value: stats.active },
    { key: "noActive", variant: "neutral", value: stats.noActive },
  ];
});

const paginationStart = computed(() => {
  if (listModel.total.value === 0) return 0;
  return (page.value - 1) * listModel.pageSize + 1;
});

const paginationEnd = computed(() => {
  if (total.value === 0) return 0;
  return Math.min(page.value * listModel.pageSize, total.value);
});

/**
 * 全选/取消全选当前筛选结果。
 *
 * @param checked - 是否选中
 */
function handleSelectAll(checked: boolean) {
  toggleSelectAll(checked);
}

const toast = useCustomerToast();

const { drafts, saveDraft, removeDraft, getDraft } = useCustomerDrafts({
  storage: window.localStorage,
});

const activeDraftId = ref<string | null>(null);

/**
 * 批量指派负责人后弹 toast 并清除选择。
 *
 * @param ownerId - 负责人选项值
 */
async function handleAssignOwner(ownerId: string) {
  const count = selectedCount.value;
  if (count === 0) return;

  const label =
    OWNER_OPTIONS.find((o) => o.value === ownerId)?.label ?? ownerId;
  const updated = await bulkAssignOwner(ownerId);
  if (updated === 0) return;

  toast.show({
    title: t("customers.list.toast.bulkAssign.title"),
    description: t("customers.list.toast.bulkAssign.description", {
      count,
      owner: label,
    }),
  });
}

/**
 * 批量调整分组后弹 toast 并清除选择。
 *
 * @param groupId - 分组选项值
 */
async function handleChangeGroup(groupId: string) {
  const count = selectedCount.value;
  if (count === 0) return;

  const label =
    GROUP_OPTIONS.find((g) => g.value === groupId)?.label ?? groupId;
  const updated = await bulkChangeGroup(groupId);
  if (updated === 0) return;

  toast.show({
    title: t("customers.list.toast.bulkGroup.title"),
    description: t("customers.list.toast.bulkGroup.description", {
      count,
      group: label,
    }),
  });
}

const modalOpen = ref(false);

const {
  fields: formFields,
  canCreate,
  showDedupe,
  dedupeMatches,
  checkingDuplicates,
  dedupeErrorCode,
  submitting,
  submitErrorCode,
  createCustomer,
  resetForm,
} = useCustomerCreateForm({ repository });

/** 打开新建客户弹窗。 */
function openModal() {
  modalOpen.value = true;
}

/**
 * 判断当前路由是否带有打开新建客户弹窗的入口标记。
 *
 * @returns 是否命中 `action=new` 或 `#new` 入口
 */
function hasNewCustomerEntry(): boolean {
  return (
    route.query.action === "new" ||
    route.hash === "#new" ||
    route.fullPath.endsWith("#new")
  );
}

/**
 * 清理用于打开新建客户弹窗的路由标记，避免重复触发。
 */
function clearNewCustomerEntry() {
  if (!hasNewCustomerEntry()) return;
  router.replace({
    path: route.path,
    query: {
      ...route.query,
      action: undefined,
    },
    hash: "",
  });
}

/**
 * 当路由包含弹窗入口标记时，自动打开新建客户弹窗并清理标记。
 */
function syncModalEntryFromRoute() {
  if (!hasNewCustomerEntry()) return;
  openModal();
  clearNewCustomerEntry();
}

/** 关闭弹窗、清除活跃草稿并重置表单。 */
function closeModal() {
  modalOpen.value = false;
  activeDraftId.value = null;
  resetForm();
}

/** 创建客户：若来自草稿则移除草稿，关闭弹窗并弹 toast。 */
async function handleCreate() {
  const created = await createCustomer();
  if (!created) return;

  if (activeDraftId.value) {
    removeDraft(activeDraftId.value);
  }

  await retry();
  closeModal();
  toast.show({
    title: t("customers.list.toast.customerCreated.title"),
    description: t("customers.list.toast.customerCreated.description"),
  });
}

/** 保存草稿到 localStorage，关闭弹窗并弹 toast。 */
function handleSaveDraft() {
  saveDraft(formFields);
  closeModal();
  toast.show({
    title: t("customers.list.toast.draftSaved.title"),
    description: t("customers.list.toast.draftSaved.description"),
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
    title: t("customers.list.toast.draftLoaded.title"),
    description: t("customers.list.toast.draftLoaded.description"),
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
function updateFormField(name: keyof CustomerCreateFormFields, value: string) {
  formFields[name] = value;
}

onMounted(() => {
  syncModalEntryFromRoute();
});

watch(
  () => route.fullPath,
  () => {
    syncModalEntryFromRoute();
  },
);
</script>

<template>
  <div class="customer-list-view">
    <PageHeader
      :title="t('customers.list.title')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('shell.nav.items.customers') },
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
          {{ t("customers.list.addCustomer") }}
        </Button>
      </template>
    </PageHeader>

    <CustomerSummaryCards :cards="summaryCards" />

    <CustomerFilters
      :scope="filters.scope"
      :search="filters.search"
      :group-filter="filters.group"
      :owner-filter="filters.owner"
      :active-cases-filter="filters.activeCases"
      :filtered-count="filteredCustomers.length"
      @update:scope="setScope($event)"
      @update:search="setSearch($event)"
      @update:group-filter="setGroup($event)"
      @update:owner-filter="setOwner($event)"
      @update:active-cases-filter="setActiveCases($event)"
      @reset-filters="resetFilters()"
    />

    <div class="customer-list-view__table-card">
      <CustomerBulkActionBar
        :selected-count="selectedCount"
        :loading="bulkLoading"
        :owner-options="OWNER_OPTIONS"
        :group-options="GROUP_OPTIONS"
        @clear="clearSelection"
        @assign-owner="handleAssignOwner"
        @change-group="handleChangeGroup"
      />
      <CustomerTable
        :customers="filteredCustomers"
        :drafts="drafts"
        :selected-ids="selectedIds"
        :all-selected="isAllSelected"
        :indeterminate="isIndeterminate"
        @select-all="handleSelectAll"
        @select-row="toggleSelectRow"
        @resume-draft="handleResumeDraft"
        @remove-draft="handleRemoveDraft"
      />
      <CustomerPagination
        :page="page"
        :total-pages="totalPages"
        :start="paginationStart"
        :end="paginationEnd"
        :total="total"
        @prev="setPage(page - 1)"
        @next="setPage(page + 1)"
      />
    </div>

    <CustomerCreateModal
      :open="modalOpen"
      :fields="formFields"
      :can-create="canCreate"
      :show-dedupe="showDedupe"
      :dedupe-matches="dedupeMatches"
      :group-options="GROUP_OPTIONS"
      :checking-duplicates="checkingDuplicates"
      :dedupe-error-code="dedupeErrorCode"
      :submitting="submitting"
      :submit-error-code="submitErrorCode"
      @close="closeModal"
      @save-draft="handleSaveDraft"
      @create="handleCreate"
      @update:field="updateFormField"
    />
    <CustomerToast
      :visible="toast.visible.value"
      :title="toast.title.value"
      :description="toast.description.value"
    />
  </div>
</template>

<style scoped>
.customer-list-view {
  display: grid;
  gap: 24px;
}

.customer-list-view__table-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
</style>
