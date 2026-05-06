<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { SetOverrideInput } from "../model/PermissionOverridesRepository";
import { PERMISSION_GROUPS } from "../model/permissionGroups";

/** 添加权限覆盖弹窗，选择权限码、效果、原因和可选过期时间。 */
const props = defineProps<{
  open: boolean;
  availablePermissions: string[];
  saving: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [input: SetOverrideInput];
}>();

const { t } = useI18n();

const selectedPermission = ref("");
const selectedEffect = ref<"grant" | "deny">("grant");
const reason = ref("");
const expiresAt = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selectedPermission.value = "";
      selectedEffect.value = "grant";
      reason.value = "";
      expiresAt.value = "";
    }
  },
);

const reasonValid = computed(() => reason.value.trim().length >= 5);
const canSubmit = computed(
  () => selectedPermission.value && reasonValid.value && !props.saving,
);

/**
 * 将权限码转为带分组的显示文本。
 *
 * @param code - 权限码
 * @returns 显示文本
 */
function permissionLabel(code: string): string {
  for (const group of PERMISSION_GROUPS) {
    const item = group.items.find((i) => i.code === code);
    if (item) return `${t(group.labelKey)} / ${t(item.labelKey)}`;
  }
  return code;
}

/** 确认提交覆盖配置。 */
function handleConfirm() {
  if (!canSubmit.value) return;
  const input: SetOverrideInput = {
    permission: selectedPermission.value,
    effect: selectedEffect.value,
    reason: reason.value.trim(),
  };
  if (expiresAt.value) {
    input.expiresAt = new Date(expiresAt.value).toISOString();
  }
  emit("confirm", input);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="oam-overlay" @click.self="$emit('close')">
      <div
        class="oam-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.overrides.addModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="oam-header">
          <h3 class="oam-header__title">
            {{ t("settings.overrides.addModal.title") }}
          </h3>
          <button
            type="button"
            class="oam-header__close"
            :aria-label="t('settings.overrides.close')"
            @click="$emit('close')"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="oam-body">
          <div class="oam-field">
            <label class="oam-label" for="oamPermission">
              {{ t("settings.overrides.addModal.permissionLabel") }}
            </label>
            <select
              id="oamPermission"
              v-model="selectedPermission"
              class="oam-select"
            >
              <option value="" disabled>
                {{ t("settings.overrides.addModal.permissionPlaceholder") }}
              </option>
              <option
                v-for="code in availablePermissions"
                :key="code"
                :value="code"
              >
                {{ permissionLabel(code) }}
              </option>
            </select>
          </div>

          <div class="oam-field">
            <label class="oam-label" for="oamEffect">
              {{ t("settings.overrides.addModal.effectLabel") }}
            </label>
            <select id="oamEffect" v-model="selectedEffect" class="oam-select">
              <option value="grant">
                {{ t("settings.overrides.addModal.effectGrant") }}
              </option>
              <option value="deny">
                {{ t("settings.overrides.addModal.effectDeny") }}
              </option>
            </select>
          </div>

          <div class="oam-field">
            <label class="oam-label" for="oamReason">
              {{ t("settings.overrides.addModal.reasonLabel") }}
            </label>
            <textarea
              id="oamReason"
              v-model="reason"
              class="oam-textarea"
              rows="3"
              :placeholder="t('settings.overrides.addModal.reasonPlaceholder')"
            ></textarea>
            <span
              v-if="reason.length > 0 && !reasonValid"
              class="oam-hint oam-hint--error"
            >
              {{ t("settings.overrides.addModal.reasonHint") }}
            </span>
          </div>

          <div class="oam-field">
            <label class="oam-label" for="oamExpires">
              {{ t("settings.overrides.addModal.expiresLabel") }}
            </label>
            <input
              id="oamExpires"
              v-model="expiresAt"
              type="datetime-local"
              class="oam-input"
            />
            <span class="oam-hint">
              {{ t("settings.overrides.addModal.expiresHint") }}
            </span>
          </div>
        </div>

        <div class="oam-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.overrides.addModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmit"
            @click="handleConfirm"
          >
            {{ t("settings.overrides.addModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.oam-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-above, 55);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.oam-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.oam-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.oam-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.oam-header__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-3);
  cursor: pointer;
  transition: background 0.15s;
}

.oam-header__close:hover {
  background: var(--color-fill-2);
}

.oam-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
  overflow-y: auto;
}

.oam-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.oam-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.oam-select,
.oam-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-input, var(--color-border-2));
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.oam-select:focus,
.oam-input:focus,
.oam-textarea:focus {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-outline, rgba(3, 105, 161, 0.15));
}

.oam-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-input, var(--color-border-2));
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  outline: none;
  resize: vertical;
  transition: border-color 0.15s;
  box-sizing: border-box;
}

.oam-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.oam-hint--error {
  color: var(--color-danger-text);
}

.oam-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
