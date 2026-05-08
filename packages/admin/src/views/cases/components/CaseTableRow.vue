<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import StageChip from "./StageChip.vue";
import type { CaseListItem } from "../types";
import { resolveOwnerOption } from "../../../shared/model/useOwnerOptions";
import { buildCaseDetailHref } from "../query";
import {
  getPhaseI18nKey,
  getPhaseBadge,
  getCaseTypeI18nKey,
  BADGE_TONE_MAP,
} from "../constants";
import { buildFallbackName, isFallbackTitle } from "../model/caseTitleFallback";

/** 案件列表行：展示案件摘要信息和操作入口。 */
const { t, locale } = useI18n();

const props = defineProps<{
  item: CaseListItem;
}>();

const detailHref = computed(() => buildCaseDetailHref(props.item.id));

const owner = computed(() => {
  const fromBackend = props.item.ownerDisplayName?.trim();
  if (fromBackend) {
    return {
      label: fromBackend,
      initials: fromBackend.slice(0, 2),
      avatarClass: "case-row__owner-avatar--la",
    };
  }
  return resolveOwnerOption(props.item.ownerId, locale.value);
});

const riskLabel = computed(() =>
  t(`cases.list.riskLabels.${props.item.riskStatus}`),
);

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

const phaseTone = computed<ChipTone>(() => {
  const badge = getPhaseBadge(props.item.businessPhase);
  return (BADGE_TONE_MAP[badge] ?? "neutral") as ChipTone;
});

const phaseLabel = computed(() => {
  const key = getPhaseI18nKey(props.item.businessPhase);
  return key ? t(key) : props.item.businessPhase;
});

const typeLabel = computed(() => {
  const code = props.item.type;
  if (!code) return "—";
  const key = getCaseTypeI18nKey(code);
  if (!key) return code;
  const translated = t(key);
  return translated !== key ? translated : code;
});

const displayName = computed(() => {
  const { name, caseNo, id } = props.item;
  if (!isFallbackTitle(name, caseNo, id)) return name;
  return buildFallbackName(props.item.applicant, typeLabel.value, caseNo, id);
});

const identityMeta = computed(() => props.item.caseNo || props.item.id);

const isDevCase = computed(() => !!props.item.caseNo?.startsWith("CASE-DEV-"));

const FAILURE_STEP_CODES = new Set(["VISA_REJECTED"]);

const isFailureStep = computed(
  () =>
    !!props.item.workflowStepCode &&
    FAILURE_STEP_CODES.has(props.item.workflowStepCode),
);
</script>

<template>
  <tr class="case-row">
    <td>
      <div class="case-row__identity" :title="item.id">
        <div class="case-row__name-line">
          <a class="case-row__name" :href="detailHref">{{ displayName }}</a>
          <Chip
            v-if="isDevCase"
            tone="warning"
            size="micro"
            class="case-row__dev-chip"
          >
            DEV
          </Chip>
        </div>
        <span class="case-row__meta">{{ identityMeta }}</span>
      </div>
    </td>

    <td class="case-row__hide-md">
      <div class="case-row__stage-cell">
        <div class="case-row__stage-row">
          <StageChip :code="item.stageId" precision="full" />
          <Chip
            v-if="item.businessPhase"
            :tone="phaseTone"
            class="case-row__phase-chip"
          >
            {{ phaseLabel }}
          </Chip>
        </div>
        <span
          v-if="item.workflowStepLabel"
          :class="[
            'case-row__workflow-step',
            { 'case-row__workflow-step--danger': isFailureStep },
          ]"
          :title="
            t(
              item.workflowStepCode
                ? `cases.constants.bmvSteps.${item.workflowStepCode}`
                : '',
            ) || item.workflowStepLabel
          "
        >
          →
          {{
            t(
              item.workflowStepCode
                ? `cases.constants.bmvSteps.${item.workflowStepCode}`
                : "",
            ) || item.workflowStepLabel
          }}
        </span>
      </div>
    </td>

    <td class="case-row__hide-md">{{ item.applicant }}</td>

    <td class="case-row__hide-md">{{ typeLabel }}</td>

    <td class="case-row__hide-lg">
      <div v-if="owner" class="case-row__owner">
        <span :class="['case-row__owner-avatar', owner.avatarClass]">
          {{ owner.initials }}
        </span>
        {{ owner.label }}
      </div>
      <span v-else class="case-row__na">{{
        t("cases.list.ownerUnassigned")
      }}</span>
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
      <Chip :tone="validationTone" dot>
        {{ item.validationLabel }}
      </Chip>
    </td>

    <td class="case-row__hide-lg">
      <Chip v-if="item.riskStatus !== 'normal'" :tone="riskTone">
        {{ riskLabel }}
      </Chip>
      <span v-else class="case-row__na">{{ riskLabel }}</span>
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
  line-height: var(--leading-sm);
  color: var(--color-text-1);
  vertical-align: middle;
}

.case-row:hover td {
  background-color: var(--color-bg-overlay-hover);
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

.case-row__name-line {
  display: flex;
  align-items: center;
  gap: 6px;
}

.case-row__dev-chip {
  flex-shrink: 0;
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

.case-row__stage-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.case-row__stage-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.case-row__phase-chip {
  opacity: 0.85;
  font-size: var(--font-size-xs);
}

.case-row__workflow-step {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 140px;
}

.case-row__workflow-step--danger {
  color: var(--color-danger-text);
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
