<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useOrgSettings } from "../../shared/model/useOrgSettings";
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
import { deriveDocumentSummaryCards, deriveCaseOptions } from "./fixtures";
import { getProviderLabelKey } from "./constants";
import type { DocumentListItem, WaivedReasonCode } from "./types";
import { useDocumentFilters } from "./model/useDocumentFilters";
import { useDocumentSelection } from "./model/useDocumentSelection";
import { useDocumentBulkActions } from "./model/useDocumentBulkActions";
import { useRegisterDocumentModel } from "./model/useRegisterDocumentModel";
import { useDocumentReviewModel } from "./model/useDocumentReviewModel";
import { useDocumentListModel } from "./model/useDocumentListModel";
import { createDocumentRepository } from "./model/DocumentRepository";
import { useToast } from "../../shared/model/useToast";

/** 跨案件资料一览页面。model 驱动 + loading/error 处理 + 过滤推送到 API。 */
const { t } = useI18n();
const toast = useToast();
const { isStorageRootConfigured } = useOrgSettings();
const repository = createDocumentRepository();

const filters = useDocumentFilters();
const {
  status,
  caseId,
  provider,
  search,
  apiParams,
  resetFilters,
  applySearchAndSort,
} = filters;

const listModel = useDocumentListModel({
  repository,
  fallbackToFixturesWhenEmpty: false,
  params: apiParams.value,
});

watch(apiParams, (params) => {
  clearSelection();
  listModel.refresh(params);
});

const displayItems = computed(() => applySearchAndSort(listModel.items.value));
const summaryCards = computed(() =>
  deriveDocumentSummaryCards(listModel.items.value),
);
const caseOptions = computed(() => deriveCaseOptions(listModel.items.value));

const {
  selectedIds,
  selectedCount,
  toggleAll,
  toggleRow,
  clearSelection,
  isAllSelected,
  isIndeterminate,
} = useDocumentSelection();

const allSelected = computed(() => isAllSelected(displayItems.value));
const indeterminate = computed(() => isIndeterminate(displayItems.value));

/**
 * 全选切换。
 * @param checked - 勾选状态
 */
function handleSelectAll(checked: boolean) {
  toggleAll(displayItems.value, checked);
}

/**
 * 获取已选中项。
 * @returns 已选中的资料列表
 */
function getSelectedItems() {
  return displayItems.value.filter((item) => selectedIds.value.has(item.id));
}

/**
 * API 错误 toast 通知。
 * @param error - 发生的错误
 */
function handleApiError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  toast.add({ title: msg, tone: "error" });
}

/** 重新加载列表。 */
function handleRetry() {
  listModel.refresh();
}

const {
  loading: bulkLoading,
  canRemind,
  canApprove,
  canWaive,
  bulkRemind,
  bulkApprove,
  bulkWaive,
  failedIds,
} = useDocumentBulkActions({
  getSelectedItems,
  clearSelection,
  repository,
  onSuccess: (result) => {
    const messages: Record<typeof result.action, string> = {
      remind: t("documents.list.bulk.toastRemind", {
        count: result.successCount,
      }),
      approve: t("documents.list.bulk.toastApprove", {
        count: result.successCount,
      }),
      waive: t("documents.list.bulk.toastWaive", {
        count: result.successCount,
      }),
    };
    toast.add({ title: messages[result.action] });
    if (result.failedCount > 0) {
      toast.add({
        title: t("documents.list.bulk.toastPartialFailure", {
          count: result.failedCount,
        }),
        tone: "error",
      });
    }
    listModel.refresh();
  },
  onError: (_action, error) => handleApiError(error),
});

const register = useRegisterDocumentModel({
  allItems: () => listModel.items.value,
  repository,
  onSuccess: (form) => {
    const name = form.fileName || form.relativePath.split("/").pop() || "";
    toast.add({
      title: t("documents.register.toastDesc", { fileName: name }),
    });
    listModel.refresh();
  },
  onError: handleApiError,
  isStorageRootConfigured: () => isStorageRootConfigured.value,
});

/** 操作成功后刷新列表。 */
function refreshAfterAction() {
  listModel.refresh();
}

const review = useDocumentReviewModel({
  repository,
  onApproveSuccess(item) {
    toast.add({
      title: t("documents.review.toastApproveTitle"),
      description: t("documents.review.toastApproveDesc", { name: item.name }),
    });
    refreshAfterAction();
  },
  onRejectSuccess(item) {
    toast.add({
      title: t("documents.review.toastRejectTitle"),
      description: t("documents.review.toastRejectDesc", { name: item.name }),
      tone: "warning",
    });
    refreshAfterAction();
  },
  onRemindSuccess(item) {
    toast.add({
      title: t("documents.review.toastRemindTitle"),
      description: t("documents.review.toastRemindDesc", {
        provider: item.name,
      }),
      tone: "info",
    });
    refreshAfterAction();
  },
  onReferenceSuccess(item) {
    toast.add({
      title: t("documents.review.toastReferenceTitle"),
      description: t("documents.review.toastReferenceDesc", {
        caseName: "",
        docName: item.name,
      }),
    });
    refreshAfterAction();
  },
  onError: handleApiError,
});

/**
 * 行级审批。
 *
 * @param item - 目标资料
 */
function handleRowApprove(item: DocumentListItem) {
  review.openApprove({ id: item.id, name: item.name });
}
/**
 * 行级驳回。
 *
 * @param item - 目标资料
 */
function handleRowReject(item: DocumentListItem) {
  review.openReject({ id: item.id, name: item.name });
}
/**
 * 行级催办。
 *
 * @param item - 目标资料
 */
async function handleRowRemind(item: DocumentListItem) {
  await review.confirmRemind({
    id: item.id,
    name: t(getProviderLabelKey(item.provider)),
  });
}
/** 打开批量免除对话框。 */
function handleBulkWaive() {
  review.openWaive();
}
/** 确认免除。 */
async function handleConfirmWaive() {
  if (!review.canConfirmWaive.value) return;
  await bulkWaive({
    reasonCode: review.waiveReasonCode.value as WaivedReasonCode,
    note: review.waiveNote.value.trim() || undefined,
  });
  review.closeWaive();
}
/**
 * 打开共享过期风险面板。
 *
 * @param item - 目标资料
 */
function handleOpenRiskPanel(item: DocumentListItem) {
  review.openRiskPanel({ id: item.id, name: item.name });
}
/**
 * 行级引用版本对话框。
 *
 * @param item - 目标资料
 */
function handleRowReference(item: DocumentListItem) {
  review.openReference({ id: item.id, name: item.name });
}
/** 确认引用版本。 */
async function handleConfirmReference() {
  await review.confirmReference();
}

void handleRowReference;
void failedIds;
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
        <div
          class="document-list-view__register-wrap"
          :title="
            isStorageRootConfigured
              ? undefined
              : t('documents.storageGate.buttonTooltip')
          "
        >
          <Button
            variant="filled"
            tone="primary"
            :disabled="!isStorageRootConfigured"
            @click="register.openModal()"
          >
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
        </div>
      </template>
    </PageHeader>

    <div
      v-if="!isStorageRootConfigured"
      class="document-list-view__alert document-list-view__alert--warning"
      role="alert"
    >
      <div>
        <p class="document-list-view__alert-title">
          {{ t("documents.storageGate.title") }}
        </p>
        <i18n-t
          keypath="documents.storageGate.description"
          tag="p"
          class="document-list-view__alert-desc"
        >
          <template #link>
            <RouterLink
              to="/settings?tab=storage-root"
              class="document-list-view__settings-link"
            >
              {{ t("documents.storageGate.settingsLinkText") }}
            </RouterLink>
          </template>
        </i18n-t>
      </div>
    </div>

    <div
      v-if="listModel.errorCode.value"
      class="document-list-view__alert document-list-view__alert--danger"
      role="alert"
      data-testid="list-error-banner"
    >
      <div class="document-list-view__alert-row">
        <p class="document-list-view__alert-title">
          {{
            listModel.errorCode.value === "unauthorized"
              ? t("documents.list.errorUnauthorized")
              : t("documents.list.errorRequestFailed")
          }}
        </p>
        <Button
          v-if="listModel.errorCode.value !== 'unauthorized'"
          variant="outlined"
          size="sm"
          data-testid="list-retry-button"
          @click="handleRetry"
        >
          {{ t("documents.list.retry") }}
        </Button>
      </div>
    </div>

    <DocumentSummaryCards :cards="summaryCards" />

    <DocumentFilters
      :status="status"
      :case-id="caseId"
      :provider="provider"
      :search="search"
      :case-options="caseOptions"
      :filtered-count="displayItems.length"
      @update:status="status = $event"
      @update:case-id="caseId = $event"
      @update:provider="provider = $event"
      @update:search="search = $event"
      @reset-filters="resetFilters"
    />

    <div class="document-list-view__table-card">
      <div
        v-if="listModel.loading.value"
        class="document-list-view__loading-bar"
        role="status"
        data-testid="list-loading"
      >
        <div class="document-list-view__loading-bar-inner" />
      </div>

      <DocumentBulkActionBar
        :selected-count="selectedCount"
        :can-remind="canRemind"
        :can-approve="canApprove"
        :can-waive="canWaive"
        :loading="bulkLoading"
        @clear="clearSelection"
        @bulk-remind="bulkRemind"
        @bulk-approve="bulkApprove"
        @bulk-waive="handleBulkWaive"
      />
      <DocumentTable
        :items="displayItems"
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
        :page="listModel.page.value"
        :limit="listModel.limit.value"
        :total="listModel.total.value"
        @prev="
          clearSelection();
          listModel.prevPage();
        "
        @next="
          clearSelection();
          listModel.nextPage();
        "
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
      @confirm="review.confirmApprove()"
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
      @confirm="review.confirmReject()"
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
      :candidates="review.referenceCandidates.value"
      :selected-id="review.selectedReferenceId.value"
      :can-confirm="review.canConfirmReference.value"
      :loading="review.referenceCandidatesLoading.value"
      @close="review.closeReference()"
      @update:selected-id="review.selectedReferenceId.value = $event"
      @confirm="handleConfirmReference"
    />

    <SharedExpiryRiskPanel
      :open="review.riskPanelOpen.value"
      :data="review.riskData.value"
      :loading="review.riskLoading.value"
      @close="review.closeRiskPanel()"
    />
  </div>
</template>

<style scoped src="./DocumentListView.css"></style>
