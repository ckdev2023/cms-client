<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import SegmentedControl from "../../../shared/ui/SegmentedControl.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import Button from "../../../shared/ui/Button.vue";
import type {
  ConversationScope,
  ConversationStatusFilter,
  ConversationOwnerFilter,
} from "../types";

/** 会话列表：多条件筛选栏，含 scope、status、unreadOnly 等维度。 */
const { t } = useI18n();

defineProps<{
  scope: ConversationScope;
  search: string;
  status: ConversationStatusFilter;
  owner: ConversationOwnerFilter;
  unreadOnly: boolean;
  filteredCount: number;
}>();

defineEmits<{
  "update:scope": [value: ConversationScope];
  "update:search": [value: string];
  "update:status": [value: ConversationStatusFilter];
  "update:owner": [value: ConversationOwnerFilter];
  "update:unreadOnly": [value: boolean];
  resetFilters: [];
}>();

const scopeOptions = computed(() => [
  { label: t("conversations.list.scope.mine"), value: "mine" as const },
  { label: t("conversations.list.scope.group"), value: "group" as const },
  { label: t("conversations.list.scope.all"), value: "all" as const },
]);
</script>

<template>
  <section class="conv-filters">
    <div class="conv-filters__row">
      <SegmentedControl
        :model-value="scope"
        :options="scopeOptions"
        :aria-label="t('conversations.list.scopeLabel')"
        @update:model-value="$emit('update:scope', $event as ConversationScope)"
      />

      <SearchField
        id="conv-filter-search"
        name="convSearch"
        class="conv-filters__search"
        :model-value="search"
        :placeholder="t('conversations.list.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:search', $event)"
      />
    </div>

    <div class="conv-filters__row conv-filters__row--secondary">
      <select
        id="conv-filter-status"
        name="convStatus"
        class="conv-filters__select"
        :value="status"
        @change="
          $emit(
            'update:status',
            ($event.target as HTMLSelectElement)
              .value as ConversationStatusFilter,
          )
        "
      >
        <option value="">
          {{ t("conversations.list.filters.statusAll") }}
        </option>
        <option value="open">
          {{ t("conversations.list.filters.statusOpen") }}
        </option>
        <option value="closed">
          {{ t("conversations.list.filters.statusClosed") }}
        </option>
      </select>

      <label class="conv-filters__checkbox-label">
        <span class="ui-checkbox-hit">
          <input
            id="conv-filter-unreadOnly"
            name="unreadOnly"
            type="checkbox"
            :checked="unreadOnly"
            @change="
              $emit(
                'update:unreadOnly',
                ($event.target as HTMLInputElement).checked,
              )
            "
          />
        </span>
        {{ t("conversations.list.filters.unreadOnly") }}
      </label>

      <Button
        variant="ghost"
        tone="neutral"
        size="sm"
        @click="$emit('resetFilters')"
      >
        {{ t("conversations.list.filters.reset") }}
      </Button>

      <span class="conv-filters__summary">
        {{
          t("conversations.list.filterSummary", {
            scope: t(`conversations.list.scope.${scope}`),
            count: filteredCount,
          })
        }}
      </span>
    </div>
  </section>
</template>

<style scoped>
.conv-filters {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conv-filters__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.conv-filters__row--secondary {
  font-size: 14px;
}

.conv-filters__search {
  flex: 1;
  min-width: 200px;
}

.conv-filters__select {
  padding: 6px 10px;
  border: 1px solid var(--color-border-1, #d1d5db);
  border-radius: var(--radius-md);
  background: var(--color-bg-1, #fff);
  font-size: 14px;
  color: var(--color-text-1, #1f2937);
}

.conv-filters__checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  color: var(--color-text-2, #374151);
}

.conv-filters__summary {
  margin-left: auto;
  font-size: var(--font-size-sm);
  color: var(--color-text-3, #6b7280);
}
</style>
