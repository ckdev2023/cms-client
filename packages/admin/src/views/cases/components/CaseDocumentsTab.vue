<script setup lang="ts">
import { computed, toRef } from "vue";
import { useI18n } from "vue-i18n";
import { useOrgSettings } from "../../../shared/model/useOrgSettings";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import CaseDocumentRow from "./CaseDocumentRow.vue";
import RegisterDocumentModal from "../../documents/components/RegisterDocumentModal.vue";
import ReviewDocumentModal from "../../documents/components/ReviewDocumentModal.vue";
import WaiveReasonModal from "../../documents/components/WaiveReasonModal.vue";
import ReferenceVersionModal from "../../documents/components/ReferenceVersionModal.vue";
import AddDocumentItemModal from "../../documents/components/AddDocumentItemModal.vue";
import type { CaseDetail } from "../types-detail";
import {
  computeProviderStat,
  computeCaseDocumentCompletionRate,
  isDocumentListEmpty,
} from "../model/caseDocumentStats";
import { useCaseDocumentsTab } from "../model/useCaseDocumentsTab";

/** 文書管理 Tab：按提供者分组展示进度与文書清单，含空状态与动态完成率。 */
const { t } = useI18n();
const { isStorageRootConfigured } = useOrgSettings();

const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const {
  listModel,
  documentGroups,
  hasApiData,
  viewState,
  apiCompletionRate,
  review,
  register,
  addItem,
  handleRowApprove,
  handleRowReject,
  handleRowRemind,
  handleRowRegister,
  handleRowReference,
  handleRowWaive,
  handleConfirmWaive,
  handleConfirmReference,
  handleRegisterClick,
  handleAddItemClick,
} = useCaseDocumentsTab({
  caseId: toRef(() => props.detail.id),
  isStorageRootConfigured,
  documentTemplateMissing: toRef(() => props.detail.documentTemplateMissing),
});

const activeGroups = computed(() =>
  hasApiData.value ? documentGroups.value : props.detail.documents,
);

const isEmpty = computed(() => isDocumentListEmpty(activeGroups.value));

const effectiveViewState = computed(() => {
  if (!isEmpty.value) return "ready";
  return viewState.value;
});

const overallRate = computed(
  () =>
    apiCompletionRate.value ??
    computeCaseDocumentCompletionRate(activeGroups.value),
);

const groupStats = computed(() =>
  activeGroups.value.map((g) => ({
    group: g,
    stat: computeProviderStat(g),
  })),
);
</script>

<template>
  <div class="docs-tab">
    <!-- Storage gate alert: only shown for storageGateBlocked state -->
    <div
      v-if="effectiveViewState === 'storageGateBlocked'"
      class="docs-tab__storage-gate"
      role="alert"
    >
      <svg
        class="docs-tab__gate-icon"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <div>
        <p class="docs-tab__gate-title">
          {{ t("documents.storageGate.title") }}
        </p>
        <i18n-t
          keypath="documents.storageGate.description"
          tag="p"
          class="docs-tab__gate-desc"
        >
          <template #link>
            <RouterLink
              to="/settings?tab=storage-root"
              class="docs-tab__gate-link"
            >
              {{ t("documents.storageGate.settingsLinkText") }}
            </RouterLink>
          </template>
        </i18n-t>
      </div>
    </div>

    <!-- Readonly notice for terminal cases -->
    <div v-if="readonly" class="docs-tab__readonly-notice" role="status">
      {{ t("cases.detail.documents.readonlyNotice") }}
    </div>

    <!-- Template missing state -->
    <Card v-if="effectiveViewState === 'templateMissing'" padding="md">
      <div class="docs-tab__empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="docs-tab__empty-icon"
        >
          <path
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="docs-tab__empty-title">{{
          t("cases.detail.documents.empty.templateMissing.title")
        }}</span>
        <span class="docs-tab__empty-desc">
          {{ t("cases.detail.documents.empty.templateMissing.desc") }}
        </span>
      </div>
    </Card>

    <!-- Empty state (template exists, but no documents yet) -->
    <Card
      v-else-if="
        effectiveViewState === 'empty' ||
        effectiveViewState === 'storageGateBlocked'
      "
      padding="md"
    >
      <div class="docs-tab__empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="docs-tab__empty-icon"
        >
          <path
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="docs-tab__empty-title">{{
          t("cases.detail.documents.empty.title")
        }}</span>
        <span class="docs-tab__empty-desc">
          {{ t("cases.detail.documents.empty.desc") }}
        </span>
        <div v-if="!readonly" class="docs-tab__empty-actions">
          <span
            :title="
              isStorageRootConfigured
                ? undefined
                : t('documents.storageGate.buttonTooltip')
            "
          >
            <Button
              variant="filled"
              tone="primary"
              size="sm"
              :disabled="!isStorageRootConfigured"
              @click="handleRegisterClick(detail.id)"
              >{{ t("cases.detail.documents.empty.registerCta") }}</Button
            >
          </span>
          <Button size="sm" @click="handleAddItemClick(detail.id)">{{
            t("cases.detail.documents.empty.addCta")
          }}</Button>
        </div>
      </div>
    </Card>

    <template v-else>
      <!-- Provider progress -->
      <Card padding="md">
        <div class="docs-tab__progress-header">
          <span class="docs-tab__kicker">{{
            t("cases.detail.documents.provider.kicker")
          }}</span>
          <span class="docs-tab__progress-title">{{
            t("cases.detail.documents.provider.title")
          }}</span>
        </div>
        <div class="docs-tab__progress-list">
          <div
            v-for="(p, i) in detail.providerProgress"
            :key="i"
            class="docs-tab__progress-row"
          >
            <span class="docs-tab__progress-label">{{ t(p.labelKey) }}</span>
            <div class="docs-tab__progress-bar">
              <div
                class="docs-tab__progress-bar-fill"
                :style="{
                  width: `${p.total === 0 ? 0 : Math.round((p.done / p.total) * 100)}%`,
                }"
              />
            </div>
            <span class="docs-tab__progress-count"
              >{{ p.done }}/{{ p.total }}</span
            >
          </div>
        </div>
      </Card>

      <!-- Document groups -->
      <Card padding="none">
        <template #header>
          <div class="docs-tab__card-header">
            <div class="docs-tab__card-header-top">
              <h2 class="docs-tab__section-title">
                {{ t("cases.detail.documents.section.title") }}
              </h2>
              <div v-if="!readonly" class="docs-tab__header-actions">
                <span
                  class="docs-tab__register-wrap"
                  :title="
                    isStorageRootConfigured
                      ? undefined
                      : t('documents.storageGate.buttonTooltip')
                  "
                >
                  <Button
                    variant="filled"
                    tone="primary"
                    size="sm"
                    :disabled="!isStorageRootConfigured"
                    @click="handleRegisterClick(detail.id)"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    {{ t("cases.detail.documents.section.registerCta") }}
                  </Button>
                </span>
                <Button size="sm" @click="handleAddItemClick(detail.id)">
                  <svg
                    width="14"
                    height="14"
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
                  {{ t("cases.detail.documents.section.addCta") }}
                </Button>
              </div>
            </div>
            <div class="docs-tab__global-progress">
              <div class="docs-tab__global-progress-track">
                <div
                  class="docs-tab__global-progress-fill"
                  :style="{ width: `${overallRate.percent}%` }"
                />
              </div>
              <span class="docs-tab__global-progress-label">
                {{
                  overallRate.total === 0
                    ? t("cases.detail.documents.completion.empty")
                    : t("cases.detail.documents.completion.label", {
                        collected: overallRate.collected,
                        total: overallRate.total,
                      })
                }}（{{ overallRate.percent }}%）
              </span>
            </div>
          </div>
        </template>

        <div
          v-for="({ group, stat }, gi) in groupStats"
          :key="gi"
          class="docs-tab__group"
        >
          <div class="docs-tab__group-header">
            <div class="docs-tab__group-header-row">
              <span class="docs-tab__group-title">{{ group.group }}</span>
              <span class="docs-tab__group-count">{{
                stat.total === 0
                  ? t("cases.detail.documents.completion.empty")
                  : t("cases.detail.documents.completion.label", {
                      collected: stat.collected,
                      total: stat.total,
                    })
              }}</span>
            </div>
            <div class="docs-tab__group-bar">
              <div
                class="docs-tab__group-bar-fill"
                :class="{
                  'docs-tab__group-bar-fill--complete': stat.percent === 100,
                }"
                :style="{ width: `${stat.percent}%` }"
              />
            </div>
          </div>
          <CaseDocumentRow
            v-for="(item, ii) in group.items"
            :key="ii"
            :item="item"
            :readonly="readonly"
            :storage-root-configured="isStorageRootConfigured"
            @approve="handleRowApprove"
            @reject="handleRowReject"
            @remind="handleRowRemind"
            @register="handleRowRegister"
            @reference="handleRowReference"
            @waive="handleRowWaive"
          />
          <div v-if="group.items.length === 0" class="docs-tab__group-empty">
            {{ t("cases.detail.documents.groupEmpty") }}
          </div>
        </div>
      </Card>
    </template>

    <div v-if="listModel.loading.value" class="docs-tab__loading" role="status">
      <div class="docs-tab__loading-bar" />
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

    <AddDocumentItemModal
      :open="addItem.open.value"
      :name="addItem.form.value.name"
      :owner-side="addItem.form.value.ownerSide"
      :due-at="addItem.form.value.dueAt"
      :note="addItem.form.value.note"
      :can-submit="addItem.canSubmit.value"
      :submitting="addItem.submitting.value"
      @close="addItem.closeModal()"
      @update:name="addItem.updateField('name', $event)"
      @update:owner-side="addItem.updateField('ownerSide', $event)"
      @update:due-at="addItem.updateField('dueAt', $event)"
      @update:note="addItem.updateField('note', $event)"
      @submit="addItem.submit()"
    />
  </div>
</template>

<style scoped src="./CaseDocumentsTab.css"></style>
