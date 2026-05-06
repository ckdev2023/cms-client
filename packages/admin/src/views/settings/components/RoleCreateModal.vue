<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type {
  RoleDetailItem,
  CreateRoleInput,
} from "../model/RolesAdminRepository";
import { PERMISSION_GROUPS } from "../model/permissionGroups";

/** 新建/复制角色弹窗，填写编码、名称、描述和初始权限。 */
const props = defineProps<{
  open: boolean;
  fromRole: RoleDetailItem | null;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [input: CreateRoleInput];
}>();

const { t } = useI18n();

const code = ref("");
const name = ref("");
const description = ref("");
const permissions = ref<Set<string>>(new Set());

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      if (props.fromRole) {
        code.value = "";
        name.value = `${props.fromRole.name} (copy)`;
        description.value = props.fromRole.description ?? "";
        permissions.value = new Set(props.fromRole.permissions);
      } else {
        code.value = "";
        name.value = "";
        description.value = "";
        permissions.value = new Set();
      }
    }
  },
);

const canSubmit = computed(
  () => code.value.trim().length > 0 && name.value.trim().length > 0,
);

/**
 * 切换单个权限码的勾选状态。
 *
 * @param permCode - 权限码
 */
function togglePermission(permCode: string) {
  const next = new Set(permissions.value);
  if (next.has(permCode)) {
    next.delete(permCode);
  } else {
    next.add(permCode);
  }
  permissions.value = next;
}

/**
 * 切换一组权限码的全选/全不选。
 *
 * @param codes - 权限码数组
 */
function toggleGroupAll(codes: string[]) {
  const allGranted = codes.every((c) => permissions.value.has(c));
  const next = new Set(permissions.value);
  if (allGranted) {
    for (const c of codes) next.delete(c);
  } else {
    for (const c of codes) next.add(c);
  }
  permissions.value = next;
}

/** 关闭弹窗。 */
function handleClose() {
  emit("close");
}

/** 提交创建表单。 */
function handleConfirm() {
  if (!canSubmit.value) return;
  emit("confirm", {
    code: code.value.trim(),
    name: name.value.trim(),
    description: description.value.trim() || undefined,
    permissions: [...permissions.value],
  });
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="rcm-overlay" @click.self="handleClose">
      <div
        class="rcm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.roles.createModal.title')"
        @keydown.escape="handleClose"
      >
        <div class="rcm-header">
          <h3 class="rcm-header__title">
            {{
              fromRole
                ? t("settings.roles.createModal.titleCopy")
                : t("settings.roles.createModal.title")
            }}
          </h3>
          <button
            type="button"
            class="rcm-header__close"
            :aria-label="t('settings.roles.createModal.cancel')"
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

        <div class="rcm-body">
          <div class="rcm-field">
            <label class="rcm-label" for="rcmCode">
              {{ t("settings.roles.createModal.codeLabel") }}
            </label>
            <input
              id="rcmCode"
              v-model="code"
              type="text"
              class="rcm-input"
              :placeholder="t('settings.roles.createModal.codePlaceholder')"
            />
          </div>

          <div class="rcm-field">
            <label class="rcm-label" for="rcmName">
              {{ t("settings.roles.createModal.nameLabel") }}
            </label>
            <input
              id="rcmName"
              v-model="name"
              type="text"
              class="rcm-input"
              :placeholder="t('settings.roles.createModal.namePlaceholder')"
            />
          </div>

          <div class="rcm-field">
            <label class="rcm-label" for="rcmDesc">
              {{ t("settings.roles.createModal.descriptionLabel") }}
            </label>
            <textarea
              id="rcmDesc"
              v-model="description"
              class="rcm-textarea"
              :placeholder="
                t('settings.roles.createModal.descriptionPlaceholder')
              "
              rows="2"
            />
          </div>

          <div class="rcm-permissions">
            <span class="rcm-label">
              {{ t("settings.roles.createModal.permissionsLabel") }}
            </span>
            <div class="rcm-perm-matrix">
              <div
                v-for="group in PERMISSION_GROUPS"
                :key="group.resource"
                class="rcm-perm-group"
              >
                <label class="rcm-perm-group-header">
                  <input
                    :name="`rcm-group-${group.resource}`"
                    type="checkbox"
                    :checked="group.items.every((i) => permissions.has(i.code))"
                    :indeterminate="
                      group.items.some((i) => permissions.has(i.code)) &&
                      !group.items.every((i) => permissions.has(i.code))
                    "
                    @change="toggleGroupAll(group.items.map((i) => i.code))"
                  />
                  <span>{{ t(group.labelKey) }}</span>
                </label>
                <div class="rcm-perm-items">
                  <label
                    v-for="item in group.items"
                    :key="item.code"
                    class="rcm-perm-item"
                  >
                    <input
                      :name="`rcm-perm-${item.code}`"
                      type="checkbox"
                      :checked="permissions.has(item.code)"
                      @change="togglePermission(item.code)"
                    />
                    <span>{{ t(item.labelKey) }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rcm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="handleClose"
          >
            {{ t("settings.roles.createModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmit"
            @click="handleConfirm"
          >
            {{ t("settings.roles.createModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rcm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.rcm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
}

.rcm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.rcm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.rcm-header__close {
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

.rcm-header__close:hover {
  background: var(--color-fill-2);
}

.rcm-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;
}

.rcm-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rcm-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.rcm-input,
.rcm-textarea {
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

.rcm-input:focus,
.rcm-textarea:focus {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-outline, rgba(3, 105, 161, 0.15));
}

.rcm-textarea {
  resize: vertical;
}

.rcm-permissions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rcm-perm-matrix {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  padding: 8px;
}

.rcm-perm-group {
  margin-bottom: 4px;
}

.rcm-perm-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  cursor: pointer;
}

.rcm-perm-group-header input[type="checkbox"] {
  width: 15px;
  height: 15px;
}

.rcm-perm-items {
  display: flex;
  flex-direction: column;
  padding-left: 24px;
}

.rcm-perm-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  cursor: pointer;
}

.rcm-perm-item input[type="checkbox"] {
  width: 15px;
  height: 15px;
}

.rcm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
