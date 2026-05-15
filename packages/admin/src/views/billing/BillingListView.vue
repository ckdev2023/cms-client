<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAdminSession } from "../../auth/model/adminSession";
import PageHeader from "../../shared/ui/PageHeader.vue";
import BillingSummaryCards from "./components/BillingSummaryCards.vue";
import BillingFilters from "./components/BillingFilters.vue";
import BillingTable from "./components/BillingTable.vue";
import BillingBulkActionBar from "./components/BillingBulkActionBar.vue";
import BillingPagination from "./components/BillingPagination.vue";
import PaymentLogTable from "./components/PaymentLogTable.vue";
import PaymentModal from "./components/PaymentModal.vue";
import BillingToast from "./components/BillingToast.vue";
import BillingCollectionDrawer from "./components/BillingCollectionDrawer.vue";
import BillingRiskAckModal from "./components/BillingRiskAckModal.vue";
import type { BillingSegment, BillingStatusFilter } from "./types";
import {
  BILLING_STATUS_OPTIONS,
  BILLING_SEGMENTS,
  SUMMARY_CARD_DEFS,
} from "./fixtures";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";
import { getOwnerOptions } from "../../shared/model/useOwnerOptions";
import { createBillingRepository } from "./model/BillingRepository";
import { useBillingFilters } from "./model/useBillingFilters";
import { useBillingListData } from "./model/useBillingListData";
import { useBillingPaymentLog } from "./model/useBillingPaymentLog";
import { useBillingSelection } from "./model/useBillingSelection";
import { useBillingBulkActions } from "./model/useBillingBulkActions";
import { useRiskAckLog } from "./model/useRiskAckLog";
import { useBillingToast } from "./model/useBillingToast";
import { useBillingDeepLink } from "./model/useBillingDeepLink";

/** 收费列表页总装层，装配摘要卡、筛选、表格、批量催款、回款流水、弹窗、toast。 */

const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const adminSession = useAdminSession();
const isManager = computed(() => adminSession.isAdmin.value);

const ownerOptions = computed(() => getOwnerOptions(locale.value));
// BUG-134：Group 下拉必须随 locale 切换重算，否则模块顶层 const 会
// 在加载期固化为 ja-JP 默认（`normalizeGroupLocale(undefined)` → `ja-JP`），
// 导致 zh-CN / en-US 仍渲染日文 `東京一組 / 東京二組`。
const groupOptions = computed(() => getActiveGroupOptions(locale.value));

const repo = createBillingRepository();

const filters = useBillingFilters({
  statusOptions: BILLING_STATUS_OPTIONS,
  groupOptions: groupOptions.value,
  ownerOptions: ownerOptions.value,
});

const listData = useBillingListData({
  statusFilter: filters.statusFilter,
  groupFilter: filters.groupFilter,
  ownerFilter: filters.ownerFilter,
  search: filters.search,
  dataSource: repo,
});

const paymentLog = useBillingPaymentLog({
  groupFilter: filters.groupFilter,
  ownerFilter: filters.ownerFilter,
  search: filters.search,
  dataSource: repo,
});

const selection = useBillingSelection();
const selectableCount = computed(
  () => selection.selectableRows(listData.rows.value).length,
);
const allSelected = computed(() =>
  selection.isAllSelected(listData.rows.value),
);
const indeterminate = computed(() =>
  selection.isIndeterminate(listData.rows.value),
);

/**
 * 全选/取消全选当前筛选后的可勾选行。
 *
 * @param checked - 是否全选
 */
function handleToggleAll(checked: boolean) {
  selection.toggleAll(listData.rows.value, checked);
}

const bulk = useBillingBulkActions({ dataSource: repo });
const riskAck = useRiskAckLog({ dataSource: repo });
const toast = useBillingToast();

async function handleBulkCollect() {
  try {
    const result = await bulk.executeBulkCollection(
      selection.selectedIds.value,
      listData.rows.value,
    );
    toast.show({
      title: t("billing.list.toast.bulkCollect.title"),
      description: t("billing.list.toast.bulkCollect.description", {
        success: result.success,
        skipped: result.skipped,
        failed: result.failed,
      }),
    });
    if (result.details.length > 0) {
      bulk.openDrawer();
    }
    selection.clearSelection();
    listData.refresh();
  } catch {
    toast.show({
      title: t("billing.list.toast.bulkCollect.title"),
      description: t("billing.list.toast.bulkCollect.description", {
        success: 0,
        skipped: 0,
        failed: selection.selectedIds.value.size,
      }),
    });
    if (bulk.lastResult.value) {
      bulk.openDrawer();
    }
  }
}

const paymentModalOpen = ref(false);
const paymentCaseId = ref("");
const paymentDefaultBillingPlanId = ref("");

/**
 * 打开回款登记弹窗。
 *
 * @param payload - `{ caseId, billingPlanId? }` 或兼容旧签名的案件 ID 字符串
 * @param legacyBillingPlanId - 旧签名第二参：当 `payload` 为字符串时的可选默认收费计划 ID
 */
function openPaymentModal(
  payload: { caseId: string; billingPlanId?: string } | string,
  legacyBillingPlanId?: string,
) {
  if (typeof payload === "string") {
    paymentCaseId.value = payload;
    paymentDefaultBillingPlanId.value = legacyBillingPlanId ?? "";
  } else {
    paymentCaseId.value = payload.caseId;
    paymentDefaultBillingPlanId.value = payload.billingPlanId ?? "";
  }
  paymentModalOpen.value = true;
}

const deepLinkCaseQuery = computed(() => {
  const q = route.query.case;
  return typeof q === "string" ? q : "";
});

const deepLinkBillingPlanQuery = computed(() => {
  const q = route.query.billingPlan;
  return typeof q === "string" ? q : "";
});

const deepLinkSearchHintQuery = computed(() => {
  const q = route.query.hint;
  return typeof q === "string" ? q : "";
});

const deepLinkCollectQuery = computed(() => {
  const q = route.query.collect;
  return typeof q === "string" ? q : "";
});

useBillingDeepLink({
  caseQuery: deepLinkCaseQuery,
  billingPlanQuery: deepLinkBillingPlanQuery,
  collectQuery: deepLinkCollectQuery,
  searchHintQuery: deepLinkSearchHintQuery,
  search: filters.search,
  openPaymentModal: (caseId, billingPlanId) =>
    openPaymentModal({
      caseId,
      billingPlanId: billingPlanId ?? "",
    }),
  clearQuery: () => {
    router.replace({ path: "/billing" });
  },
});

/** 关闭回款弹窗并清除 caseId。 */
function closePaymentModal() {
  paymentModalOpen.value = false;
  paymentCaseId.value = "";
  paymentDefaultBillingPlanId.value = "";
}

/** 回款提交成功后弹 toast 并刷新列表。 */
/** 回款登记成功后弹出 toast 并刷新列表。 */
function handlePaymentSubmitted() {
  toast.show({
    title: t("billing.list.toast.paymentRegistered.title"),
    description: t("billing.list.toast.paymentRegistered.description"),
  });
  closePaymentModal();
  listData.refresh();
  paymentLog.refresh();
}

async function handleVoidPayment(id: string) {
  try {
    await repo.voidPayment(id, { reasonCode: "manual_void" });
    toast.show({
      title: t("billing.list.toast.voided.title"),
      description: t("billing.list.toast.voided.description", { id }),
    });
  } catch {
    toast.show({
      title: t("billing.list.toast.voided.title"),
      description: t("billing.list.error.loadFailed"),
    });
  }
  paymentLog.refresh();
  listData.refresh();
}

async function handleReversePayment(id: string) {
  try {
    await repo.reversePayment(id, { reasonCode: "manual_reverse" });
    toast.show({
      title: t("billing.list.toast.reversed.title"),
      description: t("billing.list.toast.reversed.description", { id }),
    });
  } catch {
    toast.show({
      title: t("billing.list.toast.reversed.title"),
      description: t("billing.list.error.loadFailed"),
    });
  }
  paymentLog.refresh();
  listData.refresh();
}

/**
 * 打开风险确认弹窗。
 *
 * @param caseId 案件 ID
 */
function handleRiskAck(caseId: string) {
  riskAck.openModal(caseId);
}

async function handleRiskAckSubmit(
  input: import("./model/BillingAdapterUrls").BillingRiskAckInput,
) {
  const caseId = riskAck.targetCaseId.value;
  if (!caseId) return;
  const result = await riskAck.acknowledge(caseId, input);
  if (result) {
    riskAck.closeModal();
    listData.refresh();
  }
}

/**
 * 切换收费/入金分段标签。
 *
 * @param seg 分段类型
 */
function handleSegmentChange(seg: BillingSegment) {
  filters.switchSegment(seg);
  selection.clearSelection();
}

/**
 * 切换账单列表分页。
 *
 * @param page - 页码
 */
function handleListPageChange(page: number) {
  listData.page.value = page;
}

/**
 * 切换回款流水分页。
 *
 * @param page - 目标页码
 */
function handlePaymentLogPageChange(page: number) {
  paymentLog.page.value = page;
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
    </PageHeader>

    <BillingSummaryCards
      :card-defs="SUMMARY_CARD_DEFS"
      :summary="listData.summary.value"
    />

    <BillingFilters
      :active-segment="filters.segment.value"
      :search="filters.search.value"
      :status-filter="filters.statusFilter.value"
      :group-filter="filters.groupFilter.value"
      :owner-filter="filters.ownerFilter.value"
      :segments="BILLING_SEGMENTS"
      :status-options="BILLING_STATUS_OPTIONS"
      :group-options="groupOptions"
      :owner-options="ownerOptions"
      :filtered-count="
        filters.segment.value === 'billing-list'
          ? listData.total.value
          : paymentLog.total.value
      "
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
          :rows="listData.rows.value"
          :selected-ids="selection.selectedIds.value"
          :is-all-selected="allSelected"
          :is-indeterminate="indeterminate"
          :selectable-count="selectableCount"
          @toggle-row="selection.toggleRow"
          @toggle-all="handleToggleAll"
          @register-payment="openPaymentModal"
          @risk-ack="handleRiskAck"
        />
        <BillingPagination
          :total="listData.total.value"
          :page-size="listData.limit.value"
          :current-page="listData.page.value"
          @update:page="handleListPageChange"
        />
      </template>
      <template v-else>
        <PaymentLogTable
          :entries="paymentLog.entries.value"
          :is-manager="isManager"
          @void-payment="handleVoidPayment"
          @reverse-payment="handleReversePayment"
        />
        <BillingPagination
          :total="paymentLog.total.value"
          :page-size="paymentLog.limit.value"
          :current-page="paymentLog.page.value"
          @update:page="handlePaymentLogPageChange"
        />
      </template>
    </div>

    <PaymentModal
      v-if="paymentModalOpen && paymentCaseId"
      :open="paymentModalOpen"
      :case-id="paymentCaseId"
      :default-billing-plan-id="paymentDefaultBillingPlanId"
      :get-billing-plan-nodes="repo.getBillingPlanNodes"
      :create-payment="repo.createPayment"
      @close="closePaymentModal"
      @submitted="handlePaymentSubmitted"
    />

    <BillingCollectionDrawer
      :open="bulk.drawerOpen.value"
      :result="bulk.lastResult.value"
      @close="bulk.closeDrawer()"
    />

    <BillingRiskAckModal
      :open="riskAck.modalOpen.value"
      :case-id="riskAck.targetCaseId.value ?? ''"
      :submitting="riskAck.submitting.value"
      :error="riskAck.error.value"
      @close="riskAck.closeModal()"
      @submit="handleRiskAckSubmit"
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
