<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { LEAD_STATUSES } from "../types";
import type { LeadStatus, OwnerOption } from "../types";

/** 批量操作栏：显示选择计数，执行指派负责人、调整跟进时间、标记状态、标签、导出。 */
const { t } = useI18n();

defineProps<{
  selectedCount?: number;
  ownerOptions?: OwnerOption[];
}>();

const emit = defineEmits<{
  clear: [];
  assignOwner: [ownerId: string];
  adjustFollowUp: [date: string];
  markStatus: [status: LeadStatus];
  bulkTags: [tags: string[]];
  bulkExport: [format: "csv" | "xlsx"];
}>();

const ownerValue = ref("");
const followUpValue = ref("");
const statusValue = ref("");
const tagsValue = ref("");
const exportFormat = ref<"csv" | "xlsx">("csv");

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

/** 确认标签操作并触发事件。 */
function applyTags() {
  const raw = tagsValue.value.trim();
  if (!raw) return;
  const tags = raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length > 0) {
    emit("bulkTags", tags);
    tagsValue.value = "";
  }
}

/** 确认导出操作并触发事件。 */
function applyExport() {
  emit("bulkExport", exportFormat.value);
}
</script>

<template>
  <div
    v-show="(selectedCount ?? 0) > 0"
    class="lead-bulk-bar"
    role="region"
    :aria-label="t('leads.list.bulk.label')"
  >
    <div class="lead-bulk-bar__summary">
      <span class="lead-bulk-bar__count">
        {{ t("leads.list.bulk.selected", { count: selectedCount ?? 0 }) }}
      </span>
      <span class="lead-bulk-bar__divider" aria-hidden="true" />
      <button
        class="lead-bulk-bar__clear"
        type="button"
        @click="$emit('clear')"
      >
        {{ t("leads.list.bulk.clear") }}
      </button>
    </div>

    <div class="lead-bulk-bar__actions">
      <div class="lead-bulk-bar__field">
        <label for="lead-bulk-assignOwner" class="lead-bulk-bar__field-label">
          {{ t("leads.list.bulk.assignOwner") }}
        </label>
        <select
          id="lead-bulk-assignOwner"
          v-model="ownerValue"
          name="bulkOwner"
          class="lead-bulk-bar__field-control"
          :aria-label="t('leads.list.bulk.assignOwner')"
        >
          <option value="">{{ t("leads.list.bulk.selectOwner") }}</option>
          <option
            v-for="opt in ownerOptions ?? []"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="lead-bulk-bar__field-apply"
          type="button"
          :disabled="!ownerValue || undefined"
          @click="applyOwner"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>

      <div class="lead-bulk-bar__field">
        <label for="lead-bulk-followUp" class="lead-bulk-bar__field-label">
          {{ t("leads.list.bulk.adjustFollowUp") }}
        </label>
        <input
          id="lead-bulk-followUp"
          v-model="followUpValue"
          name="bulkFollowUp"
          type="datetime-local"
          class="lead-bulk-bar__field-control lead-bulk-bar__field-control--datetime"
          :aria-label="t('leads.list.bulk.adjustFollowUp')"
        />
        <button
          class="lead-bulk-bar__field-apply"
          type="button"
          :disabled="!followUpValue || undefined"
          @click="applyFollowUp"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>

      <div class="lead-bulk-bar__field">
        <label for="lead-bulk-status" class="lead-bulk-bar__field-label">
          {{ t("leads.list.bulk.markStatus") }}
        </label>
        <select
          id="lead-bulk-status"
          v-model="statusValue"
          name="bulkStatus"
          class="lead-bulk-bar__field-control"
          :aria-label="t('leads.list.bulk.markStatus')"
        >
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
          class="lead-bulk-bar__field-apply"
          type="button"
          :disabled="!statusValue || undefined"
          @click="applyStatus"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>

      <div class="lead-bulk-bar__field">
        <label for="lead-bulk-tags" class="lead-bulk-bar__field-label">
          {{ t("leads.list.bulk.addTags") }}
        </label>
        <input
          id="lead-bulk-tags"
          v-model="tagsValue"
          name="bulkTags"
          type="text"
          class="lead-bulk-bar__field-control lead-bulk-bar__field-control--tags"
          :aria-label="t('leads.list.bulk.addTags')"
          :placeholder="t('leads.list.bulk.tagsPlaceholder')"
        />
        <button
          class="lead-bulk-bar__field-apply"
          type="button"
          :disabled="!tagsValue.trim() || undefined"
          @click="applyTags"
        >
          {{ t("leads.list.bulk.apply") }}
        </button>
      </div>

      <div class="lead-bulk-bar__field">
        <label for="lead-bulk-exportFormat" class="lead-bulk-bar__field-label">
          {{ t("leads.list.bulk.export") }}
        </label>
        <select
          id="lead-bulk-exportFormat"
          v-model="exportFormat"
          name="bulkExportFormat"
          class="lead-bulk-bar__field-control lead-bulk-bar__field-control--narrow"
          :aria-label="t('leads.list.bulk.export')"
        >
          <option value="csv">CSV</option>
          <option value="xlsx">Excel</option>
        </select>
        <button
          class="lead-bulk-bar__field-apply"
          type="button"
          @click="applyExport"
        >
          {{ t("leads.list.bulk.exportBtn") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lead-bulk-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}

@media (min-width: 768px) {
  .lead-bulk-bar {
    padding: 10px 24px;
  }
}

.lead-bulk-bar__summary {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 10px 4px 12px;
  border-radius: 999px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  white-space: nowrap;
}

.lead-bulk-bar__count {
  line-height: 1.4;
}

.lead-bulk-bar__divider {
  width: 1px;
  height: 14px;
  background: var(--color-border-input);
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
  flex: 1 1 auto;
  min-width: 0;
}

.lead-bulk-bar__field {
  display: inline-flex;
  align-items: stretch;
  height: 32px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  overflow: hidden;
}

.lead-bulk-bar__field:focus-within {
  border-color: var(--color-border-focus, var(--color-text-1));
}

.lead-bulk-bar__field-label {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  background: var(--color-bg-elevated);
  border-right: 1px solid var(--color-border-input);
  white-space: nowrap;
  user-select: none;
}

.lead-bulk-bar__field-control {
  appearance: none;
  border: none;
  background: transparent;
  padding: 0 10px;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  width: 140px;
  outline: none;
  cursor: pointer;
}

.lead-bulk-bar__field-control--datetime {
  width: 180px;
}

.lead-bulk-bar__field-control--tags {
  width: 160px;
  cursor: text;
}

.lead-bulk-bar__field-control--narrow {
  width: 96px;
}

.lead-bulk-bar__field-control::placeholder {
  color: var(--color-text-3);
  font-weight: var(--font-weight-regular);
}

.lead-bulk-bar__field-apply {
  border: none;
  border-left: 1px solid var(--color-border-input);
  background: transparent;
  padding: 0 12px;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-2);
  cursor: pointer;
  white-space: nowrap;
}

.lead-bulk-bar__field-apply:hover:not(:disabled) {
  background: var(--color-bg-overlay);
  color: var(--color-text-1);
}

.lead-bulk-bar__field-apply:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
