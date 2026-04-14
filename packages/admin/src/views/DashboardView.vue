<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import QuickActionsPanel from "./dashboard/QuickActionsPanel.vue";
import SummaryCardGrid from "./dashboard/SummaryCardGrid.vue";
import WorkPanelSection from "./dashboard/WorkPanelSection.vue";

type Scope = "mine" | "group" | "all";
type GroupFilter = "all" | "tokyo1" | "tokyo2" | "osaka";
type TimeWindow = 7 | 30;

/**
 * 仪表盘首页，聚合快捷动作、摘要卡片与工作面板。
 */
const { t } = useI18n();
const scope = ref<Scope>("mine");
const selectedGroup = ref<GroupFilter>("all");
const timeWindow = ref<TimeWindow>(7);
const scopeOptions = ["mine", "group", "all"] as const;
const groupOptions = ["all", "tokyo1", "tokyo2", "osaka"] as const;

const scopeSummary = computed(() => t(`dashboard.scopeSummary.${scope.value}`));
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
              name: "Admin",
              role: t("dashboard.hero.role"),
            })
          }}
        </h1>
        <p class="hero-subtitle">{{ t("dashboard.hero.subtitle") }}</p>
      </div>
      <div class="hero-toolbar">
        <div class="hero-toolbar-row">
          <div
            class="segmented-control"
            role="tablist"
            :aria-label="t('dashboard.filters.scopeLabel')"
          >
            <button
              v-for="s in scopeOptions"
              :key="s"
              :class="['segment-btn', { active: scope === s }]"
              type="button"
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
          >
            <option v-for="group in groupOptions" :key="group" :value="group">
              {{ t(`dashboard.filters.groups.${group}`) }}
            </option>
          </select>
        </div>
      </div>
    </section>

    <!-- 快捷动作 + 工具栏元信息 -->
    <QuickActionsPanel
      :time-window="timeWindow"
      :scope-summary="scopeSummary"
      @update:time-window="timeWindow = $event"
    />

    <!-- Summary Cards -->
    <SummaryCardGrid :scope="scope" :time-window="timeWindow" />

    <!-- Work Panels -->
    <WorkPanelSection :scope="scope" :time-window="timeWindow" />
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
  padding: 10px 14px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

/* ── Responsive ────────────────────────────────────── */

@media (max-width: 1023px) {
  .hero-shell {
    flex-direction: column;
  }
}
</style>
