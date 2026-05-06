<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { RoleItem } from "../model/RolesAdminRepository";

/** 删除角色确认弹窗，检查成员引用计数后执行删除。 */
const props = defineProps<{
  open: boolean;
  role: RoleItem | null;
  saving: boolean;
}>();

defineEmits<{
  close: [];
  confirm: [id: string];
}>();

const { t } = useI18n();

const canDelete = computed(() => {
  if (!props.role) return false;
  return props.role.memberCount === 0;
});
</script>

<template>
  <Teleport to="body">
    <div v-if="open && role" class="rddm-overlay" @click.self="$emit('close')">
      <div
        class="rddm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.roles.deleteModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="rddm-header">
          <h3 class="rddm-header__title">
            {{ t("settings.roles.deleteModal.title") }}
          </h3>
          <button
            type="button"
            class="rddm-header__close"
            :aria-label="t('settings.roles.deleteModal.cancel')"
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

        <div class="rddm-body">
          <p v-if="canDelete" class="rddm-desc">
            {{
              t("settings.roles.deleteModal.confirmMessage", {
                name: role.name,
              })
            }}
          </p>
          <p v-else class="rddm-desc rddm-desc--warning">
            {{
              t("settings.roles.deleteModal.hasMembers", {
                name: role.name,
                count: role.memberCount,
              })
            }}
          </p>
        </div>

        <div class="rddm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.roles.deleteModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="danger"
            size="sm"
            :disabled="!canDelete || saving"
            @click="$emit('confirm', role.id)"
          >
            {{ t("settings.roles.deleteModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rddm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.rddm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 440px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.rddm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.rddm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.rddm-header__close {
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

.rddm-header__close:hover {
  background: var(--color-fill-2);
}

.rddm-body {
  padding: 20px 24px;
}

.rddm-desc {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.5;
}

.rddm-desc--warning {
  color: var(--color-danger-text);
}

.rddm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
