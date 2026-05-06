<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import type { MemberItem } from "../model/UsersAdminRepository";
import type { MemberStatus } from "../model/useMembersPage";

/** 成员列表面板，展示搜索、筛选、角色/状态标签和操作按钮。 */
defineProps<{
  members: MemberItem[];
  loading: boolean;
  searchQuery: string;
  statusFilter: MemberStatus;
  error: string | null;
}>();

defineEmits<{
  "update:searchQuery": [value: string];
  "update:statusFilter": [value: MemberStatus];
  openCreate: [];
  changeRole: [member: MemberItem];
  disable: [userId: string];
  activate: [userId: string];
  resetPassword: [userId: string];
  openOverrides: [member: MemberItem];
}>();

const { t } = useI18n();

const ROLE_TONE: Record<string, ChipTone> = {
  owner: "danger",
  manager: "primary",
  staff: "neutral",
  viewer: "neutral",
};

const STATUS_TONE: Record<string, ChipTone> = {
  active: "success",
  disabled: "neutral",
  pending: "warning",
};

/**
 * 将角色映射为 Chip 色调。
 *
 * @param role - 角色标识
 * @returns 对应的 Chip 色调
 */
function roleTone(role: string): ChipTone {
  return ROLE_TONE[role] ?? "neutral";
}

/**
 * 将状态映射为 Chip 色调。
 *
 * @param status - 状态标识
 * @returns 对应的 Chip 色调
 */
function statusTone(status: string): ChipTone {
  return STATUS_TONE[status] ?? "neutral";
}
</script>

<template>
  <section class="mlp" aria-label="Member management">
    <div class="mlp__toolbar">
      <SearchField
        :model-value="searchQuery"
        :placeholder="t('settings.members.searchPlaceholder')"
        variant="inline"
        @update:model-value="$emit('update:searchQuery', $event)"
      />

      <select
        id="mlpStatusFilter"
        name="statusFilter"
        class="mlp__filter"
        :value="statusFilter"
        :aria-label="t('settings.members.statusFilter')"
        @change="
          $emit(
            'update:statusFilter',
            ($event.target as HTMLSelectElement).value as MemberStatus,
          )
        "
      >
        <option value="">{{ t("settings.members.filter.all") }}</option>
        <option value="active">
          {{ t("settings.members.filter.active") }}
        </option>
        <option value="disabled">
          {{ t("settings.members.filter.disabled") }}
        </option>
      </select>

      <Button
        variant="filled"
        tone="primary"
        size="sm"
        @click="$emit('openCreate')"
      >
        {{ t("settings.members.create") }}
      </Button>
    </div>

    <div v-if="error" class="mlp__error" role="alert">
      {{ error }}
    </div>

    <div v-if="loading" class="mlp__loading">
      {{ t("settings.members.loading") }}
    </div>

    <div v-else-if="members.length === 0" class="mlp__empty">
      {{ t("settings.members.empty") }}
    </div>

    <div v-else data-h5-mode="table">
      <table class="mlp__table">
        <thead>
          <tr>
            <th class="mlp__th">{{ t("settings.members.columns.name") }}</th>
            <th class="mlp__th">{{ t("settings.members.columns.email") }}</th>
            <th class="mlp__th" style="width: 100px">
              {{ t("settings.members.columns.role") }}
            </th>
            <th class="mlp__th" style="width: 100px">
              {{ t("settings.members.columns.status") }}
            </th>
            <th class="mlp__th" style="width: 160px">
              {{ t("settings.members.columns.actions") }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in members" :key="member.id">
            <td class="mlp__td">{{ member.name }}</td>
            <td class="mlp__td mlp__td--email">{{ member.email }}</td>
            <td class="mlp__td">
              <Chip :tone="roleTone(member.role)" size="micro">
                {{ member.role }}
              </Chip>
            </td>
            <td class="mlp__td">
              <Chip :tone="statusTone(member.status)" size="micro" dot>
                {{ member.status }}
              </Chip>
            </td>
            <td class="mlp__td mlp__td--actions">
              <button
                type="button"
                class="mlp__action-btn"
                :title="t('settings.members.actions.changeRole')"
                @click="$emit('changeRole', member)"
              >
                {{ t("settings.members.actions.changeRole") }}
              </button>
              <button
                v-if="member.status === 'active'"
                type="button"
                class="mlp__action-btn mlp__action-btn--danger"
                :title="t('settings.members.actions.disable')"
                @click="$emit('disable', member.id)"
              >
                {{ t("settings.members.actions.disable") }}
              </button>
              <button
                v-else
                type="button"
                class="mlp__action-btn"
                :title="t('settings.members.actions.activate')"
                @click="$emit('activate', member.id)"
              >
                {{ t("settings.members.actions.activate") }}
              </button>
              <button
                type="button"
                class="mlp__action-btn"
                :title="t('settings.members.actions.resetPassword')"
                @click="$emit('resetPassword', member.id)"
              >
                {{ t("settings.members.actions.resetPassword") }}
              </button>
              <button
                type="button"
                class="mlp__action-btn"
                :title="t('settings.members.actions.permissions')"
                @click="$emit('openOverrides', member)"
              >
                {{ t("settings.members.actions.permissions") }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.mlp {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.mlp__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.mlp__filter {
  padding: 8px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-1);
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  cursor: pointer;
}

.mlp__error {
  padding: 12px 16px;
  background: rgba(220, 38, 38, 0.06);
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: var(--radius-md);
  color: var(--color-danger-text);
  font-size: var(--font-size-sm);
}

.mlp__loading,
.mlp__empty {
  padding: 40px 0;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.mlp__table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.mlp__th {
  padding: 10px 12px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.mlp__td {
  padding: 12px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}

.mlp__td--email {
  color: var(--color-text-2);
}

.mlp__td--actions {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.mlp__action-btn {
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

.mlp__action-btn:hover {
  background: var(--color-fill-3);
  color: var(--color-text-1);
}

.mlp__action-btn--danger {
  color: var(--color-danger-text);
}

.mlp__action-btn--danger:hover {
  background: rgba(220, 38, 38, 0.1);
}
</style>
