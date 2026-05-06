<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import type { RoleItem } from "../model/RolesAdminRepository";

/** 角色列表面板，展示所有角色卡片及新建/删除入口。 */
defineProps<{
  roles: RoleItem[];
  loading: boolean;
  error: string | null;
}>();

defineEmits<{
  select: [id: string];
  openCreate: [];
  openDelete: [role: RoleItem];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="rlp" aria-label="Role management">
    <div class="rlp__toolbar">
      <h3 class="rlp__title">{{ t("settings.roles.title") }}</h3>
      <Button
        variant="filled"
        tone="primary"
        size="sm"
        @click="$emit('openCreate')"
      >
        {{ t("settings.roles.createButton") }}
      </Button>
    </div>

    <div v-if="error" class="rlp__error" role="alert">
      {{ error }}
    </div>

    <div v-if="loading" class="rlp__loading">
      {{ t("settings.roles.loading") }}
    </div>

    <div v-else-if="roles.length === 0" class="rlp__empty">
      {{ t("settings.roles.empty") }}
    </div>

    <div v-else class="rlp__list">
      <div
        v-for="role in roles"
        :key="role.id"
        class="rlp__card"
        role="button"
        tabindex="0"
        @click="$emit('select', role.id)"
        @keydown.enter="$emit('select', role.id)"
      >
        <div class="rlp__card-header">
          <span class="rlp__card-name">{{ role.name }}</span>
          <Chip v-if="role.isSystem" tone="primary" size="micro">
            {{ t("settings.roles.systemBadge") }}
          </Chip>
        </div>
        <div class="rlp__card-meta">
          <span class="rlp__card-code">{{ role.code }}</span>
          <span class="rlp__card-members">
            {{ t("settings.roles.memberCount", { count: role.memberCount }) }}
          </span>
        </div>
        <div v-if="role.description" class="rlp__card-desc">
          {{ role.description }}
        </div>
        <div class="rlp__card-actions" @click.stop>
          <button
            v-if="!role.isSystem"
            type="button"
            class="rlp__action-btn rlp__action-btn--danger"
            :title="t('settings.roles.delete')"
            @click="$emit('openDelete', role)"
          >
            {{ t("settings.roles.delete") }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rlp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rlp__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.rlp__title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.rlp__error {
  padding: 12px 16px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: var(--radius-md);
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
}

.rlp__loading,
.rlp__empty {
  padding: 40px 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.rlp__list {
  display: grid;
  gap: 12px;
}

.rlp__card {
  padding: 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-1);
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.rlp__card:hover {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 1px var(--color-primary-6);
}

.rlp__card:focus-visible {
  outline: 2px solid var(--color-primary-6);
  outline-offset: 2px;
}

.rlp__card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.rlp__card-name {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.rlp__card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.rlp__card-code {
  font-family: var(--font-mono);
}

.rlp__card-desc {
  margin-top: 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.4;
}

.rlp__card-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
}

.rlp__action-btn {
  padding: 4px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-fill-2);
  color: var(--color-text-2);
  font-size: var(--font-size-xs);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.rlp__action-btn:hover {
  background: var(--color-fill-3);
  color: var(--color-text-1);
}

.rlp__action-btn--danger {
  color: var(--color-danger-text);
}

.rlp__action-btn--danger:hover {
  background: rgba(220, 38, 38, 0.1);
}
</style>
