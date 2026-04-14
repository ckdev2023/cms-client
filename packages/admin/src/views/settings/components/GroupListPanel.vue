<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { GroupSummary, GroupStatusFilter } from "../types";
import {
  GROUP_STATUS_OPTIONS,
  GROUP_STATUS_BADGE,
  GROUP_TABLE_COLUMNS,
} from "../fixtures";

/** Group 列表面板，展示状态筛选、表格列表、空状态和行选中交互。 */
const props = withDefaults(
  defineProps<{
    groups: GroupSummary[];
    filteredGroups: GroupSummary[];
    statusFilter: GroupStatusFilter;
    selectedGroupId: string | null;
    isEmpty: boolean;
  }>(),
  {
    groups: () => [],
    filteredGroups: () => [],
    statusFilter: "",
    selectedGroupId: null,
    isEmpty: false,
  },
);

defineEmits<{
  "update:statusFilter": [value: GroupStatusFilter];
  selectGroup: [id: string];
  openCreate: [];
}>();

const { t } = useI18n();

const STATUS_CHIP_TONE: Record<string, ChipTone> = {
  green: "success",
  gray: "neutral",
};

/**
 * 将 Group 状态映射为 Chip 色调。
 *
 * @param status - Group 当前状态
 * @returns 对应的 Chip 色调
 */
function chipToneFor(status: GroupSummary["status"]): ChipTone {
  const badge = GROUP_STATUS_BADGE[status];
  return STATUS_CHIP_TONE[badge.variant] ?? "neutral";
}
</script>

<template>
  <section class="group-list-panel" aria-label="Group management">
    <!-- Empty state (no groups at all) -->
    <div v-if="isEmpty" class="group-list-panel__empty">
      <p class="group-list-panel__empty-title">
        {{ t("settings.group.empty.title") }}
      </p>
      <p class="group-list-panel__empty-desc">
        {{ t("settings.group.empty.description") }}
      </p>
      <Button
        variant="filled"
        tone="primary"
        size="sm"
        @click="$emit('openCreate')"
      >
        {{ t("settings.group.empty.createFirst") }}
      </Button>
    </div>

    <!-- Normal state -->
    <template v-else>
      <div class="group-list-panel__toolbar">
        <select
          class="group-list-panel__filter"
          :value="props.statusFilter"
          :aria-label="t('settings.group.filter.all')"
          @change="
            $emit(
              'update:statusFilter',
              ($event.target as HTMLSelectElement).value as GroupStatusFilter,
            )
          "
        >
          <option
            v-for="opt in GROUP_STATUS_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ t(opt.label) }}
          </option>
        </select>

        <Button
          variant="filled"
          tone="primary"
          size="sm"
          @click="$emit('openCreate')"
        >
          {{ t("settings.group.createButton") }}
        </Button>
      </div>

      <!-- Filtered-empty state -->
      <div
        v-if="filteredGroups.length === 0"
        class="group-list-panel__empty group-list-panel__empty--filtered"
      >
        <p class="group-list-panel__empty-title">
          {{ t("settings.group.empty.title") }}
        </p>
      </div>

      <!-- Table -->
      <table v-else class="group-list-panel__table">
        <thead>
          <tr>
            <th
              v-for="col in GROUP_TABLE_COLUMNS"
              :key="col.key"
              class="group-list-panel__th"
              :style="col.width ? { width: col.width } : undefined"
              :class="{
                'group-list-panel__th--center': col.align === 'center',
                'group-list-panel__th--right': col.align === 'right',
              }"
            >
              {{ t(col.labelKey) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in filteredGroups"
            :key="group.id"
            class="group-list-panel__row"
            :class="{
              'group-list-panel__row--selected': group.id === selectedGroupId,
            }"
            tabindex="0"
            role="button"
            @click="$emit('selectGroup', group.id)"
            @keydown.enter="$emit('selectGroup', group.id)"
            @keydown.space.prevent="$emit('selectGroup', group.id)"
          >
            <td class="group-list-panel__td">
              <span class="group-list-panel__group-name">{{ group.name }}</span>
            </td>
            <td class="group-list-panel__td">
              <Chip :tone="chipToneFor(group.status)" size="sm" dot>
                {{ t(GROUP_STATUS_BADGE[group.status].label) }}
              </Chip>
            </td>
            <td class="group-list-panel__td">
              {{ group.createdAt }}
            </td>
            <td class="group-list-panel__td group-list-panel__td--center">
              {{ group.activeCaseCount }}
            </td>
            <td class="group-list-panel__td group-list-panel__td--center">
              {{ group.memberCount }}
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>

<style scoped>
.group-list-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* --- Toolbar --- */

.group-list-panel__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-list-panel__filter {
  appearance: none;
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  padding: 6px 12px;
  height: 36px;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  width: 140px;
  cursor: pointer;
}

.group-list-panel__filter:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

/* --- Table --- */

.group-list-panel__table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.group-list-panel__th {
  padding: 10px 16px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.group-list-panel__th--center {
  text-align: center;
}

.group-list-panel__th--right {
  text-align: right;
}

.group-list-panel__td {
  padding: 12px 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}

.group-list-panel__td--center {
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* --- Row --- */

.group-list-panel__row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.group-list-panel__row:hover {
  background-color: var(--color-fill-2);
}

.group-list-panel__row:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: -2px;
}

.group-list-panel__row--selected {
  background-color: var(--color-primary-1);
}

.group-list-panel__row--selected:hover {
  background-color: var(--color-primary-1);
}

.group-list-panel__group-name {
  font-weight: var(--font-weight-extrabold);
}

/* --- Empty state --- */

.group-list-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 64px 16px;
  text-align: center;
}

.group-list-panel__empty--filtered {
  padding: 40px 16px;
}

.group-list-panel__empty-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.group-list-panel__empty-desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}
</style>
