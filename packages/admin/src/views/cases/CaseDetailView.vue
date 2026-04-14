<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Chip, { type ChipTone } from "../../shared/ui/Chip.vue";
import Button from "../../shared/ui/Button.vue";
import CaseOverviewTab from "./components/CaseOverviewTab.vue";
import CaseInfoTab from "./components/CaseInfoTab.vue";
import CaseDocumentsTab from "./components/CaseDocumentsTab.vue";
import CaseDeadlinesTab from "./components/CaseDeadlinesTab.vue";
import CaseFormsTab from "./components/CaseFormsTab.vue";
import CaseTasksTab from "./components/CaseTasksTab.vue";
import CaseMessagesTab from "./components/CaseMessagesTab.vue";
import CaseLogTab from "./components/CaseLogTab.vue";
import CaseValidationTab from "./components/CaseValidationTab.vue";
import CaseBillingTab from "./components/CaseBillingTab.vue";
import CaseRiskConfirmModal from "./components/CaseRiskConfirmModal.vue";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import { CASE_SAMPLE_KEYS, BADGE_TONE_MAP, SAMPLE_LABELS } from "./constants";
import type { CaseSampleKey } from "./types";

/** 案件详情页：加载案件数据、展示 Tab 栏与内容面板。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const caseId = computed(() => route.params.id as string);
const initialTab =
  typeof route.query.tab === "string" ? route.query.tab : undefined;
const {
  activeTab,
  tabs,
  detail,
  notFound,
  isReadonly,
  tabCounters,
  currentSampleKey,
  showRiskModal,
  switchTab,
  getSampleCaseId,
  openRiskModal,
  closeRiskModal,
} = useCaseDetailModel(caseId, { initialTab });

/**
 * 将 statusBadge 映射为 Chip 色调。
 *
 * @param badge - 状态徽章标识
 * @returns ChipTone 色调
 */
function badgeToTone(badge: string): ChipTone {
  return (BADGE_TONE_MAP[badge] ?? "neutral") as ChipTone;
}

/**
 * 切换演示样本时导航到对应案件 ID。
 *
 * @param event - select 的 change 事件
 */
function onSampleChange(event: Event) {
  const key = (event.target as HTMLSelectElement).value as CaseSampleKey;
  const id = getSampleCaseId(key);
  if (id) router.push(`/cases/${id}`);
}
</script>

<template>
  <div class="case-detail-view">
    <template v-if="detail">
      <PageHeader
        :title="detail.title"
        :breadcrumbs="[
          { label: t('shell.nav.items.dashboard'), href: '#/' },
          { label: t('shell.nav.groups.business') },
          { label: t('shell.nav.items.cases'), href: '#/cases' },
          { label: `#${detail.id}` },
        ]"
      >
        <template #badge>
          <Chip :tone="badgeToTone(detail.statusBadge)" size="sm" dot>
            {{ detail.stage }}
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
              <a href="#/customers" class="case-detail-view__meta-link">
                {{ detail.client }}
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
          <select
            class="case-detail-view__sample-select"
            :value="currentSampleKey ?? ''"
            @change="onSampleChange"
          >
            <option v-for="key in CASE_SAMPLE_KEYS" :key="key" :value="key">
              {{ SAMPLE_LABELS[key] }}
            </option>
          </select>
          <Button size="sm">
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
          <Button size="sm">
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
          <Button variant="filled" tone="primary" size="sm">
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

      <div
        v-if="isReadonly"
        class="case-detail-view__readonly-banner"
        role="status"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span>
          {{ t("cases.detail.readonlyBanner", { stage: detail.stage }) }}
        </span>
      </div>

      <div
        class="case-detail-view__tabs"
        role="tablist"
        :aria-label="t('cases.detail.tabsLabel')"
      >
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          role="tab"
          :id="`caseTab-${tab.key}`"
          :aria-controls="`casePanel-${tab.key}`"
          :class="['case-detail-view__tab', { active: activeTab === tab.key }]"
          :aria-selected="activeTab === tab.key"
          @click="switchTab(tab.key)"
        >
          {{ tab.label }}
          <span
            v-if="tabCounters[tab.key]"
            :class="[
              'case-detail-view__counter',
              {
                'case-detail-view__counter--danger':
                  tabCounters[tab.key]!.tone === 'danger',
                'case-detail-view__counter--warning':
                  tabCounters[tab.key]!.tone === 'warning',
              },
            ]"
          >
            {{ tabCounters[tab.key]!.label }}
          </span>
        </button>
      </div>

      <section
        class="case-detail-view__panel"
        role="tabpanel"
        :id="`casePanel-${activeTab}`"
        :aria-labelledby="`caseTab-${activeTab}`"
      >
        <CaseOverviewTab
          v-if="activeTab === 'overview'"
          :detail="detail"
          @switch-tab="switchTab"
        />
        <CaseInfoTab
          v-else-if="activeTab === 'info'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseDocumentsTab
          v-else-if="activeTab === 'documents'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseDeadlinesTab
          v-else-if="activeTab === 'deadlines'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseFormsTab
          v-else-if="activeTab === 'forms'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseTasksTab
          v-else-if="activeTab === 'tasks'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseMessagesTab
          v-else-if="activeTab === 'messages'"
          :detail="detail"
          :readonly="isReadonly"
        />
        <CaseLogTab v-else-if="activeTab === 'log'" :detail="detail" />
        <CaseValidationTab
          v-else-if="activeTab === 'validation'"
          :detail="detail"
          :readonly="isReadonly"
          @switch-tab="switchTab"
          @open-risk-modal="openRiskModal"
        />
        <CaseBillingTab
          v-else-if="activeTab === 'billing'"
          :detail="detail"
          :readonly="isReadonly"
        />
      </section>

      <CaseRiskConfirmModal
        :visible="showRiskModal"
        @close="closeRiskModal"
        @confirm="closeRiskModal"
      />
    </template>

    <div v-else-if="notFound" class="case-detail-view__not-found">
      <p>{{ t("cases.detail.notFound.message", { id: caseId }) }}</p>
      <a href="#/cases">{{ t("cases.detail.notFound.backLink") }}</a>
    </div>
  </div>
</template>

<style scoped>
.case-detail-view {
  display: grid;
  gap: 20px;
}

/* ── Meta line ───────────────────────────────────────── */

.case-detail-view__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.case-detail-view__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.case-detail-view__meta-link {
  color: var(--color-primary-6);
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
}

.case-detail-view__meta-sep {
  color: var(--color-border-1);
}

/* ── Sample switcher (dev tool) ──────────────────────── */

.case-detail-view__sample-select {
  appearance: none;
  padding: 6px 12px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  background-color: var(--color-bg-overlay);
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-default);
  cursor: pointer;
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.case-detail-view__sample-select:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 2px;
}

.case-detail-view__readonly-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg, 12px);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
}

.case-detail-view__readonly-banner svg {
  flex-shrink: 0;
}

.case-detail-view__tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
  border-bottom: 1px solid var(--color-border-1);
  overflow-x: auto;
}

.case-detail-view__tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    color 0.15s,
    border-color 0.15s;
}

.case-detail-view__tab:hover {
  color: var(--color-text-1);
}

.case-detail-view__tab.active {
  color: var(--color-text-1);
  border-bottom-color: var(--color-text-1);
  font-weight: var(--font-weight-black);
}

.case-detail-view__counter {
  padding: 1px 7px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  line-height: 1.4;
  background: var(--color-text-1);
  color: #fff;
  &--warning {
    background: rgba(245, 158, 11, 0.16);
    color: #92400e;
  }
  &--danger {
    background: rgba(220, 38, 38, 0.1);
    color: #991b1b;
  }
}

.case-detail-view__panel {
  display: grid;
  gap: 16px;
}

.case-detail-view__not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 64px 24px;
  text-align: center;
  color: var(--color-text-3);

  & a {
    color: var(--color-primary-6);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
