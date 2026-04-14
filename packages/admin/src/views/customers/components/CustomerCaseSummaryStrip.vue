<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CustomerDetail } from "../types";

/** 案件摘要条：展示累计/活跃/归档案件数与案件名称，位于详情页头部下方。 */
const props = defineProps<{
  customer: CustomerDetail;
}>();

const { t } = useI18n();

const firstCaseName = computed(() => props.customer.caseNames[0] ?? "—");
const extraCaseCount = computed(() =>
  Math.max(0, props.customer.caseNames.length - 1),
);
</script>

<template>
  <section
    class="case-strip"
    :aria-label="t('customers.detail.caseSummary.label')"
  >
    <div class="case-strip__metrics">
      <div class="case-strip__metric">
        <div class="case-strip__metric-label">
          {{ t("customers.detail.caseSummary.total") }}
        </div>
        <div class="case-strip__metric-value">{{ customer.totalCases }}</div>
      </div>
      <div class="case-strip__metric case-strip__metric--bordered">
        <div class="case-strip__metric-label">
          {{ t("customers.detail.caseSummary.active") }}
        </div>
        <div class="case-strip__metric-value">{{ customer.activeCases }}</div>
      </div>
      <div class="case-strip__metric case-strip__metric--bordered">
        <div class="case-strip__metric-label">
          {{ t("customers.detail.caseSummary.archived") }}
        </div>
        <div class="case-strip__metric-value">{{ customer.archivedCases }}</div>
      </div>
      <div
        class="case-strip__metric case-strip__metric--bordered case-strip__metric--wide"
      >
        <div class="case-strip__metric-label">
          {{ t("customers.detail.caseSummary.caseName") }}
        </div>
        <div class="case-strip__case-names">
          <span class="case-strip__case-link">{{ firstCaseName }}</span>
          <span v-if="extraCaseCount > 0" class="case-strip__case-more">
            +{{ extraCaseCount }}
          </span>
        </div>
      </div>
    </div>
    <div class="case-strip__footer">
      <span class="case-strip__footer-label">
        {{ t("customers.detail.caseSummary.lastCreated") }}
      </span>
      <strong class="case-strip__footer-value">
        {{ customer.lastCaseCreatedDate ?? "—" }}
      </strong>
    </div>
  </section>
</template>

<style scoped>
.case-strip {
  display: flex;
  flex-direction: column;
}

.case-strip__metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (min-width: 768px) {
  .case-strip__metrics {
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }
}

.case-strip__metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

@media (min-width: 768px) {
  .case-strip__metric--bordered {
    padding-left: 24px;
    border-left: 1px solid var(--color-border-1);
  }
}

.case-strip__metric--wide {
  grid-column: span 2;
}

@media (min-width: 768px) {
  .case-strip__metric--wide {
    grid-column: span 1;
  }
}

.case-strip__metric-label {
  font-size: 11px;
  font-weight: var(--font-weight-black);
  letter-spacing: 0.06em;
  color: var(--color-text-3);
  text-transform: uppercase;
}

.case-strip__metric-value {
  font-size: 24px;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  line-height: 1;
}

@media (min-width: 768px) {
  .case-strip__metric-value {
    font-size: 28px;
  }
}

.case-strip__case-names {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 4px;
  min-width: 0;
}

.case-strip__case-link {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  color: var(--color-primary-6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.case-strip__case-more {
  flex-shrink: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);
}

.case-strip__footer {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.case-strip__footer-label {
  color: var(--color-text-3);
}

.case-strip__footer-value {
  color: var(--color-text-1);
  font-weight: var(--font-weight-black);
}
</style>
