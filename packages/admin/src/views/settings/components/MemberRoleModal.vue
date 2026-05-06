<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { MemberItem } from "../model/UsersAdminRepository";

/** 变更角色弹窗，根据操作者权限限制可选角色列表。 */
const props = defineProps<{
  open: boolean;
  member: MemberItem | null;
  actorRole?: string;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [userId: string, role: string];
}>();

const { t } = useI18n();

const ALL_ROLES = ["owner", "manager", "staff", "viewer"] as const;

const selectedRole = ref("");

watch(
  () => props.member,
  (m) => {
    selectedRole.value = m?.role ?? "";
  },
);

/**
 * 根据操作者角色返回可选角色列表。
 *
 * @returns 可选角色字符串数组
 */
function allowedRoles(): string[] {
  const actor = props.actorRole ?? "owner";
  if (actor === "owner") return [...ALL_ROLES];
  if (actor === "manager") return ["staff", "viewer"];
  return [];
}

/** 确认角色变更。 */
function handleConfirm() {
  if (!props.member || !selectedRole.value) return;
  emit("confirm", props.member.id, selectedRole.value);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open && member" class="mrm-overlay" @click.self="$emit('close')">
      <div
        class="mrm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.members.roleModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="mrm-header">
          <h3 class="mrm-header__title">
            {{ t("settings.members.roleModal.title") }}
          </h3>
          <button
            type="button"
            class="mrm-header__close"
            :aria-label="t('settings.members.roleModal.cancel')"
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

        <div class="mrm-body">
          <p class="mrm-desc">
            {{
              t("settings.members.roleModal.description", { name: member.name })
            }}
          </p>

          <div class="mrm-field">
            <label class="mrm-label" for="mrmRole">
              {{ t("settings.members.roleModal.roleLabel") }}
            </label>
            <select id="mrmRole" v-model="selectedRole" class="mrm-select">
              <option v-for="r in allowedRoles()" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </div>
        </div>

        <div class="mrm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.members.roleModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!selectedRole || selectedRole === member.role"
            @click="handleConfirm"
          >
            {{ t("settings.members.roleModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.mrm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.mrm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.mrm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.mrm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.mrm-header__close {
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

.mrm-header__close:hover {
  background: var(--color-fill-2);
}

.mrm-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.mrm-desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.mrm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mrm-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.mrm-select {
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

.mrm-select:focus {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-outline, rgba(3, 105, 161, 0.15));
}

.mrm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
