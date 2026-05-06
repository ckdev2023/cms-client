<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import type {
  RoleDetailItem,
  UpdateRoleInput,
} from "../model/RolesAdminRepository";
import { PERMISSION_GROUPS } from "../model/permissionGroups";

/** 角色详情面板，展示元信息编辑和权限矩阵勾选表。 */
const props = defineProps<{
  role: RoleDetailItem;
  saving: boolean;
}>();

const emit = defineEmits<{
  back: [];
  update: [id: string, input: UpdateRoleInput];
  savePermissions: [id: string, permissions: string[]];
  copy: [role: RoleDetailItem];
}>();

const { t } = useI18n();

const editingName = ref(false);
const nameInput = ref("");
const descInput = ref("");

const localPermissions = ref<Set<string>>(new Set());

watch(
  () => props.role,
  (r) => {
    nameInput.value = r.name;
    descInput.value = r.description ?? "";
    localPermissions.value = new Set(r.permissions);
  },
  { immediate: true },
);

const hasPermissionChanges = computed(() => {
  const orig = new Set(props.role.permissions);
  if (orig.size !== localPermissions.value.size) return true;
  for (const p of localPermissions.value) {
    if (!orig.has(p)) return true;
  }
  return false;
});

const hasMetaChanges = computed(() => {
  return (
    nameInput.value.trim() !== props.role.name ||
    (descInput.value.trim() || "") !== (props.role.description ?? "")
  );
});

/**
 * 切换单个权限码的勾选状态。
 *
 * @param code - 权限码
 */
function togglePermission(code: string) {
  if (props.role.isSystem) return;
  const next = new Set(localPermissions.value);
  if (next.has(code)) {
    next.delete(code);
  } else {
    next.add(code);
  }
  localPermissions.value = next;
}

/**
 * 切换一组权限码的全选/全不选。
 *
 * @param codes - 权限码数组
 */
function toggleGroupAll(codes: string[]) {
  if (props.role.isSystem) return;
  const allGranted = codes.every((c) => localPermissions.value.has(c));
  const next = new Set(localPermissions.value);
  if (allGranted) {
    for (const c of codes) next.delete(c);
  } else {
    for (const c of codes) next.add(c);
  }
  localPermissions.value = next;
}

/** 保存角色元信息（名称/描述）。 */
function saveMeta() {
  if (!hasMetaChanges.value) return;
  const input: UpdateRoleInput = {};
  if (nameInput.value.trim() !== props.role.name) {
    input.name = nameInput.value.trim();
  }
  const newDesc = descInput.value.trim() || "";
  if (newDesc !== (props.role.description ?? "")) {
    input.description = newDesc;
  }
  emit("update", props.role.id, input);
  editingName.value = false;
}

/** 保存权限变更。 */
function savePerms() {
  if (!hasPermissionChanges.value) return;
  emit("savePermissions", props.role.id, [...localPermissions.value]);
}

/** 重置权限为服务端原始值。 */
function resetPerms() {
  localPermissions.value = new Set(props.role.permissions);
}
</script>

<template>
  <section class="rdp">
    <div class="rdp__header">
      <button type="button" class="rdp__back" @click="$emit('back')">
        &larr; {{ t("settings.roles.backToList") }}
      </button>
      <Button
        v-if="!role.isSystem"
        variant="outlined"
        tone="neutral"
        size="sm"
        @click="$emit('copy', role)"
      >
        {{ t("settings.roles.copy") }}
      </Button>
    </div>

    <div class="rdp__meta">
      <div class="rdp__meta-row">
        <span class="rdp__meta-label">{{ t("settings.roles.codeLabel") }}</span>
        <span class="rdp__meta-value rdp__meta-value--mono">{{
          role.code
        }}</span>
        <Chip v-if="role.isSystem" tone="primary" size="micro">
          {{ t("settings.roles.systemBadge") }}
        </Chip>
      </div>

      <div class="rdp__meta-row">
        <span class="rdp__meta-label">{{ t("settings.roles.nameLabel") }}</span>
        <template v-if="editingName || !role.isSystem">
          <input
            id="rdpNameInput"
            v-model="nameInput"
            type="text"
            class="rdp__input"
            :disabled="role.isSystem"
            :placeholder="t('settings.roles.namePlaceholder')"
          />
        </template>
        <span v-else class="rdp__meta-value">{{ role.name }}</span>
      </div>

      <div class="rdp__meta-row rdp__meta-row--col">
        <span class="rdp__meta-label">{{
          t("settings.roles.descriptionLabel")
        }}</span>
        <textarea
          v-model="descInput"
          class="rdp__textarea"
          :disabled="role.isSystem"
          :placeholder="t('settings.roles.descriptionPlaceholder')"
          rows="2"
        />
      </div>

      <div v-if="!role.isSystem && hasMetaChanges" class="rdp__meta-actions">
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          :disabled="saving || !nameInput.trim()"
          @click="saveMeta"
        >
          {{ t("settings.roles.saveMeta") }}
        </Button>
      </div>
    </div>

    <div class="rdp__permissions">
      <h4 class="rdp__permissions-title">
        {{ t("settings.roles.permissionsTitle") }}
      </h4>

      <div v-if="role.isSystem" class="rdp__permissions-notice">
        {{ t("settings.roles.systemPermissionsNotice") }}
      </div>

      <div class="rdp__matrix">
        <div
          v-for="group in PERMISSION_GROUPS"
          :key="group.resource"
          class="rdp__group"
        >
          <div class="rdp__group-header">
            <label class="rdp__group-label">
              <input
                type="checkbox"
                :checked="
                  group.items.every((i) => localPermissions.has(i.code))
                "
                :indeterminate="
                  group.items.some((i) => localPermissions.has(i.code)) &&
                  !group.items.every((i) => localPermissions.has(i.code))
                "
                :disabled="role.isSystem"
                @change="toggleGroupAll(group.items.map((i) => i.code))"
              />
              <span>{{ t(group.labelKey) }}</span>
            </label>
          </div>
          <div class="rdp__group-items">
            <label
              v-for="item in group.items"
              :key="item.code"
              class="rdp__perm-item"
              :class="{ 'rdp__perm-item--disabled': role.isSystem }"
            >
              <input
                type="checkbox"
                :checked="localPermissions.has(item.code)"
                :disabled="role.isSystem"
                @change="togglePermission(item.code)"
              />
              <span class="rdp__perm-label">{{ t(item.labelKey) }}</span>
              <span class="rdp__perm-code">{{ item.code }}</span>
            </label>
          </div>
        </div>
      </div>

      <div
        v-if="!role.isSystem && hasPermissionChanges"
        class="rdp__perm-actions"
      >
        <Button variant="outlined" tone="neutral" size="sm" @click="resetPerms">
          {{ t("settings.roles.resetPermissions") }}
        </Button>
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          :disabled="saving"
          @click="savePerms"
        >
          {{ t("settings.roles.savePermissions") }}
        </Button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rdp {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.rdp__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rdp__back {
  padding: 4px 8px;
  border: none;
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-primary-6);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background 0.15s;
}

.rdp__back:hover {
  background: var(--color-fill-2);
}

.rdp__meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-2, var(--color-bg-1));
}

.rdp__meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rdp__meta-row--col {
  flex-direction: column;
  align-items: stretch;
}

.rdp__meta-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  min-width: 80px;
}

.rdp__meta-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.rdp__meta-value--mono {
  font-family: var(--font-mono);
}

.rdp__input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--color-border-input, var(--color-border-2));
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  outline: none;
  transition: border-color 0.15s;
}

.rdp__input:focus {
  border-color: var(--color-primary-6);
}

.rdp__input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rdp__textarea {
  width: 100%;
  padding: 8px 12px;
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

.rdp__textarea:focus {
  border-color: var(--color-primary-6);
}

.rdp__textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rdp__meta-actions {
  display: flex;
  justify-content: flex-end;
}

.rdp__permissions {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rdp__permissions-title {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.rdp__permissions-notice {
  padding: 10px 14px;
  background: var(--color-fill-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.rdp__matrix {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rdp__group {
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.rdp__group-header {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 14px;
  background: var(--color-fill-1);
  border-bottom: 1px solid var(--color-border-1);
}

.rdp__group-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  cursor: pointer;
}

.rdp__group-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.rdp__group-items {
  display: flex;
  flex-direction: column;
}

.rdp__perm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 36px;
  cursor: pointer;
  transition: background 0.1s;
}

.rdp__perm-item:hover {
  background: var(--color-fill-1);
}

.rdp__perm-item--disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.rdp__perm-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.rdp__perm-item--disabled input[type="checkbox"] {
  cursor: not-allowed;
}

.rdp__perm-label {
  flex: 1;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.rdp__perm-code {
  font-size: var(--font-size-xs);
  font-family: var(--font-mono);
  color: var(--color-text-3);
}

.rdp__perm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--color-border-1);
}
</style>
