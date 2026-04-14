<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseListItem } from "../types";
import { findOwnerOption } from "../fixtures";

/** 案件一覧の行コンポーネント：ステージ Chip、リスク表示、詳細リンク。 */
const { t } = useI18n();

const props = defineProps<{
  item: CaseListItem;
}>();

const detailHref = computed(() => `#/cases/${props.item.id}`);

const owner = computed(() => findOwnerOption(props.item.ownerId));

const stageTone = computed<ChipTone>(() => {
  const s = props.item.stageId;
  if (s === "S9") return "neutral";
  if (s === "S5" || s === "S6" || s === "S3") return "warning";
  if (s === "S4" || s === "S7" || s === "S8") return "primary";
  if (s === "S2") return "success";
  return "neutral";
});

const riskTone = computed<ChipTone>(() => {
  if (props.item.riskStatus === "critical") return "danger";
  if (props.item.riskStatus === "attention") return "warning";
  return "neutral";
});

const validationTone = computed<ChipTone>(() => {
  if (props.item.validationStatus === "failed") return "danger";
  if (props.item.validationStatus === "passed") return "success";
  return "neutral";
});
</script>

<template>
  <tr class="case-row">
    <td>
      <div class="case-row__identity">
        <a class="case-row__name" :href="detailHref">{{ item.name }}</a>
        <span class="case-row__meta">{{ item.id }}</span>
      </div>
    </td>

    <td class="case-row__hide-md">
      <Chip :tone="stageTone" size="sm">{{ item.stageLabel }}</Chip>
    </td>

    <td class="case-row__hide-md">{{ item.applicant }}</td>

    <td class="case-row__hide-md">{{ item.type }}</td>

    <td class="case-row__hide-lg">
      <div v-if="owner" class="case-row__owner">
        <span :class="['case-row__owner-avatar', owner.avatarClass]">
          {{ owner.initials }}
        </span>
        {{ owner.label }}
      </div>
      <span v-else class="case-row__na">{{ item.ownerId }}</span>
    </td>

    <td class="case-row__hide-lg">
      <template v-if="item.dueDate">{{ item.dueDateLabel }}</template>
      <span v-else class="case-row__na">—</span>
    </td>

    <td class="case-row__hide-lg case-row__amount">
      <template v-if="item.unpaidAmount > 0">
        ¥{{ item.unpaidAmount.toLocaleString() }}
      </template>
      <span v-else class="case-row__na">—</span>
    </td>

    <td class="case-row__hide-md">
      <Chip :tone="validationTone" size="sm" dot>
        {{ item.validationLabel }}
      </Chip>
    </td>

    <td class="case-row__hide-lg">
      <Chip v-if="item.riskStatus !== 'normal'" :tone="riskTone" size="sm">
        {{ item.riskLabel }}
      </Chip>
      <span v-else class="case-row__na">{{ item.riskLabel }}</span>
    </td>

    <td class="case-row__actions-cell">
      <a
        class="case-row__action-btn"
        :href="detailHref"
        :title="t('cases.list.actions.viewDetail')"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M13 7h8m0 0v8m0-8L13 15m-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v6"
          />
        </svg>
      </a>
    </td>
  </tr>
</template>

<style scoped>
.case-row td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  vertical-align: middle;
}

.case-row:last-child td {
  border-bottom: none;
}

.case-row__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 180px;
}

.case-row__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  text-decoration: none;
  transition: color var(--transition-normal);
}

.case-row__name:hover {
  color: var(--color-primary-6);
}

.case-row__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.case-row__hide-md {
  font-size: var(--font-size-base);
  color: var(--color-text-2);
}

.case-row__hide-lg {
  font-size: var(--font-size-base);
  color: var(--color-text-2);
}

@media (max-width: 767px) {
  .case-row__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .case-row__hide-lg {
    display: none;
  }
}

.case-row__owner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-base);
}

.case-row__owner-avatar {
  width: 22px;
  height: 22px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.case-row__amount {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.case-row__na {
  color: var(--color-text-3);
}

.case-row__actions-cell {
  text-align: right;
  white-space: nowrap;
  width: 56px;
}

.case-row__action-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-3);
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color var(--transition-normal),
    color var(--transition-normal);
}

.case-row__action-btn:hover {
  background: var(--color-bg-3);
  color: var(--color-text-1);
}
</style>
