<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "../../../shared/ui/PageHeader.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import StageChip from "../components/StageChip.vue";
import type { CaseDetail } from "./types-detail-core";
import { resolveLocalizedCustomerName } from "../model/CaseAdapterCustomerLocale";
import { buildCaseListHref, buildCustomerDetailHrefFromCase } from "../query";
import {
  BADGE_TONE_MAP,
  getPhaseI18nKey,
  getPhaseBadge,
  resolveStageLabelI18nKey,
} from "../constants";
import { formatCaseIdentity } from "../caseIdentity";
import { resolveBmvWorkflowStepDisplayLabel } from "../bmv/constantsBmvSteps";
import { getCaseTypeI18nKey } from "../../../shared/model/caseTypeI18n";
import {
  buildFallbackName,
  isFallbackTitle,
} from "../../../shared/model/caseTitleFallback";

/** 案件详情页头部：面包屑、标题、状态徽标、客户/负责人元信息与页级操作。 */
const props = defineProps<{
  detail: CaseDetail;
  isBmvCase: boolean;
  canEdit: boolean;
  canTransition: boolean;
}>();

const emit = defineEmits<{
  edit: [];
  transition: [];
}>();

const { t, locale } = useI18n();

const clientDisplayName = computed(() =>
  resolveLocalizedCustomerName(
    props.detail.customerLocalizedNames,
    props.detail.client,
    locale.value,
  ),
);

/**
 * 将状态徽标映射为 `Chip` 组件使用的 tone。
 * @param badge - 后端返回的徽标键。
 * @returns 对应的 `ChipTone`。
 */
function badgeToTone(badge: string): ChipTone {
  return (BADGE_TONE_MAP[badge] ?? "neutral") as ChipTone;
}

const phaseTone = computed<ChipTone>(() =>
  badgeToTone(getPhaseBadge(props.detail.businessPhase)),
);

const phaseLabel = computed(() => {
  const key = getPhaseI18nKey(props.detail.businessPhase);
  return key ? t(key) : props.detail.businessPhase;
});

const displayTitle = computed(() => {
  const d = props.detail;
  const fp = d.titleFallbackParts;
  if (!isFallbackTitle(d.title, fp.caseNo, fp.id)) return d.title;
  const typeKey = getCaseTypeI18nKey(fp.caseTypeCode);
  const typeLabel = typeKey ? t(typeKey) : "";
  const translated = typeLabel && typeLabel !== typeKey ? typeLabel : "";
  return buildFallbackName(fp.applicant, translated, fp.caseNo, fp.id);
});

const bmvWorkflowStepChipLabel = computed(() => {
  const ws = props.detail.workflowStep;
  if (!ws) return "";
  return resolveBmvWorkflowStepDisplayLabel(t, ws);
});
</script>

<template>
  <PageHeader
    :title="displayTitle"
    :breadcrumbs="[
      { label: t('shell.nav.items.dashboard'), href: '#/' },
      { label: t('shell.nav.groups.business') },
      { label: t('shell.nav.items.cases'), href: buildCaseListHref() },
      { label: formatCaseIdentity(detail.caseNo, detail.id) },
    ]"
  >
    <template #badge>
      <StageChip
        :code="detail.stageCode"
        :label-i18n-key="
          resolveStageLabelI18nKey(
            detail.stageCode,
            detail.workflowStep?.stepCode,
          )
        "
        precision="both"
        dot
      />
      <Chip :tone="phaseTone" dot>
        {{ phaseLabel }}
      </Chip>
      <Chip
        v-if="isBmvCase && detail.workflowStep"
        :tone="
          detail.workflowStep.isFailureStep
            ? 'danger'
            : detail.workflowStep.workflowStepInactiveAtTerminalFailure
              ? 'neutral'
              : 'primary'
        "
        dot
      >
        {{ detail.workflowStep.parentStage }} →
        {{ bmvWorkflowStepChipLabel }}
      </Chip>
    </template>
    <template #meta>
      <p class="case-detail-view__meta">
        <span class="case-detail-view__meta-item">
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <a
            :href="
              buildCustomerDetailHrefFromCase(detail.customerId, detail.id)
            "
            class="case-detail-view__meta-link"
          >
            {{ clientDisplayName }}
          </a>
        </span>
        <span class="case-detail-view__meta-sep" aria-hidden="true">|</span>
        <span class="case-detail-view__meta-item">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          {{ detail.owner }}
        </span>
        <span class="case-detail-view__meta-sep" aria-hidden="true">|</span>
        <span class="case-detail-view__meta-item">
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
              d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
            />
          </svg>
          {{ detail.agency }}
        </span>
      </p>
    </template>

    <template #actions>
      <Button
        size="sm"
        :disabled="!canEdit"
        :title="
          canEdit
            ? undefined
            : t('cases.detail.actions.editInfoDisabledTooltip')
        "
        @click="canEdit && emit('edit')"
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
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
          />
        </svg>
        {{ t("cases.detail.actions.editInfo") }}
      </Button>
      <Button
        size="sm"
        :disabled="true"
        :title="t('cases.detail.actions.exportZipNotReady')"
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        {{ t("cases.detail.actions.exportZip") }}
      </Button>
      <Button
        variant="filled"
        tone="primary"
        size="sm"
        :disabled="!canTransition"
        :title="
          canTransition
            ? undefined
            : t('cases.detail.actions.statusTransitionDisabledTooltip')
        "
        @click="canTransition && emit('transition')"
      >
        {{ t("cases.detail.actions.statusTransition") }}
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
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </template>
  </PageHeader>
</template>

<style scoped src="./CaseDetailHeader.css"></style>
