<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import CaseDocumentDetail from "./CaseDocumentDetail.vue";
import type { DocumentItem } from "../types-detail";
import { getStatusTone } from "../../documents/constants";

/** 文書行组件：展示单项文書的状态、名称、路径、行内操作与可展开详情。 */
const { t } = useI18n();

const STATUS_ICON_MAP: Record<string, { color: string; path: string }> = {
  approved: {
    color: "var(--color-success)",
    path: "M9 12l2 2 4-4",
  },
  uploaded_reviewing: {
    color: "var(--color-success)",
    path: "M9 12l2 2 4-4",
  },
  waiting_upload: {
    color: "#f59e0b",
    path: "M12 8v4m0 4h.01",
  },
  not_sent: {
    color: "var(--color-text-3)",
    path: "M12 8v4m0 4h.01",
  },
  revision_required: {
    color: "var(--color-danger)",
    path: "M6 18L18 6M6 6l12 12",
  },
  rejected: {
    color: "var(--color-danger)",
    path: "M6 18L18 6M6 6l12 12",
  },
  expired: {
    color: "var(--color-danger)",
    path: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
  waived: {
    color: "var(--color-text-3)",
    path: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  },
};

/**
 * 根据文書状态返回图标配色与路径。
 *
 * @param item - 文書条目
 * @returns 图标颜色和 SVG 路径
 */
function iconFor(item: DocumentItem) {
  return (
    STATUS_ICON_MAP[item.status] ?? {
      color: "var(--color-text-3)",
      path: "M12 8v4m0 4h.01",
    }
  );
}

/**
 * 根据文書状态返回 Chip 语义色调（使用共享状态映射）。
 *
 * @param item - 文書条目
 * @returns Chip 语义色调
 */
function chipTone(item: DocumentItem): ChipTone {
  return getStatusTone(item.status) as ChipTone;
}

const props = defineProps<{
  item: DocumentItem;
  readonly: boolean;
  storageRootConfigured?: boolean;
}>();

const emit = defineEmits<{
  approve: [item: DocumentItem];
  reject: [item: DocumentItem];
  remind: [item: DocumentItem];
  waive: [item: DocumentItem];
  register: [item: DocumentItem];
  reference: [item: DocumentItem];
}>();

const expanded = ref(false);

const hasPath = computed(
  () => props.item.relativePath != null && props.item.relativePath !== "",
);

const hasExpandableContent = computed(() => {
  const { versions, reviews, reminders } = props.item;
  return (
    (versions && versions.length > 0) ||
    (reviews && reviews.length > 0) ||
    (reminders && reminders.length > 0)
  );
});

const hasRefLabel = computed(
  () => props.item.referenceLabel != null && props.item.referenceLabel !== "",
);

const showRefCount = computed(() => (props.item.referenceCount ?? 0) > 1);

const acts = computed(() => props.item.actions ?? {});

/** 切换展开/收起状态。 */
function toggle() {
  if (hasExpandableContent.value) {
    expanded.value = !expanded.value;
  }
}
</script>

<template>
  <div
    :class="[
      'doc-row',
      {
        'doc-row--waived': item.status === 'waived',
        'doc-row--expired': item.status === 'expired',
        'doc-row--expandable': hasExpandableContent,
        'doc-row--expanded': expanded,
      },
    ]"
  >
    <div class="doc-row__main" @click="toggle">
      <div class="doc-row__left">
        <svg
          v-if="hasExpandableContent"
          :class="['doc-row__chevron', { 'doc-row__chevron--open': expanded }]"
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
          <path d="M9 5l7 7-7 7" />
        </svg>
        <svg
          class="doc-row__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          :style="{ color: iconFor(item).color }"
        >
          <path :d="iconFor(item).path" />
        </svg>
        <div class="doc-row__info">
          <div
            :class="[
              'doc-row__name',
              { 'doc-row__name--waived': item.status === 'waived' },
            ]"
          >
            {{ item.name }}
          </div>
          <div
            :class="[
              'doc-row__meta',
              { 'doc-row__meta--danger': item.status === 'expired' },
            ]"
          >
            {{ item.meta }}
          </div>
          <div v-if="hasPath" class="doc-row__path" :title="item.relativePath!">
            {{ item.relativePath }}
          </div>
          <div v-if="hasRefLabel" class="doc-row__ref">
            {{ item.referenceLabel }}
            <span v-if="showRefCount" class="doc-row__ref-count">
              · 当前 {{ item.referenceCount }} 个案件引用此版本
            </span>
          </div>
        </div>
      </div>
      <div class="doc-row__right">
        <Chip :tone="chipTone(item)" size="sm" dot>
          {{ item.statusLabel }}
        </Chip>
      </div>
    </div>

    <div v-if="!readonly" class="doc-row__actions">
      <Button
        v-if="acts.canApprove"
        size="sm"
        variant="ghost"
        tone="primary"
        @click.stop="emit('approve', item)"
      >
        {{ t("documents.actions.approve") }}
      </Button>
      <Button
        v-if="acts.canReject"
        size="sm"
        variant="ghost"
        tone="danger"
        @click.stop="emit('reject', item)"
      >
        {{ t("documents.actions.reject") }}
      </Button>
      <Button
        v-if="acts.canRemind"
        size="sm"
        variant="ghost"
        @click.stop="emit('remind', item)"
      >
        {{ t("documents.actions.remind") }}
      </Button>
      <span
        v-if="acts.canRegister"
        :title="
          props.storageRootConfigured === false
            ? t('documents.storageGate.buttonTooltip')
            : undefined
        "
      >
        <Button
          size="sm"
          variant="ghost"
          :disabled="props.storageRootConfigured === false"
          @click.stop="emit('register', item)"
        >
          {{ t("documents.actions.register") }}
        </Button>
      </span>
      <Button
        v-if="acts.canReference"
        size="sm"
        variant="ghost"
        @click.stop="emit('reference', item)"
      >
        {{ t("documents.actions.reference") }}
      </Button>
      <button
        v-if="acts.canWaive || (item.canWaive && !acts.canWaive)"
        type="button"
        class="doc-row__waive-btn"
        @click.stop="emit('waive', item)"
      >
        {{ t("documents.actions.waive") }}
      </button>
    </div>

    <CaseDocumentDetail v-if="expanded" :item="item" />
  </div>
</template>

<style scoped>
.doc-row {
  border-bottom: 1px solid var(--color-border-1);
  transition: background-color 0.15s;
}

.doc-row:last-child {
  border-bottom: none;
}

.doc-row:hover {
  background: var(--color-bg-3);
}

.doc-row--waived {
  opacity: 0.6;
}

.doc-row--expired {
  background: rgba(220, 38, 38, 0.03);
}

.doc-row--expanded {
  background: var(--color-bg-3);
}

.doc-row__main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 20px;
}

.doc-row--expandable .doc-row__main {
  cursor: pointer;
}

.doc-row__left {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.doc-row__chevron {
  flex-shrink: 0;
  margin-top: 3px;
  color: var(--color-text-3);
  transition: transform 0.2s ease;
}

.doc-row__chevron--open {
  transform: rotate(90deg);
}

.doc-row__icon {
  flex-shrink: 0;
  margin-top: 2px;
}

.doc-row__info {
  min-width: 0;
}

.doc-row__name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-row__name--waived {
  text-decoration: line-through;
  color: var(--color-text-3);
}

.doc-row__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 1px;
}

.doc-row__meta--danger {
  color: var(--color-danger);
}

.doc-row__path {
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-text-3);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono, monospace);
}

.doc-row__ref {
  margin-top: 2px;
  font-size: 11px;
  color: var(--color-primary-6);
}

.doc-row__ref-count {
  color: var(--color-text-3);
}

.doc-row__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.doc-row__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 0 20px 8px 42px;
}

.doc-row__waive-btn {
  border: none;
  background: none;
  font: inherit;
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.doc-row__waive-btn:hover {
  color: var(--color-text-1);
}
</style>
