<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, DoubleReviewEntry } from "../types-detail";

/** 校验支持区：双人复核记录与欠款风险确认。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const emit = defineEmits<{
  (e: "open-risk-modal"): void;
}>();

const VERDICT_TONE: Record<string, ChipTone> = {
  "badge-green": "success",
  "badge-red": "danger",
  "badge-orange": "warning",
  "badge-gray": "neutral",
};

/**
 * 根据复核结果 badge 返回 Chip 色调。
 *
 * @param entry - 复核记录
 * @returns ChipTone 色调
 */
function verdictTone(entry: DoubleReviewEntry): ChipTone {
  return VERDICT_TONE[entry.verdictBadge] ?? "neutral";
}
</script>

<template>
  <div class="valsup__grid">
    <!-- Double Review -->
    <Card padding="lg">
      <template #header>
        <h2 class="valsup__title">双人复核</h2>
        <Button v-if="!readonly" size="sm" pill>发起复核</Button>
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
              <Chip :tone="verdictTone(entry)" size="sm">
                {{ entry.verdict }}
              </Chip>
            </div>
            <span class="valsup__review-time">{{ entry.time }}</span>
          </div>
          <div v-if="entry.comment" class="valsup__review-comment">
            {{ entry.comment }}
          </div>
          <div v-if="entry.rejectReason" class="valsup__review-reject">
            <span class="valsup__review-reject-label">驳回原因：</span>
            {{ entry.rejectReason }}
          </div>
        </div>
      </div>
      <div v-else class="valsup__empty">暂无复核记录</div>
    </Card>

    <!-- Risk Confirmation -->
    <Card padding="lg">
      <h2 class="valsup__title">欠款风险确认记录</h2>

      <template v-if="detail.riskConfirmationRecord">
        <div class="valsup__risk-record">
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">确认人</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.confirmedBy }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">原因</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.reason }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">凭证</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.evidence }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">确认时间</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.time }}
            </span>
          </div>
          <div class="valsup__risk-row">
            <span class="valsup__risk-label">涉及金额</span>
            <span class="valsup__risk-value">
              {{ detail.riskConfirmationRecord.amount }}
            </span>
          </div>
        </div>
      </template>

      <div v-else class="valsup__risk-empty">
        <p>当前无欠款风险确认</p>
        <Button
          v-if="!readonly"
          size="sm"
          pill
          @click="emit('open-risk-modal')"
        >
          模拟欠款确认
        </Button>
      </div>
    </Card>

    <!-- Post-approval flow placeholder -->
    <Card padding="lg">
      <span class="valsup__kicker">下签后处理</span>
      <div class="valsup__post-head">
        <h2 class="valsup__title">COE / 海外贴签 / 返签结果</h2>
        <Chip tone="primary" size="sm">当前案件未到该阶段</Chip>
      </div>
      <p class="valsup__post-note">
        当前案件还在提交前或补正处理阶段，因此这里暂不展示 COE
        发送、海外贴签和返签结果。切换到相应样例后可查看完整流程。
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
  border-radius: var(--radius-lg, 12px);
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
  border-radius: var(--radius-default);
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
  border-radius: var(--radius-lg, 12px);
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
  gap: 12px;
  padding: 24px 16px;
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
  padding: 24px 16px;
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
