<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/**
 * 批量操作栏：显示选中数量、清除按钮与批量催款按钮。
 *
 * 仅在 selectedCount > 0 时由父组件控制渲染。
 */
withDefaults(
  defineProps<{
    selectedCount?: number;
    loading?: boolean;
  }>(),
  {
    selectedCount: 0,
    loading: false,
  },
);

const { t } = useI18n();

defineEmits<{
  clear: [];
  "bulk-collect": [];
}>();
</script>

<template>
  <div
    v-if="selectedCount > 0"
    class="bulk-bar"
    role="region"
    :aria-label="t('billing.list.bulk.ariaLabel')"
  >
    <div class="bulk-bar__info">
      {{ t("billing.list.bulk.selected") }}
      <span class="bulk-bar__count">{{ selectedCount }}</span>
      {{ t("billing.list.bulk.unit") }}
      <button class="bulk-bar__clear" type="button" @click="$emit('clear')">
        {{ t("billing.list.bulk.clear") }}
      </button>
    </div>
    <div class="bulk-bar__actions">
      <Button
        variant="outlined"
        tone="primary"
        size="sm"
        :loading="loading"
        @click="$emit('bulk-collect')"
      >
        {{ t("billing.list.bulk.collect") }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
.bulk-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 24px;
  border-bottom: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
}

.bulk-bar__info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.bulk-bar__count {
  font-variant-numeric: tabular-nums;
}

.bulk-bar__clear {
  all: unset;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  cursor: pointer;
  margin-left: 4px;
}

.bulk-bar__clear:hover {
  color: var(--color-text-1);
}

.bulk-bar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
