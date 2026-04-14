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
import {
  CURRENT_VIEWER,
  SAMPLE_CUSTOMERS,
  GROUP_OPTIONS,
  OWNER_OPTIONS,
} from "./fixtures";
import type { CustomerCreateFormFields, SummaryCardData } from "./types";
import { useCustomerFilters } from "./model/useCustomerFilters";
import { useCustomerSelection } from "./model/useCustomerSelection";
import { useCustomerCreateForm } from "./model/useCustomerCreateForm";
import { useCustomerToast } from "./model/useCustomerToast";
import { useCustomerDrafts } from "./model/useCustomerDrafts";
import { deriveCustomerSummaryStats } from "./model/useCustomerFilters";

/** 客户列表页组合层，装配筛选、表格、批量操作、弹窗、toast、草稿等子模块。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const {
  scope,
  search,
  groupFilter,
  ownerFilter,
  activeCasesFilter,
  resetFilters,
  applyFilters,
} = useCustomerFilters({
  groupOptions: GROUP_OPTIONS,
  ownerOptions: OWNER_OPTIONS,
});

const filteredCustomers = computed(() =>
  applyFilters(SAMPLE_CUSTOMERS, CURRENT_VIEWER),
);

const summaryCards = computed<SummaryCardData[]>(() => {
  const stats = deriveCustomerSummaryStats(SAMPLE_CUSTOMERS, CURRENT_VIEWER);
  return [
    { key: "mine", variant: "primary", value: stats.mine },
    { key: "group", variant: "info", value: stats.group },
    { key: "active", variant: "warning", value: stats.active },
    { key: "noActive", variant: "neutral", value: stats.noActive },
  ];
});

const {
  selectedIds,
  selectedCount,
  toggleAll,
  toggleRow,
  clearSelection,
  isAllSelected,
  isIndeterminate,
} = useCustomerSelection();

const allSelected = computed(() => isAllSelected(filteredCustomers.value));
const indeterminate = computed(() => isIndeterminate(filteredCustomers.value));

/**
 * 全选/取消全选当前筛选结果。
 *
 * @param checked - 是否选中
 */
function handleSelectAll(checked: boolean) {
  toggleAll(filteredCustomers.value, checked);
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
function handleAssignOwner(ownerId: string) {
  const label =
    OWNER_OPTIONS.find((o) => o.value === ownerId)?.label ?? ownerId;
  toast.show({
    title: t("customers.list.toast.bulkAssign.title"),
    description: t("customers.list.toast.bulkAssign.description", {
      count: selectedCount.value,
      owner: label,
    }),
  });
  clearSelection();
}

/**
 * 批量调整分组后弹 toast 并清除选择。
 *
 * @param groupId - 分组选项值
 */
function handleChangeGroup(groupId: string) {
  const label =
    GROUP_OPTIONS.find((g) => g.value === groupId)?.label ?? groupId;
  toast.show({
    title: t("customers.list.toast.bulkGroup.title"),
    description: t("customers.list.toast.bulkGroup.description", {
      count: selectedCount.value,
      group: label,
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
} = useCustomerCreateForm({ existingCustomers: () => SAMPLE_CUSTOMERS });

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
function handleCreate() {
  if (activeDraftId.value) {
    removeDraft(activeDraftId.value);
  }
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
      :scope="scope"
      :search="search"
      :group-filter="groupFilter"
      :owner-filter="ownerFilter"
      :active-cases-filter="activeCasesFilter"
      :filtered-count="filteredCustomers.length"
      @update:scope="scope = $event"
      @update:search="search = $event"
      @update:group-filter="groupFilter = $event"
      @update:owner-filter="ownerFilter = $event"
      @update:active-cases-filter="activeCasesFilter = $event"
      @reset-filters="resetFilters"
    />

    <div class="customer-list-view__table-card">
      <CustomerBulkActionBar
        :selected-count="selectedCount"
        @clear="clearSelection"
        @assign-owner="handleAssignOwner"
        @change-group="handleChangeGroup"
      />
      <CustomerTable
        :customers="filteredCustomers"
        :drafts="drafts"
        :selected-ids="selectedIds"
        :all-selected="allSelected"
        :indeterminate="indeterminate"
        @select-all="handleSelectAll"
        @select-row="toggleRow"
        @resume-draft="handleResumeDraft"
        @remove-draft="handleRemoveDraft"
      />
      <CustomerPagination
        :start="1"
        :end="filteredCustomers.length"
        :total="filteredCustomers.length"
      />
    </div>

    <CustomerCreateModal
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
