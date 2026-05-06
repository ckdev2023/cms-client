<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { PermissionOverrideItem } from "../model/PermissionOverridesRepository";

/** 删除权限覆盖确认弹窗，提示用户将恢复角色默认值。 */
defineProps<{
  open: boolean;
  override: PermissionOverrideItem | null;
  saving: boolean;
}>();

defineEmits<{
  close: [];
  confirm: [permission: string];
}>();

const { t } = useI18n();
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && override"
      class="odm-overlay"
      @click.self="$emit('close')"
    >
      <div
        class="odm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('settings.overrides.deleteModal.title')"
        @keydown.escape="$emit('close')"
      >
        <div class="odm-header">
          <h3 class="odm-header__title">
            {{ t("settings.overrides.deleteModal.title") }}
          </h3>
        </div>

        <div class="odm-body">
          <p class="odm-message">
            {{
              t("settings.overrides.deleteModal.message", {
                permission: override.permission,
              })
            }}
          </p>
          <p class="odm-hint">
            {{ t("settings.overrides.deleteModal.hint") }}
          </p>
        </div>

        <div class="odm-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="sm"
            @click="$emit('close')"
          >
            {{ t("settings.overrides.deleteModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="danger"
            size="sm"
            :disabled="saving"
            @click="$emit('confirm', override.permission)"
          >
            {{ t("settings.overrides.deleteModal.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.odm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal-above, 55);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.odm-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
  overflow: hidden;
}

.odm-header {
  padding: 20px 24px 0;
}

.odm-header__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.odm-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 24px;
}

.odm-message {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.odm-hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.odm-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
