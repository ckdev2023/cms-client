<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import { getActiveUserOptions } from "../../../shared/model/useOrgUserOptions";

/** 会话负责人选择弹窗，提供组织内活跃用户列表供选取 */
const props = defineProps<{
  currentOwnerUserId?: string | null;
}>();

const emit = defineEmits<{
  pick: [ownerId: string];
  close: [];
}>();

const { t } = useI18n();

const options = computed(() => getActiveUserOptions());

const selectedUserId = ref<string>(
  props.currentOwnerUserId || options.value[0]?.value || "",
);

/** 确认选择并发射 pick 事件 */
function confirm() {
  if (selectedUserId.value) {
    emit("pick", selectedUserId.value);
  }
}
</script>

<template>
  <Teleport to="body">
    <div class="owner-picker__backdrop" @click.self="emit('close')">
      <div class="owner-picker__dialog" role="alertdialog">
        <h3 class="owner-picker__title">
          {{
            currentOwnerUserId
              ? t("conversations.detail.reassign")
              : t("conversations.detail.assignOwner")
          }}
        </h3>
        <div class="owner-picker__body">
          <label class="owner-picker__label" for="owner-picker-select">
            {{ t("conversations.detail.ownerPicker.selectLabel") }}
          </label>
          <select
            id="owner-picker-select"
            v-model="selectedUserId"
            class="owner-picker__select"
          >
            <option v-for="opt in options" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="owner-picker__actions">
          <Button size="sm" @click="emit('close')">
            {{ t("conversations.detail.ownerPicker.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!selectedUserId"
            @click="confirm"
          >
            {{ t("conversations.detail.ownerPicker.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.owner-picker__backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.owner-picker__dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  padding: 24px;
  max-width: 480px;
  width: 100%;
}

.owner-picker__title {
  margin: 0 0 16px;
  font-size: var(--font-size-xl);
  line-height: var(--leading-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.owner-picker__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.owner-picker__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-3, #6b7280);
}

.owner-picker__select {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-1, #d1d5db);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base, 14px);
  font-family: inherit;
  color: var(--color-text-1, #1f2937);
  background: var(--color-bg-1, #fff);
  appearance: auto;
}

.owner-picker__select:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.owner-picker__actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
