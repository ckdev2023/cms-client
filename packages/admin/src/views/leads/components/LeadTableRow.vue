<script setup lang="ts">
/**
 * 线索表格行：咨询人、联系方式、状态 badge、负责人/组、跟进安排、最近更新。
 *
 * 支持 warning（已签约未转化）和 dimmed（已流失）两种行高亮。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { LeadSummary, LeadStatus } from "../types";
import { OWNER_OPTIONS, GROUP_OPTIONS } from "../fixtures";

/** 线索表格行：咨询人信息、状态、负责人、跟进安排、最近更新。 */
const { t } = useI18n();

const props = defineProps<{
  lead: LeadSummary;
  selected?: boolean;
}>();

defineEmits<{
  select: [id: string, checked: boolean];
}>();

const STATUS_TONE: Record<LeadStatus, ChipTone> = {
  new: "warning",
  following: "primary",
  pending_sign: "primary",
  signed: "success",
  converted_case: "success",
  lost: "neutral",
};

const ownerLabel = computed(
  () => OWNER_OPTIONS.find((o) => o.value === props.lead.ownerId)?.label ?? "—",
);

const ownerInitials = computed(
  () =>
    OWNER_OPTIONS.find((o) => o.value === props.lead.ownerId)?.initials ?? "?",
);

const groupLabel = computed(
  () => GROUP_OPTIONS.find((g) => g.value === props.lead.groupId)?.label ?? "—",
);
</script>

<template>
  <tr
    :class="[
      'lead-row',
      {
        'lead-row--warning': lead.rowHighlight === 'warning',
        'lead-row--dimmed': lead.rowHighlight === 'dimmed',
      },
    ]"
  >
    <!-- Checkbox -->
    <td class="lead-row__check">
      <input
        type="checkbox"
        class="lead-row__checkbox"
        :checked="selected"
        :aria-label="t('leads.list.columns.selectRow', { name: lead.name })"
        @change="
          $emit('select', lead.id, ($event.target as HTMLInputElement).checked)
        "
      />
    </td>

    <!-- 咨询人 -->
    <td>
      <div class="lead-row__identity">
        <a class="lead-row__name" :href="`#/leads/${lead.id}`">
          {{ lead.name }}
        </a>
        <span class="lead-row__meta">{{ lead.id }}</span>
      </div>
      <div
        v-if="lead.rowHighlight === 'warning' && lead.warningText"
        class="lead-row__warning-text"
      >
        {{ lead.warningText }}
      </div>
    </td>

    <!-- 联系方式 / 咨询信息 -->
    <td class="lead-row__hide-md">
      <div class="lead-row__contact-info">
        <span v-if="lead.phone">{{ lead.phone }}</span>
        <span v-if="lead.phone && lead.email" class="lead-row__dot">·</span>
        <span v-if="lead.email">{{ lead.email }}</span>
      </div>
      <div class="lead-row__biz-info">
        {{ lead.businessTypeLabel }}
        <span v-if="lead.sourceLabel" class="lead-row__dot">·</span>
        {{ lead.sourceLabel }}
        <template v-if="lead.referrer"> ({{ lead.referrer }}) </template>
      </div>
    </td>

    <!-- 当前状态 -->
    <td>
      <Chip :tone="STATUS_TONE[lead.status]" size="sm" :dot="true">
        {{ t(`leads.list.status.${lead.status}`) }}
      </Chip>
    </td>

    <!-- 负责人 / 组 -->
    <td class="lead-row__hide-md">
      <div class="lead-row__owner">
        <span class="lead-row__owner-avatar">{{ ownerInitials }}</span>
        {{ ownerLabel }}
      </div>
      <div class="lead-row__group">
        <Chip tone="neutral" size="sm">{{ groupLabel }}</Chip>
      </div>
    </td>

    <!-- 跟进安排 -->
    <td class="lead-row__hide-lg">
      <template v-if="lead.nextAction">
        <div class="lead-row__next-action">{{ lead.nextAction }}</div>
        <div class="lead-row__next-date">{{ lead.nextFollowUpLabel }}</div>
      </template>
      <span v-else class="lead-row__na">—</span>
    </td>

    <!-- 最近更新 -->
    <td class="lead-row__hide-lg">
      <div class="lead-row__updated">{{ lead.updatedAtLabel }}</div>
    </td>
  </tr>
</template>

<style scoped>
.lead-row td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  vertical-align: middle;
}

.lead-row:last-child td {
  border-bottom: none;
}

.lead-row--warning td {
  background: rgba(251, 191, 36, 0.06);
}

.lead-row--dimmed td {
  opacity: 0.55;
}

.lead-row__check {
  width: 44px;
  text-align: center;
}

.lead-row__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.lead-row__identity {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.lead-row__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  text-decoration: none;
  cursor: pointer;
  transition: color var(--transition-normal);
}

.lead-row__name:hover {
  color: var(--color-primary-6);
}

.lead-row__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.lead-row__warning-text {
  margin-top: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: #b45309;
}

.lead-row__contact-info {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.lead-row__biz-info {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.lead-row__dot {
  margin: 0 4px;
  color: var(--color-text-3);
}

.lead-row__owner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-base);
}

.lead-row__owner-avatar {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  font-size: var(--font-size-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.lead-row__group {
  margin-top: 4px;
}

.lead-row__next-action {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.lead-row__next-date {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.lead-row__updated {
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.lead-row__na {
  color: var(--color-text-3);
}

@media (max-width: 767px) {
  .lead-row__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .lead-row__hide-lg {
    display: none;
  }
}
</style>
