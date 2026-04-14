<script setup lang="ts">
/**
 * 批量操作栏：选择计数、清除、指派负责人与调整分组。
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { GROUP_OPTIONS, OWNER_OPTIONS } from "../fixtures";

/**
 * 批量操作栏：显示已选计数、清除、指派负责人与调整分组。
 */
const { t } = useI18n();

defineProps<{
  selectedCount?: number;
}>();

const emit = defineEmits<{
  clear: [];
  assignOwner: [ownerId: string];
  changeGroup: [groupId: string];
}>();

const ownerValue = ref("");
const groupValue = ref("");

/** 应用指派负责人并重置选择器。 */
/** 确认指派负责人并触发 assignOwner 事件。 */
function applyOwner() {
  if (ownerValue.value) {
    emit("assignOwner", ownerValue.value);
    ownerValue.value = "";
  }
}

/** 应用调整分组并重置选择器。 */
/** 确认调整分组并触发 changeGroup 事件。 */
function applyGroup() {
  if (groupValue.value) {
    emit("changeGroup", groupValue.value);
    groupValue.value = "";
  }
}
</script>

<template>
  <div
    v-show="(selectedCount ?? 0) > 0"
    class="customer-bulk-bar"
    role="region"
    :aria-label="t('customers.list.bulk.label')"
  >
    <div class="customer-bulk-bar__left">
      {{ t("customers.list.bulk.selected", { count: selectedCount ?? 0 }) }}
      <button
        class="customer-bulk-bar__clear"
        type="button"
        @click="$emit('clear')"
      >
        {{ t("customers.list.bulk.clear") }}
      </button>
    </div>

    <div class="customer-bulk-bar__actions">
      <div class="customer-bulk-bar__action-group">
        <span class="customer-bulk-bar__action-label">
          {{ t("customers.list.bulk.assignOwner") }}
        </span>
        <select v-model="ownerValue" class="customer-bulk-bar__select">
          <option value="">{{ t("customers.list.bulk.selectOwner") }}</option>
          <option
            v-for="opt in OWNER_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="customer-bulk-bar__apply"
          type="button"
          :disabled="!ownerValue || undefined"
          @click="applyOwner"
        >
          {{ t("customers.list.bulk.apply") }}
        </button>
      </div>

      <div class="customer-bulk-bar__action-group">
        <span class="customer-bulk-bar__action-label">
          {{ t("customers.list.bulk.changeGroup") }}
        </span>
        <select v-model="groupValue" class="customer-bulk-bar__select">
          <option value="">{{ t("customers.list.bulk.selectGroup") }}</option>
          <option
            v-for="opt in GROUP_OPTIONS"
            :key="opt.value"
            :value="opt.value"
          >
            {{ opt.label }}
          </option>
        </select>
        <button
          class="customer-bulk-bar__apply"
          type="button"
          :disabled="!groupValue || undefined"
          @click="applyGroup"
        >
          {{ t("customers.list.bulk.apply") }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customer-bulk-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}

@media (min-width: 768px) {
  .customer-bulk-bar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 12px 24px;
  }
}

.customer-bulk-bar__left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.customer-bulk-bar__clear {
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
  cursor: pointer;
  padding: 0;
}

.customer-bulk-bar__clear:hover {
  color: var(--color-text-1);
}

.customer-bulk-bar__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.customer-bulk-bar__action-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.customer-bulk-bar__action-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-3);
}

.customer-bulk-bar__select {
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

.customer-bulk-bar__apply {
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

.customer-bulk-bar__apply:hover {
  background: var(--color-bg-overlay-hover);
}

.customer-bulk-bar__apply:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
