<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { GroupSummary } from "../types";

/** 新建成员弹窗，填写姓名、邮箱、角色、初始密码和所属分组。 */
defineProps<{
  open: boolean;
  groups: GroupSummary[];
  availableRoles: { code: string; name: string }[];
}>();

const emit = defineEmits<{
  close: [];
  confirm: [
    payload: {
      name: string;
      email: string;
      role: string;
      initialPassword: string;
      primaryGroupId?: string;
    },
  ];
}>();

const { t } = useI18n();

const name = ref("");
const email = ref("");
const role = ref<string>("staff");
const initialPassword = ref("");
const primaryGroupId = ref("");

const canSubmit = computed(
  () =>
    name.value.trim().length > 0 &&
    email.value.trim().length > 0 &&
    initialPassword.value.length >= 6,
);

/** 重置表单字段为初始状态。 */
function resetForm() {
  name.value = "";
  email.value = "";
  role.value = "staff";
  initialPassword.value = "";
  primaryGroupId.value = "";
}

/** 关闭弹窗并重置表单。 */
function handleClose() {
  resetForm();
  emit("close");
}

/** 提交表单并触发创建事件。失败时保留输入，由 handleClose 负责重置。 */
function handleConfirm() {
  if (!canSubmit.value) return;
  emit("confirm", {
    name: name.value.trim(),
    email: email.value.trim(),
    role: role.value,
    initialPassword: initialPassword.value,
    primaryGroupId: primaryGroupId.value || undefined,
  });
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="mcm-overlay" @click.self="handleClose">
      <div
        class="mcm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.members.createModal.title')"
        @keydown.escape="handleClose"
      >
        <div class="mcm-header">
          <h3 class="mcm-header__title">
            {{ t("settings.members.createModal.title") }}
          </h3>
          <button
            type="button"
            class="mcm-header__close"
            :aria-label="t('settings.members.createModal.cancel')"
            @click="handleClose"
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

        <div class="mcm-body">
          <div class="mcm-field">
            <label class="mcm-label" for="mcmName">
              {{ t("settings.members.createModal.nameLabel") }}
            </label>
            <input
              id="mcmName"
              v-model="name"
              type="text"
              class="mcm-input"
              :placeholder="t('settings.members.createModal.namePlaceholder')"
            />
          </div>

          <div class="mcm-field">
            <label class="mcm-label" for="mcmEmail">
              {{ t("settings.members.createModal.emailLabel") }}
            </label>
            <input
              id="mcmEmail"
              v-model="email"
              type="email"
              class="mcm-input"
              :placeholder="t('settings.members.createModal.emailPlaceholder')"
            />
          </div>

          <div class="mcm-field">
            <label class="mcm-label" for="mcmRole">
              {{ t("settings.members.createModal.roleLabel") }}
            </label>
            <select id="mcmRole" v-model="role" class="mcm-select">
              <option v-for="r in availableRoles" :key="r.code" :value="r.code">
                {{ r.name }}
              </option>
            </select>
          </div>

          <div class="mcm-field">
            <label class="mcm-label" for="mcmPassword">
              {{ t("settings.members.createModal.passwordLabel") }}
            </label>
            <input
              id="mcmPassword"
              v-model="initialPassword"
              type="text"
              class="mcm-input"
              :placeholder="
                t('settings.members.createModal.passwordPlaceholder')
              "
            />
            <span class="mcm-hint">
              {{ t("settings.members.createModal.passwordHint") }}
            </span>
          </div>

          <div class="mcm-field">
            <label class="mcm-label" for="mcmGroup">
              {{ t("settings.members.createModal.groupLabel") }}
            </label>
            <select id="mcmGroup" v-model="primaryGroupId" class="mcm-select">
              <option value="">
                {{ t("settings.members.createModal.groupNone") }}
              </option>
              <option v-for="g in groups" :key="g.id" :value="g.id">
                {{ g.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="mcm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="handleClose"
          >
            {{ t("settings.members.createModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmit"
            @click="handleConfirm"
          >
            {{ t("settings.members.createModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mcm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.mcm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
}

.mcm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.mcm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.mcm-header__close {
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

.mcm-header__close:hover {
  background: var(--color-fill-2);
}

.mcm-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.mcm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mcm-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.mcm-input,
.mcm-select {
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

.mcm-input:focus,
.mcm-select:focus {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-outline, rgba(3, 105, 161, 0.15));
}

.mcm-input::placeholder {
  color: var(--color-text-3);
}

.mcm-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.mcm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
