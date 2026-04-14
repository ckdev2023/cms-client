<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import BillingSummaryCards from "./components/BillingSummaryCards.vue";
import BillingFilters from "./components/BillingFilters.vue";
import BillingTable from "./components/BillingTable.vue";
import BillingBulkActionBar from "./components/BillingBulkActionBar.vue";
import BillingPagination from "./components/BillingPagination.vue";
import PaymentLogTable from "./components/PaymentLogTable.vue";
import PaymentModal from "./components/PaymentModal.vue";
import BillingToast from "./components/BillingToast.vue";
import type {
  BillingSegment,
  BillingStatusFilter,
  RegisterPaymentFormFields,
} from "./types";
import {
  BILLING_STATUS_OPTIONS,
  GROUP_OPTIONS,
  OWNER_OPTIONS,
  BILLING_SEGMENTS,
  SUMMARY_CARD_DEFS,
  SAMPLE_SUMMARY,
  SAMPLE_BILLING_ROWS,
  SAMPLE_PAYMENT_LOGS,
  SAMPLE_BILLING_PLANS,
} from "./fixtures";
import { useBillingFilters } from "./model/useBillingFilters";
import { useBillingSelection } from "./model/useBillingSelection";
import { useBillingBulkActions } from "./model/useBillingBulkActions";
import { useBillingToast } from "./model/useBillingToast";

/** 收费列表页总装层，装配摘要卡、筛选、表格、批量催款、回款流水、弹窗、toast。 */
const { t } = useI18n();

const filters = useBillingFilters({
  statusOptions: BILLING_STATUS_OPTIONS,
  groupOptions: GROUP_OPTIONS,
  ownerOptions: OWNER_OPTIONS,
});

const filteredRows = computed(() => filters.applyFilters(SAMPLE_BILLING_ROWS));

const selection = useBillingSelection();
const allSelected = computed(() => selection.isAllSelected(filteredRows.value));
const indeterminate = computed(() =>
  selection.isIndeterminate(filteredRows.value),
);

/**
 * 全选/取消全选当前筛选后的可勾选行。
 * @param checked - 是否全选
 */
function handleToggleAll(checked: boolean) {
  selection.toggleAll(filteredRows.value, checked);
}

const bulk = useBillingBulkActions();
const toast = useBillingToast();

async function handleBulkCollect() {
  const result = await bulk.executeBulkCollection(
    selection.selectedIds.value,
    filteredRows.value,
  );
  toast.show({
    title: t("billing.list.toast.bulkCollect.title"),
    description: t("billing.list.toast.bulkCollect.description", {
      success: result.success,
      skipped: result.skipped,
      failed: result.failed,
    }),
  });
  selection.clearSelection();
}

const paymentModalOpen = ref(false);

/**
 * 回款表单提交后弹出 toast 通知。
 * @param _fields - 回款表单字段
 */
function handlePaymentSubmit(_fields: RegisterPaymentFormFields) {
  toast.show({
    title: t("billing.list.toast.paymentRegistered.title"),
    description: t("billing.list.toast.paymentRegistered.description", {
      amount: _fields.amount,
    }),
  });
}

/**
 * 作废回款流水并弹出 toast。
 *
 * @param id - 流水记录 ID
 */
function handleVoidPayment(id: string) {
  toast.show({
    title: t("billing.list.toast.voided.title"),
    description: t("billing.list.toast.voided.description", { id }),
  });
}

/**
 * 冲正回款流水并弹出 toast。
 *
 * @param id - 流水记录 ID
 */
function handleReversePayment(id: string) {
  toast.show({
    title: t("billing.list.toast.reversed.title"),
    description: t("billing.list.toast.reversed.description", { id }),
  });
}

/**
 * 切换分段视图（案件收费列表 / 回款流水），同时清除选择状态。
 *
 * @param seg - 目标分段
 */
function handleSegmentChange(seg: BillingSegment) {
  filters.switchSegment(seg);
  selection.clearSelection();
}
</script>

<template>
  <div class="billing-list-view">
    <PageHeader
      :title="t('billing.list.title')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('shell.nav.items.billing') },
      ]"
    >
      <template #actions>
        <Button
          variant="filled"
          tone="primary"
          @click="paymentModalOpen = true"
        >
          {{ t("billing.list.registerPayment") }}
        </Button>
      </template>
    </PageHeader>

    <BillingSummaryCards
      :card-defs="SUMMARY_CARD_DEFS"
      :summary="SAMPLE_SUMMARY"
    />

    <BillingFilters
      :active-segment="filters.segment.value"
      :search="filters.search.value"
      :status-filter="filters.statusFilter.value"
      :group-filter="filters.groupFilter.value"
      :owner-filter="filters.ownerFilter.value"
      :segments="BILLING_SEGMENTS"
      :status-options="BILLING_STATUS_OPTIONS"
      :group-options="GROUP_OPTIONS"
      :owner-options="OWNER_OPTIONS"
      :filtered-count="filteredRows.length"
      :is-filter-active="filters.isFilterActive.value"
      @update:active-segment="handleSegmentChange"
      @update:search="filters.search.value = $event"
      @update:status-filter="
        filters.statusFilter.value = $event as BillingStatusFilter
      "
      @update:group-filter="filters.groupFilter.value = $event"
      @update:owner-filter="filters.ownerFilter.value = $event"
      @reset-filters="filters.resetFilters()"
    />

    <div class="billing-list-view__table-card">
      <template v-if="filters.segment.value === 'billing-list'">
        <BillingBulkActionBar
          :selected-count="selection.selectedCount.value"
          :loading="bulk.loading.value"
          @clear="selection.clearSelection()"
          @bulk-collect="handleBulkCollect"
        />
        <BillingTable
          :rows="filteredRows"
          :selected-ids="selection.selectedIds.value"
          :is-all-selected="allSelected"
          :is-indeterminate="indeterminate"
          @toggle-row="selection.toggleRow"
          @toggle-all="handleToggleAll"
        />
      </template>
      <PaymentLogTable
        v-else
        :entries="SAMPLE_PAYMENT_LOGS"
        @void-payment="handleVoidPayment"
        @reverse-payment="handleReversePayment"
      />

      <BillingPagination
        :total="
          filters.segment.value === 'billing-list'
            ? filteredRows.length
            : SAMPLE_PAYMENT_LOGS.length
        "
      />
    </div>

    <PaymentModal
      :open="paymentModalOpen"
      :nodes="SAMPLE_BILLING_PLANS['bill-002']?.nodes"
      @close="paymentModalOpen = false"
      @submit="handlePaymentSubmit"
    />

    <BillingToast
      :visible="toast.visible.value"
      :title="toast.title.value"
      :description="toast.description.value"
      @dismiss="toast.hide()"
    />
  </div>
</template>

<style scoped>
.billing-list-view {
  display: grid;
  gap: 24px;
}

.billing-list-view__table-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
</style>
