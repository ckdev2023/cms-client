<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import DocumentSummaryCards from "./components/DocumentSummaryCards.vue";
import DocumentFilters from "./components/DocumentFilters.vue";
import DocumentTable from "./components/DocumentTable.vue";
import DocumentPagination from "./components/DocumentPagination.vue";
import DocumentBulkActionBar from "./components/DocumentBulkActionBar.vue";
import RegisterDocumentModal from "./components/RegisterDocumentModal.vue";
import ReviewDocumentModal from "./components/ReviewDocumentModal.vue";
import WaiveReasonModal from "./components/WaiveReasonModal.vue";
import ReferenceVersionModal from "./components/ReferenceVersionModal.vue";
import SharedExpiryRiskPanel from "./components/SharedExpiryRiskPanel.vue";
import {
  SAMPLE_DOCUMENTS,
  SAMPLE_REFERENCE_CANDIDATES,
  SAMPLE_RISK_DATA,
  deriveDocumentSummaryCards,
  deriveCaseOptions,
} from "./fixtures";
import { getProviderLabel } from "./constants";
import type { DocumentListItem } from "./types";
import { useDocumentFilters } from "./model/useDocumentFilters";
import { useDocumentSelection } from "./model/useDocumentSelection";
import { useDocumentBulkActions } from "./model/useDocumentBulkActions";
import { useRegisterDocumentModel } from "./model/useRegisterDocumentModel";
import { useDocumentReviewModel } from "./model/useDocumentReviewModel";
import type { BulkActionType } from "./model/useDocumentBulkActions";

/** 资料中心列表页：展示资料汇总统计、筛选与分页表格。 */
const { t } = useI18n();

const { status, caseId, provider, search, resetFilters, applyFilters } =
  useDocumentFilters();

const filteredItems = computed(() => applyFilters(SAMPLE_DOCUMENTS));
const summaryCards = computed(() =>
  deriveDocumentSummaryCards(SAMPLE_DOCUMENTS),
);
const caseOptions = computed(() => deriveCaseOptions(SAMPLE_DOCUMENTS));

const {
  selectedIds,
  selectedCount,
  toggleAll,
  toggleRow,
  clearSelection,
  isAllSelected,
  isIndeterminate,
} = useDocumentSelection();

const allSelected = computed(() => isAllSelected(filteredItems.value));
const indeterminate = computed(() => isIndeterminate(filteredItems.value));

/**
 * 全选/取消全选文档。
 *
 * @param checked - 是否全选
 */
function handleSelectAll(checked: boolean) {
  toggleAll(filteredItems.value, checked);
}

/**
 * 批量操作后显示提示。
 *
 * @param action - 批量操作类型
 * @param count - 选中文档数量
 */
function handleToast(action: BulkActionType, count: number) {
  const messages: Record<BulkActionType, string> = {
    remind: t("documents.list.bulk.toastRemind", { count }),
    approve: t("documents.list.bulk.toastApprove", { count }),
    waive: t("documents.list.bulk.toastWaive", { count }),
  };
  window.alert(messages[action]);
}

/**
 * 获取当前选中的文档列表。
 *
 * @returns 已勾选的文档数组
 */
function getSelectedItems() {
  return filteredItems.value.filter((item) => selectedIds.value.has(item.id));
}

const { loading, canRemind, canApprove, canWaive, bulkRemind, bulkApprove } =
  useDocumentBulkActions({
    getSelectedItems,
    clearSelection,
    onToast: handleToast,
  });

const register = useRegisterDocumentModel({
  allItems: () => SAMPLE_DOCUMENTS,
  onSubmit: (form) => {
    const name = form.fileName || form.relativePath.split("/").pop() || "";
    window.alert(t("documents.register.toastDesc", { fileName: name }));
  },
});

const review = useDocumentReviewModel();

/**
 * 行级审核通过：打开审核确认弹窗。
 *
 * @param item - 目标资料项
 */
function handleRowApprove(item: DocumentListItem) {
  review.openApprove({ id: item.id, name: item.name });
}

/**
 * 确认审核通过后弹 toast 并关闭弹窗。
 */
function handleConfirmApprove() {
  if (!review.approveTarget.value) return;
  const name = review.approveTarget.value.name;
  window.alert(
    `${t("documents.review.toastApproveTitle")}: ${t("documents.review.toastApproveDesc", { name })}`,
  );
  review.closeApprove();
}

/**
 * 行级退回补正：打开退回弹窗。
 *
 * @param item - 目标资料项
 */
function handleRowReject(item: DocumentListItem) {
  review.openReject({ id: item.id, name: item.name });
}

/**
 * 确认退回补正后弹 toast 并关闭弹窗。
 */
function handleConfirmReject() {
  if (!review.rejectTarget.value || !review.canConfirmReject.value) return;
  const name = review.rejectTarget.value.name;
  window.alert(
    `${t("documents.review.toastRejectTitle")}: ${t("documents.review.toastRejectDesc", { name })}`,
  );
  review.closeReject();
}

/**
 * 行级催办：直接弹 toast，无需弹窗。
 *
 * @param item - 目标资料项
 */
function handleRowRemind(item: DocumentListItem) {
  const provLabel = getProviderLabel(item.provider);
  window.alert(
    `${t("documents.review.toastRemindTitle")}: ${t("documents.review.toastRemindDesc", { provider: provLabel })}`,
  );
}

/**
 * 批量标记无需提供：打开 waive 原因弹窗。
 */
function handleBulkWaive() {
  review.openWaive();
}

/**
 * 确认 waive 原因后弹 toast、清除选择并关闭弹窗。
 */
function handleConfirmWaive() {
  if (!review.canConfirmWaive.value) return;
  const items = getSelectedItems();
  const count = items.length;
  if (count > 0) {
    window.alert(t("documents.list.bulk.toastWaive", { count }));
    clearSelection();
  }
  review.closeWaive();
}

/**
 * 打开共享版本过期风险面板。
 */
function handleOpenRiskPanel() {
  review.openRiskPanel();
}

/**
 * 行级引用既有版本：打开引用选择弹窗。
 *
 * @param item - 目标资料项
 */
function handleRowReference(item: DocumentListItem) {
  review.openReference({ id: item.id, name: item.name });
}

/**
 * 确认引用后弹 toast 并关闭弹窗。
 */
function handleConfirmReference() {
  if (!review.referenceTarget.value || !review.canConfirmReference.value)
    return;
  const candidate = SAMPLE_REFERENCE_CANDIDATES.find(
    (c) => c.id === review.selectedReferenceId.value,
  );
  if (candidate) {
    window.alert(
      `${t("documents.review.toastReferenceTitle")}: ${t("documents.review.toastReferenceDesc", { caseName: candidate.sourceCaseName, docName: candidate.sourceDocName })}`,
    );
  }
  review.closeReference();
}

void handleRowReference;
</script>

<template>
  <div class="document-list-view">
    <PageHeader
      :title="t('documents.list.title')"
      :subtitle="t('documents.list.subtitle')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '/' },
        { label: t('shell.nav.groups.content') },
        { label: t('documents.list.title') },
      ]"
    >
      <template #actions>
        <Button variant="filled" tone="primary" @click="register.openModal()">
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
          {{ t("documents.list.registerDocument") }}
        </Button>
      </template>
    </PageHeader>

    <DocumentSummaryCards :cards="summaryCards" />

    <DocumentFilters
      :status="status"
      :case-id="caseId"
      :provider="provider"
      :search="search"
      :case-options="caseOptions"
      :filtered-count="filteredItems.length"
      @update:status="status = $event"
      @update:case-id="caseId = $event"
      @update:provider="provider = $event"
      @update:search="search = $event"
      @reset-filters="resetFilters"
    />

    <div class="document-list-view__table-card">
      <DocumentBulkActionBar
        :selected-count="selectedCount"
        :can-remind="canRemind"
        :can-approve="canApprove"
        :can-waive="canWaive"
        :loading="loading"
        @clear="clearSelection"
        @bulk-remind="bulkRemind"
        @bulk-approve="bulkApprove"
        @bulk-waive="handleBulkWaive"
      />
      <DocumentTable
        :items="filteredItems"
        :selected-ids="selectedIds"
        :all-selected="allSelected"
        :indeterminate="indeterminate"
        @select-all="handleSelectAll"
        @select-row="toggleRow"
        @approve="handleRowApprove"
        @reject="handleRowReject"
        @remind="handleRowRemind"
        @open-risk-panel="handleOpenRiskPanel"
      />
      <DocumentPagination
        :start="filteredItems.length > 0 ? 1 : 0"
        :end="filteredItems.length"
        :total="filteredItems.length"
      />
    </div>

    <RegisterDocumentModal
      :open="register.open.value"
      :form="register.form.value"
      :path-error="register.pathError.value"
      :case-options="register.caseOptions.value"
      :doc-item-options="register.docItemOptions.value"
      :version-label="register.versionLabel.value"
      :can-submit="register.canSubmit.value"
      @close="register.closeModal()"
      @update:field="(field, value) => register.updateField(field, value)"
      @submit="register.submit()"
    />

    <ReviewDocumentModal
      v-if="review.approveOpen.value"
      :open="review.approveOpen.value"
      mode="approve"
      :doc-name="review.approveTarget.value?.name ?? ''"
      :can-confirm="true"
      @close="review.closeApprove()"
      @confirm="handleConfirmApprove"
    />

    <ReviewDocumentModal
      v-if="review.rejectOpen.value"
      :open="review.rejectOpen.value"
      mode="reject"
      :doc-name="review.rejectTarget.value?.name ?? ''"
      :reject-reason="review.rejectReason.value"
      :can-confirm="review.canConfirmReject.value"
      @close="review.closeReject()"
      @update:reject-reason="review.rejectReason.value = $event"
      @confirm="handleConfirmReject"
    />

    <WaiveReasonModal
      :open="review.waiveOpen.value"
      :target-label="review.waiveTargetLabel.value"
      :reason-code="review.waiveReasonCode.value"
      :reason-note="review.waiveNote.value"
      :note-required="review.waiveNoteRequired.value"
      :can-confirm="review.canConfirmWaive.value"
      @close="review.closeWaive()"
      @update:reason-code="review.waiveReasonCode.value = $event"
      @update:reason-note="review.waiveNote.value = $event"
      @confirm="handleConfirmWaive"
    />

    <ReferenceVersionModal
      v-if="review.referenceOpen.value"
      :open="review.referenceOpen.value"
      :doc-name="review.referenceTarget.value?.name ?? ''"
      :candidates="SAMPLE_REFERENCE_CANDIDATES"
      :selected-id="review.selectedReferenceId.value"
      :can-confirm="review.canConfirmReference.value"
      @close="review.closeReference()"
      @update:selected-id="review.selectedReferenceId.value = $event"
      @confirm="handleConfirmReference"
    />

    <SharedExpiryRiskPanel
      :open="review.riskPanelOpen.value"
      :data="SAMPLE_RISK_DATA"
      @close="review.closeRiskPanel()"
    />
  </div>
</template>

<style scoped>
.document-list-view {
  display: grid;
  gap: 24px;
}

.document-list-view__table-card {
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  overflow: hidden;
}
</style>
