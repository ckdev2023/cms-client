<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { GroupMember } from "../types";
import { MEMBER_TABLE_COLUMNS, ROLE_CHIP_VARIANT } from "../fixtures";

/** Group 成员列表面板，只读展示成员姓名、角色和加入时间。 */
withDefaults(
  defineProps<{
    members: GroupMember[];
  }>(),
  { members: () => [] },
);

const { t } = useI18n();

const VARIANT_TO_TONE: Record<string, ChipTone> = {
  blue: "primary",
  purple: "primary",
  gray: "neutral",
  amber: "warning",
  green: "success",
};

/**
 * 将角色名称映射为 Chip 色调。
 *
 * @param role - 角色名称
 * @returns 对应的 Chip 色调
 */
function chipToneFor(role: string): ChipTone {
  const variant = ROLE_CHIP_VARIANT[role] ?? "gray";
  return VARIANT_TO_TONE[variant] ?? "neutral";
}
</script>

<template>
  <section class="group-member-list" aria-label="Group members">
    <h4 class="group-member-list__title">
      {{ t("settings.group.detail.members") }}
    </h4>

    <div v-if="members.length === 0" class="group-member-list__empty">
      <p class="group-member-list__empty-text">
        {{ t("settings.group.detail.membersEmpty") }}
      </p>
    </div>

    <table v-else class="group-member-list__table">
      <thead>
        <tr>
          <th
            v-for="col in MEMBER_TABLE_COLUMNS"
            :key="col.key"
            class="group-member-list__th"
            :style="col.width ? { width: col.width } : undefined"
          >
            {{ t(col.labelKey) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(member, idx) in members" :key="idx">
          <td class="group-member-list__td">{{ member.name }}</td>
          <td class="group-member-list__td">
            <Chip :tone="chipToneFor(member.role)" size="sm">
              {{ member.role }}
            </Chip>
          </td>
          <td class="group-member-list__td">{{ member.joinedAt }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.group-member-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.group-member-list__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.group-member-list__empty {
  padding: 24px 0;
  text-align: center;
}

.group-member-list__empty-text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.group-member-list__table {
  width: 100%;
  text-align: left;
  border-collapse: collapse;
}

.group-member-list__th {
  padding: 8px 12px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.group-member-list__td {
  padding: 10px 12px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
}
</style>
