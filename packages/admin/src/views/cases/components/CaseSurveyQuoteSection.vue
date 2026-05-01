<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import type { CaseDetail } from "../types-detail";

/** 调查与报价区块：展示调查状态、报价状态与预签门禁。 */
const { t } = useI18n();

defineProps<{
  surveyStatus: CaseDetail["surveyStatus"];
  quoteStatus: CaseDetail["quoteStatus"];
  preSignGate: CaseDetail["preSignGate"];
}>();

/**
 * 将下划线风格状态码转换为首字母大写的拼接字符串。
 * @param s - 原始状态码。
 * @returns 转换后的展示字符串。
 */
function capitalize(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
</script>

<template>
  <div class="sq-section" data-testid="overview-survey-quote">
    <Card v-if="surveyStatus" padding="md">
      <div class="sq-section__card">
        <span class="sq-section__title">{{
          t("cases.detail.overview.surveyQuote.surveyTitle")
        }}</span>
        <span
          class="sq-section__badge"
          :class="`sq-section__badge--${surveyStatus.tone}`"
        >
          {{
            t(
              `cases.detail.overview.surveyQuote.status${capitalize(surveyStatus.statusKey)}`,
            )
          }}
        </span>
        <span class="sq-section__progress">{{
          surveyStatus.progressLabel
        }}</span>
      </div>
    </Card>
    <Card v-if="quoteStatus" padding="md">
      <div class="sq-section__card">
        <span class="sq-section__title">{{
          t("cases.detail.overview.surveyQuote.quoteTitle")
        }}</span>
        <span
          class="sq-section__badge"
          :class="`sq-section__badge--${quoteStatus.tone}`"
        >
          {{
            t(
              `cases.detail.overview.surveyQuote.status${capitalize(quoteStatus.statusKey)}`,
            )
          }}
        </span>
        <span class="sq-section__progress">{{
          quoteStatus.progressLabel
        }}</span>
      </div>
    </Card>
    <Card v-if="preSignGate" padding="md">
      <div class="sq-section__card">
        <span class="sq-section__title">{{
          t("cases.detail.overview.surveyQuote.preSignGateTitle")
        }}</span>
        <span
          class="sq-section__badge"
          :class="
            preSignGate.passed
              ? 'sq-section__badge--success'
              : 'sq-section__badge--warning'
          "
        >
          {{
            preSignGate.passed
              ? t("cases.detail.overview.surveyQuote.preSignGatePassed")
              : t("cases.detail.overview.surveyQuote.preSignGateBlocked")
          }}
        </span>
        <ul v-if="preSignGate.blockers.length > 0" class="sq-section__blockers">
          <li
            v-for="b in preSignGate.blockers"
            :key="b.code"
            class="sq-section__blocker"
          >
            {{ t(`cases.writeErrors.preSignGate${capitalize(b.code)}`) }}
          </li>
        </ul>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.sq-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
@media (max-width: 768px) {
  .sq-section {
    grid-template-columns: 1fr;
  }
}
.sq-section__card {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sq-section__title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.sq-section__badge {
  display: inline-block;
  width: fit-content;
  padding: 2px 10px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
}
.sq-section__badge--muted {
  background: var(--color-bg-3);
  color: var(--color-text-3);
}
.sq-section__badge--warning {
  background: rgba(245, 158, 11, 0.1);
  color: #92400e;
}
.sq-section__badge--success {
  background: rgba(16, 185, 129, 0.1);
  color: #065f46;
}
.sq-section__progress {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}
.sq-section__blockers {
  margin: 4px 0 0;
  padding: 0 0 0 16px;
  list-style: disc;
}
.sq-section__blocker {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
