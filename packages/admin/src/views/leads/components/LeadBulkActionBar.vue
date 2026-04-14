<script setup lang="ts">
/**
 * 批量操作栏：指派负责人、调整跟进时间、标记状态。
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { LEAD_STATUSES } from "../types";
import type { LeadStatus } from "../types";
import { OWNER_OPTIONS } from "../fixtures";

/** 批量操作栏：显示选择计数，执行指派负责人、调整跟进时间、标记状态。 */
const { t } = useI18n();

defineProps<{
  selectedCount?: number;
}>();

const emit = defineEmits<{
  clear: [];
  assignOwner: [ownerId: string];
  adjustFollowUp: [date: string];
  markStatus: [status: LeadStatus];
}>();

const ownerValue = ref("");
const followUpValue = ref("");
const statusValue = ref("");

const bulkStatusOptions = LEAD_STATUSES.filter(
  (s) => s.value !== "converted_case",
);

/** 确认指派负责人并触发事件。 */
function applyOwner() {
  if (ownerValue.value) {
    emit("assignOwner", ownerValue.value);
    ownerValue.value = "";
  }
}

/** 确认调整跟进时间并触发事件。 */
function applyFollowUp() {
  if (followUpValue.value) {
    emit("adjustFollowUp", followUpValue.value);
    followUpValue.value = "";
  }
}

/** 确认标记状态并触发事件。 */
function applyStatus() {
  if (statusValue.value) {
    emit("markStatus", statusValue.value as LeadStatus);
    statusValue.value = "";
  }
}
</script>

<template>
  <div
    v-show="(selectedCount ?? 0) > 0"
    class="lead-bulk-bar"
    role="region"
    :aria-label="t('leads.list.bulk.label')"
  >
    <div class="lead-bulk-bar__left">
      {{ t("leads.list.bulk.selected", { count: selectedCount ?? 0 }) }}
      <button
        class="lead-bulk-bar__clear"
        type="button"
        @click="$emit('clear')"
      >
        {{ t("leads.list.bulk.clear") }}
      </button>
    </div>

    <div class="lead-bulk-bar__actions">
      <div class="lead-bulk-bar__action-group">
        <span class="lead-bulk-bar__action-label">
          {{ t("leads.list.bulk.assignOwner") }}
        </span>
        <select v-model="ownerValue" class="lead-bulk-bar__select">
          <option value="">{{ t("leads.list.bulk.selectOwner") }}</option>
          <option
            v-for="opt in OWNER_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="lead-bulk-bar__apply"
          type="button"
          :disabled="!ownerValue || undefined"
          @click="applyOwner"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>

      <div class="lead-bulk-bar__action-group">
        <span class="lead-bulk-bar__action-label">
          {{ t("leads.list.bulk.adjustFollowUp") }}
        </span>
        <input
          v-model="followUpValue"
          type="datetime-local"
          class="lead-bulk-bar__datetime"
        />
        <button
          class="lead-bulk-bar__apply"
          type="button"
          :disabled="!followUpValue || undefined"
          @click="applyFollowUp"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>

      <div class="lead-bulk-bar__action-group">
        <span class="lead-bulk-bar__action-label">
          {{ t("leads.list.bulk.markStatus") }}
        </span>
        <select v-model="statusValue" class="lead-bulk-bar__select">
          <option value="">{{ t("leads.list.bulk.selectStatus") }}</option>
          <option
            v-for="s in bulkStatusOptions"
            :key="s.value"
            :value="s.value"
          >
            {{ t(`leads.list.status.${s.value}`) }}
          </option>
        </select>
        <button
          class="lead-bulk-bar__apply"
          type="button"
          :disabled="!statusValue || undefined"
          @click="applyStatus"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lead-bulk-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}

@media (min-width: 768px) {
  .lead-bulk-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
  }
}

.lead-bulk-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.lead-bulk-bar__clear {
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  cursor: pointer;
  padding: 0;
}

.lead-bulk-bar__clear:hover {
  color: var(--color-text-1);
}

.lead-bulk-bar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.lead-bulk-bar__action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lead-bulk-bar__action-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
}

.lead-bulk-bar__select {
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
  width: 160px;
  cursor: pointer;
}

.lead-bulk-bar__datetime {
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
  width: 200px;
  cursor: pointer;
}

.lead-bulk-bar__apply {
  border: 1px solid var(--color-border-2);
  background: var(--color-bg-overlay);
  border-radius: var(--radius-default);
  padding: 6px 16px;
  height: 36px;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  cursor: pointer;
}

.lead-bulk-bar__apply:hover {
  background: var(--color-bg-overlay-hover);
}

.lead-bulk-bar__apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
