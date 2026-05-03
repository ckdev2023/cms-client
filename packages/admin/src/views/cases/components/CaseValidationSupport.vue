<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, DoubleReviewEntry } from "../types-detail";

/** 提交前检查与审核复核支持面板。 */
const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

defineEmits<{
  (e: "open-risk-modal"): void;
}>();

const { t } = useI18n();

const VERDICT_TONE: Record<string, ChipTone> = {
  "badge-green": "success",
  "badge-red": "danger",
  "badge-orange": "warning",
  "badge-gray": "neutral",
};

/**
 * 根据审核条目的 badge 类型返回对应的 Chip 色调。
 *
 * @param entry - 审核条目
 * @returns 对应的 ChipTone
 */
function verdictTone(entry: DoubleReviewEntry): ChipTone {
  return VERDICT_TONE[entry.verdictBadge] ?? "neutral";
}

const POST_SUBMISSION_PHASES = new Set([
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
]);

const AWAITING_COE_PHASES = new Set([
  "APPROVED",
  "REJECTED",
  "WAITING_PAYMENT",
]);

const AWAITING_VISA_STAMP_PHASES = new Set([
  "COE_SENT",
  "VISA_APPLYING",
  "VISA_REJECTED",
]);

const COMPLETED_PHASES = new Set([
  "SUCCESS",
  "ENTRY_SUCCESS",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
  "CLOSED_SUCCESS",
  "CLOSED_FAILED",
]);

/**
 * 根据 businessPhase 和 stageCode 选择下签后文案 i18n key 后缀。
 */
const coeNoteKeySuffix = computed<string>(() => {
  const phase = props.detail.businessPhase;
  if (COMPLETED_PHASES.has(phase)) return "noteCompleted";
  if (AWAITING_VISA_STAMP_PHASES.has(phase)) return "noteAwaitingVisaStamp";
  if (AWAITING_COE_PHASES.has(phase)) return "noteAwaitingCoe";
  if (POST_SUBMISSION_PHASES.has(phase)) return "notePostSubmission";
  return "notePreSubmission";
});
</script>

<template>
  <div class="valsup__grid">
    <!-- Double Review -->
    <Card padding="lg">
      <template #header>
        <h2 class="valsup__title">
          {{ t("cases.detail.validation.reviewer.title") }}
        </h2>
        <Button
          v-if="!readonly"
          size="sm"
          pill
          disabled
          :title="t('shell.topbar.comingSoon')"
          >{{ t("cases.detail.validation.reviewer.startCta") }}</Button
        >
      </template>

      <div v-if="detail.doubleReview.length > 0" class="valsup__reviews">
        <div
          v-for="(entry, i) in detail.doubleReview"
          :key="`review-${i}`"
          class="valsup__review-card"
        >
          <div class="valsup__review-header">
            <div class="valsup__review-avatar">{{ entry.initials }}</div>
            <div class="valsup__review-info">
              <span class="valsup__review-name">{{ entry.name }}</span>
              <Chip :tone="verdictTone(entry)">
                {{ entry.verdict }}
              </Chip>
            </div>
            <span class="valsup__review-time">{{ entry.time }}</span>
          </div>
          <div v-if="entry.comment" class="valsup__review-comment">
            {{ entry.comment }}
          </div>
          <div v-if="entry.rejectReason" class="valsup__review-reject">
            <span class="valsup__review-reject-label">{{
              t("cases.detail.validation.reviewer.rejectReasonLabel")
            }}</span>
            {{ entry.rejectReason }}
          </div>
        </div>
      </div>
      <div v-else class="valsup__empty">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="valsup__empty-icon"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p class="valsup__empty-text">
          {{ t("cases.detail.validation.reviewer.empty") }}
        </p>
      </div>
    </Card>

    <!-- Risk Confirmation -->
    <Card padding="lg">
      <h2 class="valsup__title">
        {{ t("cases.detail.validation.risk.title") }}
      </h2>

      <template v-if="detail.riskConfirmationRecord">
        <div class="valsup__risk-record">
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">{{
              t("cases.detail.validation.risk.rows.confirmedBy")
            }}</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.confirmedBy }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">{{
              t("cases.detail.validation.risk.rows.reason")
            }}</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.reason }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">{{
              t("cases.detail.validation.risk.rows.evidence")
            }}</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.evidence }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">{{
              t("cases.detail.validation.risk.rows.time")
            }}</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.time }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">{{
              t("cases.detail.validation.risk.rows.amount")
            }}</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.amount }}
            </span>
          </div>
        </div>
      </template>

      <div v-else class="valsup__risk-empty">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="valsup__empty-icon"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <polyline points="9 12 11 14 15 10" />
        </svg>
        <p>{{ t("cases.detail.validation.risk.empty") }}</p>
        <Button
          v-if="!readonly"
          size="sm"
          pill
          disabled
          :title="t('shell.topbar.comingSoon')"
        >
          {{ t("cases.detail.validation.risk.simulateCta") }}
        </Button>
      </div>
    </Card>

    <!-- Post-approval flow placeholder -->
    <Card padding="lg">
      <span class="valsup__kicker">{{
        t("cases.detail.validation.postApproval.kicker")
      }}</span>
      <div class="valsup__post-head">
        <h2 class="valsup__title">
          {{ t("cases.detail.validation.postApproval.title") }}
        </h2>
        <Chip tone="primary">{{
          t("cases.detail.validation.postApproval.stagingChip")
        }}</Chip>
      </div>
      <p class="valsup__post-note">
        {{ t(`cases.detail.validation.postApproval.${coeNoteKeySuffix}`) }}
      </p>
    </Card>
  </div>
</template>

<style scoped>
.valsup__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

@media (max-width: 768px) {
  .valsup__grid {
    grid-template-columns: 1fr;
  }
}

.valsup__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Reviews ───────────────────────────────────────────── */

.valsup__reviews {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.valsup__review-card {
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-3);
}

.valsup__review-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.valsup__review-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary-1, #e0e7ff);
  color: var(--color-primary-6);
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.valsup__review-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.valsup__review-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.valsup__review-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  flex-shrink: 0;
}

.valsup__review-comment {
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.valsup__review-reject {
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgba(220, 38, 38, 0.04);
  border: 1px solid rgba(220, 38, 38, 0.1);
  font-size: var(--font-size-xs);
  color: var(--color-text-2);
}

.valsup__review-reject-label {
  font-weight: var(--font-weight-bold);
  color: var(--color-danger);
}

/* ── Risk record ───────────────────────────────────────── */

.valsup__risk-record {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-3);
}

.valsup__risk-row {
  display: flex;
  gap: 12px;
  font-size: var(--font-size-xs);
}

.valsup__risk-label {
  flex-shrink: 0;
  width: 64px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}

.valsup__risk-value {
  color: var(--color-text-1);
  font-weight: var(--font-weight-semibold);
}

.valsup__risk-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
}

.valsup__risk-empty p {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

/* ── Post-approval ─────────────────────────────────────── */

.valsup__kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-primary-6);
}

.valsup__post-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.valsup__post-note {
  margin: 8px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

/* ── Empty ─────────────────────────────────────────────── */

.valsup__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 32px 16px;
  text-align: center;
  color: var(--color-text-3);
}

.valsup__empty-icon {
  color: var(--color-text-3);
  opacity: 0.5;
}

.valsup__empty-text {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
