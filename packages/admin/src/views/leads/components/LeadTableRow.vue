<script setup lang="ts">
/**
 * 线索表格行：咨询人、联系方式、状态 badge、负责人/组、跟进安排、最近更新。
 *
 * 支持 warning（已签约未转化）和 dimmed（已流失）两种行高亮。
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { LeadSummary, LeadStatus } from "../types";
import { resolveGroupLabel } from "../../../shared/model/useGroupOptions";
import {
  deriveInitialsFromName,
  resolveOwnerDisplayOption,
} from "../../../shared/model/useOwnerOptions";
import { resolveTagTone } from "../model/leadTagTone";

/** 线索表格行：咨询人信息、状态、负责人、跟进安排、最近更新。 */
const { t, locale } = useI18n();

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

const owner = computed(() => {
  if (props.lead.ownerLabel) {
    return {
      label: props.lead.ownerLabel,
      initials: deriveInitialsFromName(props.lead.ownerLabel),
    };
  }
  const resolved = resolveOwnerDisplayOption(props.lead.ownerId, locale.value, {
    unassigned: t("leads.list.ownerUnassigned"),
    unknown: t("leads.list.ownerUnknown"),
  });
  return { label: resolved.label, initials: resolved.initials };
});

const ownerLabel = computed(() => owner.value.label);

const ownerInitials = computed(() => owner.value.initials);

const groupLabel = computed(() => {
  if (props.lead.groupLabel) return props.lead.groupLabel;
  return props.lead.groupId
    ? resolveGroupLabel(
        props.lead.groupId,
        t("shared.group.disabledSuffix"),
        locale.value,
      )
    : "—";
});

const TAG_VISIBLE_LIMIT = 3;

const visibleTags = computed(() =>
  (props.lead.tags ?? []).slice(0, TAG_VISIBLE_LIMIT).map((tag) => {
    const tone = resolveTagTone(tag);
    return { tag, tone, dot: tone !== "neutral" };
  }),
);

const remainingTagCount = computed(() => {
  const total = props.lead.tags?.length ?? 0;
  return total > TAG_VISIBLE_LIMIT ? total - TAG_VISIBLE_LIMIT : 0;
});

const hiddenTags = computed(() =>
  (props.lead.tags ?? []).slice(TAG_VISIBLE_LIMIT).map((tag) => {
    const tone = resolveTagTone(tag);
    return { tag, tone, dot: tone !== "neutral" };
  }),
);

const remainingTagsAriaLabel = computed(() =>
  hiddenTags.value.map((h) => h.tag).join(", "),
);

const moreRef = ref<HTMLElement | null>(null);
const popoverOpen = ref(false);
const popoverStyle = ref<{ top: string; left: string }>({
  top: "0px",
  left: "0px",
});

/**
 * 打开 +N 隐藏标签的悬浮 popover，并按 +N 元素的实际位置定位（Teleport
 * 到 body 后必须用视口坐标，避免被表格卡片 `overflow:hidden` 裁掉）。
 */
function openTagPopover() {
  const el = moreRef.value;
  if (!el) {
    popoverOpen.value = true;
    return;
  }
  const rect = el.getBoundingClientRect();
  popoverStyle.value = {
    top: `${String(rect.top - 8)}px`,
    left: `${String(rect.left + rect.width / 2)}px`,
  };
  popoverOpen.value = true;
}

/** 关闭 +N 隐藏标签的悬浮 popover。 */
function closeTagPopover() {
  popoverOpen.value = false;
}
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
      <label class="ui-checkbox-hit">
        <input
          type="checkbox"
          name="leadRowSelect"
          class="lead-row__checkbox"
          :checked="selected"
          :aria-label="t('leads.list.columns.selectRow', { name: lead.name })"
          @change="
            $emit(
              'select',
              lead.id,
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
      </label>
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
      <Chip :tone="STATUS_TONE[lead.status]" :dot="true">
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
        <Chip tone="neutral">{{ groupLabel }}</Chip>
      </div>
    </td>

    <!-- 标签 -->
    <td class="lead-row__hide-md">
      <div v-if="lead.tags && lead.tags.length > 0" class="lead-row__tags">
        <Chip
          v-for="item in visibleTags"
          :key="item.tag"
          :tone="item.tone"
          size="micro"
          variant="tag"
          :dot="item.dot"
          :title="item.tag"
          class="lead-row__tag-chip"
        >
          <span class="lead-row__tag-text">{{ item.tag }}</span>
        </Chip>
        <span
          v-if="remainingTagCount > 0"
          ref="moreRef"
          class="lead-row__tags-more"
          tabindex="0"
          role="button"
          :aria-label="remainingTagsAriaLabel"
          @mouseenter="openTagPopover"
          @mouseleave="closeTagPopover"
          @focus="openTagPopover"
          @blur="closeTagPopover"
        >
          +{{ remainingTagCount }}
          <Teleport to="body">
            <div
              v-if="popoverOpen"
              class="lead-row__tags-popover"
              role="tooltip"
              :style="popoverStyle"
            >
              <Chip
                v-for="item in hiddenTags"
                :key="item.tag"
                :tone="item.tone"
                size="micro"
                variant="tag"
                :dot="item.dot"
                class="lead-row__tags-popover-chip"
              >
                <span class="lead-row__tag-text">{{ item.tag }}</span>
              </Chip>
            </div>
          </Teleport>
        </span>
      </div>
      <span v-else class="lead-row__na">—</span>
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
  line-height: var(--leading-sm);
  color: var(--color-text-1);
  vertical-align: middle;
}

.lead-row:hover td {
  background-color: var(--color-bg-overlay-hover);
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
  display: inline-block;
  padding: 4px 0;
  min-height: 24px;
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
  color: var(--color-warning-text);
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

.lead-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.lead-row__tag-chip {
  max-width: 96px;
}

.lead-row__tag-text {
  display: inline-block;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.lead-row__tags-more {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
  cursor: default;
}

.lead-row__tags-more:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
  border-radius: var(--radius-sm);
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

<style>
/**
 * Teleport 到 body 的标签 popover：必须用非 scoped 样式，
 * 否则 scoped 选择器无法命中根级渲染节点。
 */
.lead-row__tags-popover {
  position: fixed;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  max-width: 240px;
  padding: 8px;
  transform: translate(-50%, -100%);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  white-space: normal;
  pointer-events: none;
}

.lead-row__tags-popover-chip {
  max-width: 220px;
}

.lead-row__tags-popover .lead-row__tag-text {
  display: inline-block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}
</style>
