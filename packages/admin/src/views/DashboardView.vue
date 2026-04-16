<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  getAdminAccessToken,
  useAdminSession,
} from "../auth/model/adminSession";
import { createDashboardRepository } from "./dashboard/model/DashboardRepository";
import { useDashboardModel } from "./dashboard/model/useDashboardModel";
import QuickActionsPanel from "./dashboard/QuickActionsPanel.vue";
import SummaryCardGrid from "./dashboard/SummaryCardGrid.vue";
import WorkPanelSection from "./dashboard/WorkPanelSection.vue";

/**
 * 仪表盘首页，聚合快捷动作、摘要卡片与工作面板。
 */
const { t } = useI18n();
const { currentUser } = useAdminSession();
const dashboard = useDashboardModel({
  repository: createDashboardRepository({
    getToken: getAdminAccessToken,
  }),
});
const {
  scope,
  selectedGroup,
  timeWindow,
  scopeOptions,
  groupOptions,
  summary,
  panels,
  loading,
  errorCode,
  hasData,
  isGroupFilterDisabled,
  groupFilterHintKey,
  scopeSummaryKey,
  retry,
} = dashboard;

const heroName = computed(() => currentUser.value?.name ?? "Admin");
const feedbackMessage = computed(() => {
  if (loading.value) {
    return t(
      hasData.value ? "dashboard.state.refreshing" : "dashboard.state.loading",
    );
  }

  if (errorCode.value === "unauthorized") {
    return t("dashboard.state.unauthorized");
  }

  if (errorCode.value === "requestFailed") {
    return t("dashboard.state.requestFailed");
  }

  return "";
});
</script>

<template>
  <div class="dashboard-view">
    <!-- Hero + 范围切换工具栏 -->
    <section class="hero-shell">
      <div>
        <p class="hero-kicker">{{ t("dashboard.hero.kicker") }}</p>
        <h1 class="hero-title">
          {{
            t("dashboard.hero.title", {
              name: heroName,
              role: t("dashboard.hero.role"),
            })
          }}
        </h1>
        <p class="hero-subtitle">{{ t("dashboard.hero.subtitle") }}</p>
      </div>
      <div class="hero-toolbar">
        <div class="hero-toolbar-row">
          <div
            class="segmented-control segmented-control--sliding"
            role="tablist"
            :aria-label="t('dashboard.filters.scopeLabel')"
            :style="{
              '--segment-count': String(scopeOptions.length),
              '--segment-index': String(scopeOptions.indexOf(scope)),
            }"
          >
            <span class="segmented-control__thumb" aria-hidden="true"></span>
            <button
              v-for="s in scopeOptions"
              :key="s"
              :class="['segment-btn', { active: scope === s }]"
              type="button"
              role="tab"
              :aria-selected="scope === s"
              @click="scope = s"
            >
              {{ t(`dashboard.scope.${s}`) }}
            </button>
          </div>
          <select
            v-model="selectedGroup"
            class="filter-select"
            name="groupFilter"
            :aria-label="t('dashboard.filters.groupLabel')"
            :disabled="isGroupFilterDisabled"
          >
            <option v-for="group in groupOptions" :key="group" :value="group">
              {{ t(`dashboard.filters.groups.${group}`) }}
            </option>
          </select>
        </div>
        <p v-if="scope === 'group'" class="filter-hint">
          {{ t(groupFilterHintKey) }}
        </p>
      </div>
    </section>

    <!-- 快捷动作 + 工具栏元信息 -->
    <QuickActionsPanel
      :time-window="timeWindow"
      :scope-summary="t(scopeSummaryKey)"
      @update:time-window="timeWindow = $event"
    />

    <div
      v-if="feedbackMessage"
      class="dashboard-feedback"
      :data-tone="errorCode ? 'danger' : 'info'"
      :aria-live="errorCode ? 'assertive' : 'polite'"
    >
      <span>{{ feedbackMessage }}</span>
      <button v-if="errorCode" class="mini-btn" type="button" @click="retry()">
        {{ t("dashboard.state.retry") }}
      </button>
    </div>

    <!-- Summary Cards -->
    <SummaryCardGrid :summary="summary" />

    <!-- Work Panels -->
    <WorkPanelSection :panels="panels" />
  </div>
</template>

<style scoped>
@import "./dashboard/dashboard.css";

/* ── Hero header ───────────────────────────────────── */

.dashboard-view {
  display: grid;
  gap: 20px;
}

.hero-shell {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  border: 1px solid var(--color-border-1);
  border-radius: 24px;
  box-shadow: var(--shadow-1);
  background:
    linear-gradient(135deg, rgb(255 255 255 / 92%), rgb(238 246 255 / 95%)),
    var(--color-bg-1);
}

.hero-kicker {
  margin: 0 0 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-black);
  text-transform: uppercase;
  letter-spacing: var(--letter-spacing-caps);
  color: var(--color-primary-6);
}

.hero-title {
  margin: 0;
  font-size: clamp(28px, 3vw, 36px);
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.hero-subtitle {
  margin: 8px 0 0;
  color: var(--color-text-3);
  line-height: 1.6;
}

.hero-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hero-toolbar-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-select {
  min-width: 160px;
  padding: 10px 36px 10px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.filter-hint {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.6;
  color: var(--color-text-3);
}

.dashboard-feedback {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--color-border-1);
  border-radius: 18px;
  background: var(--color-bg-1);
  color: var(--color-text-2);
}

.dashboard-feedback[data-tone="danger"] {
  border-color: rgba(220, 38, 38, 0.16);
  background: rgba(254, 242, 242, 0.9);
  color: #991b1b;
}

/* ── Responsive ────────────────────────────────────── */

@media (max-width: 1023px) {
  .hero-shell {
    flex-direction: column;
  }
}
</style>
