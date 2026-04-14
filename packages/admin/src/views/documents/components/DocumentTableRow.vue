<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { DocumentListItem } from "../types";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_PROVIDERS,
  DOCUMENT_STATUS_TONE,
} from "../constants";
import { isSelectableForBatch } from "../validation";

/** 资料表格行：checkbox、资料名、案件链接、状态徽章、截止日与路径展示。 */
const { t } = useI18n();

const props = defineProps<{
  item: DocumentListItem;
  selected?: boolean;
}>();

defineEmits<{
  select: [id: string, checked: boolean];
  approve: [item: DocumentListItem];
  reject: [item: DocumentListItem];
  remind: [item: DocumentListItem];
  openRiskPanel: [item: DocumentListItem];
}>();

const canReview = computed(() => props.item.status === "uploaded_reviewing");
const canRemind = computed(
  () => props.item.status === "pending" || props.item.status === "rejected",
);
const isWaived = computed(() => props.item.status === "waived");
const isExpired = computed(() => props.item.status === "expired");

const statusLabel = computed(() => DOCUMENT_STATUSES[props.item.status].label);
const statusTone = computed(() => DOCUMENT_STATUS_TONE[props.item.status]);
const providerLabel = computed(
  () => DOCUMENT_PROVIDERS[props.item.provider].label,
);
const caseHref = computed(() => `#/cases/${props.item.caseId}?tab=documents`);

const pathDisplay = computed(
  () => props.item.relativePath ?? t("documents.list.pathNotRegistered"),
);
const hasPath = computed(() => props.item.relativePath !== null);
const isSelectable = computed(() => isSelectableForBatch(props.item.status));
</script>

<template>
  <tr
    :class="[
      'doc-row',
      {
        'doc-row--waived': isWaived,
        'doc-row--expired': isExpired,
      },
    ]"
  >
    <td class="doc-row__td-check">
      <input
        type="checkbox"
        class="doc-row__checkbox"
        :checked="selected"
        :disabled="!isSelectable"
        :aria-label="item.name"
        @change="
          $emit('select', item.id, ($event.target as HTMLInputElement).checked)
        "
      />
    </td>
    <td>
      <div class="doc-row__name-cell">
        <span
          :class="['doc-row__name', { 'doc-row__name--waived': isWaived }]"
          >{{ item.name }}</span
        >
        <span
          v-if="item.sharedExpiryRisk"
          class="doc-row__risk-badge"
          :title="t('documents.list.summary.sharedExpiryRisk')"
        >
          !
        </span>
        <span v-if="item.referenceCount > 1" class="doc-row__ref-count">
          ×{{ item.referenceCount }}
        </span>
      </div>
    </td>

    <td>
      <a class="doc-row__case-link" :href="caseHref">
        {{ item.caseName }}
      </a>
    </td>

    <td class="doc-row__hide-md">{{ providerLabel }}</td>

    <td>
      <Chip :tone="statusTone" size="sm" dot>{{ statusLabel }}</Chip>
    </td>

    <td class="doc-row__hide-md">
      <span
        :class="[
          'doc-row__due',
          { 'doc-row__due--expired': item.status === 'expired' },
        ]"
      >
        {{ item.dueDateLabel }}
      </span>
    </td>

    <td class="doc-row__hide-lg">
      {{ item.lastReminderAtLabel }}
    </td>

    <td class="doc-row__hide-lg">
      <span
        :class="['doc-row__path', { 'doc-row__path--empty': !hasPath }]"
        :title="hasPath ? item.relativePath! : undefined"
      >
        {{ pathDisplay }}
      </span>
    </td>

    <td class="doc-row__actions doc-row__hide-md">
      <div class="doc-row__action-group">
        <template v-if="canReview">
          <button
            class="doc-row__action doc-row__action--approve"
            type="button"
            @click="$emit('approve', item)"
          >
            {{ t("documents.actions.approve") }}
          </button>
          <button
            class="doc-row__action doc-row__action--reject"
            type="button"
            @click="$emit('reject', item)"
          >
            {{ t("documents.actions.reject") }}
          </button>
        </template>
        <button
          v-if="canRemind"
          class="doc-row__action doc-row__action--remind"
          type="button"
          @click="$emit('remind', item)"
        >
          {{ t("documents.actions.remind") }}
        </button>
        <button
          v-if="item.sharedExpiryRisk"
          class="doc-row__action doc-row__action--risk"
          type="button"
          @click="$emit('openRiskPanel', item)"
        >
          {{ t("documents.actions.riskDetail") }}
        </button>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.doc-row__td-check {
  width: 44px;
  text-align: center;
  padding: 12px 8px;
  vertical-align: middle;
}

.doc-row__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.doc-row__checkbox:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.doc-row td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  vertical-align: middle;
}

.doc-row:last-child td {
  border-bottom: none;
}

.doc-row__name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-row__name {
  font-weight: var(--font-weight-semibold);
}

.doc-row__name--waived {
  text-decoration: line-through;
  color: var(--color-text-3);
}

.doc-row--waived {
  opacity: 0.6;
}

.doc-row--expired {
  background: rgba(220, 38, 38, 0.04);
}

.doc-row__risk-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: rgba(220, 38, 38, 0.1);
  color: var(--color-danger);
  font-size: 11px;
  font-weight: var(--font-weight-extrabold);
  flex-shrink: 0;
}

.doc-row__ref-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.doc-row__case-link {
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
  transition: color var(--transition-normal);
}

.doc-row__case-link:hover {
  text-decoration: underline;
}

.doc-row__hide-md {
  color: var(--color-text-2);
}

.doc-row__hide-lg {
  color: var(--color-text-2);
}

@media (max-width: 767px) {
  .doc-row__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .doc-row__hide-lg {
    display: none;
  }
}

.doc-row__due--expired {
  color: var(--color-danger);
  font-weight: var(--font-weight-semibold);
}

.doc-row__path {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.doc-row__path--empty {
  color: var(--color-text-3);
  font-style: italic;
}

.doc-row__actions {
  white-space: nowrap;
}

.doc-row__action-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.doc-row__action {
  all: unset;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  padding: 2px 8px;
  border-radius: var(--radius-default);
  cursor: pointer;
  transition:
    background-color var(--transition-normal),
    color var(--transition-normal);
}

.doc-row__action--approve {
  color: var(--color-success, #16a34a);
}

.doc-row__action--approve:hover {
  background: rgba(22, 163, 74, 0.08);
}

.doc-row__action--reject {
  color: var(--color-danger, #dc2626);
}

.doc-row__action--reject:hover {
  background: rgba(220, 38, 38, 0.08);
}

.doc-row__action--remind {
  color: var(--color-primary-6);
}

.doc-row__action--remind:hover {
  background: rgba(59, 130, 246, 0.08);
}

.doc-row__action--risk {
  color: var(--color-danger, #dc2626);
}

.doc-row__action--risk:hover {
  background: rgba(220, 38, 38, 0.08);
}
</style>
