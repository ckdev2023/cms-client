<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/**
 * 批量操作栏：显示选中数量、清除按钮与三种批量操作按钮。
 *
 * 仅在 selectedCount > 0 时由父组件控制渲染。
 */
withDefaults(
  defineProps<{
    selectedCount?: number;
    canRemind?: boolean;
    canApprove?: boolean;
    canWaive?: boolean;
    loading?: boolean;
  }>(),
  {
    selectedCount: 0,
    canRemind: false,
    canApprove: false,
    canWaive: false,
    loading: false,
  },
);

const { t } = useI18n();

defineEmits<{
  clear: [];
  "bulk-remind": [];
  "bulk-approve": [];
  "bulk-waive": [];
}>();
</script>

<template>
  <div
    v-if="selectedCount > 0"
    class="doc-bulk-bar"
    role="region"
    :aria-label="t('documents.list.bulk.ariaLabel')"
  >
    <div class="doc-bulk-bar__info">
      {{ t("documents.list.bulk.selected") }}
      <span class="doc-bulk-bar__count">{{ selectedCount }}</span>
      {{ t("documents.list.bulk.unit") }}
      <button class="doc-bulk-bar__clear" type="button" @click="$emit('clear')">
        {{ t("documents.list.bulk.clear") }}
      </button>
    </div>
    <div class="doc-bulk-bar__actions">
      <Button
        variant="outlined"
        tone="primary"
        size="sm"
        :disabled="!canRemind"
        :loading="loading"
        @click="$emit('bulk-remind')"
      >
        {{ t("documents.list.bulk.remind") }}
      </Button>
      <Button
        variant="outlined"
        tone="primary"
        size="sm"
        :disabled="!canApprove"
        :loading="loading"
        @click="$emit('bulk-approve')"
      >
        {{ t("documents.list.bulk.approve") }}
      </Button>
      <Button
        variant="outlined"
        tone="danger"
        size="sm"
        :disabled="!canWaive"
        :loading="loading"
        @click="$emit('bulk-waive')"
      >
        {{ t("documents.list.bulk.waive") }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.doc-bulk-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
}

.doc-bulk-bar__info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.doc-bulk-bar__count {
  font-variant-numeric: tabular-nums;
}

.doc-bulk-bar__clear {
  all: unset;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  cursor: pointer;
  margin-left: 4px;
}

.doc-bulk-bar__clear:hover {
  color: var(--color-text-1);
}

.doc-bulk-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
