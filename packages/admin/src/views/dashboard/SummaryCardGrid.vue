<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { type RouteLocationRaw, useRouter } from "vue-router";
import type { DashboardSummaryData } from "./model/dashboardTypes";

/**
 * 仪表盘摘要卡片区，根据当前视角和时间窗口展示核心统计。
 */
const props = defineProps<{
  summary: DashboardSummaryData["summary"] | null;
}>();

const { t } = useI18n();
const router = useRouter();
const numberFormatter = new Intl.NumberFormat();

type SummaryCardKey = keyof DashboardSummaryData["summary"];

interface SummaryCardDef {
  id: SummaryCardKey;
  tone: "info" | "warn" | "risk";
  statusTone: "info" | "warn" | "danger";
  route?: RouteLocationRaw;
}
const cards: SummaryCardDef[] = [
  {
    id: "todayTasks",
    tone: "info",
    statusTone: "info",
  },
  {
    id: "upcomingCases",
    tone: "warn",
    statusTone: "warn",
    route: { name: "cases" },
  },
  {
    id: "pendingSubmissions",
    tone: "info",
    statusTone: "info",
    route: { name: "cases", query: { stage: "S6" } },
  },
  {
    id: "riskCases",
    tone: "risk",
    statusTone: "danger",
    route: { name: "cases", query: { risk: "critical" } },
  },
];

/**
 * 解析当前卡片在所选范围与时间窗口下的显示值。
 *
 * @param card 当前摘要卡片定义
 * @returns 卡片应展示的数值文本
 */
function cardValue(card: SummaryCardDef): string {
  const value = props.summary?.[card.id];
  return typeof value === "number" ? numberFormatter.format(value) : "—";
}

/**
 * 跳转到摘要卡片对应的列表页。
 *
 * @param route 目标路由地址。
 */
function navigateTo(route?: RouteLocationRaw): void {
  if (!route) return;
  void router.push(route);
}
</script>

<template>
  <section class="summary-section">
    <div class="summary-grid">
      <article
        v-for="card in cards"
        :key="card.id"
        class="surface-card summary-card"
        :data-tone="card.tone"
      >
        <div class="summary-card-orb" aria-hidden="true" />
        <div class="summary-card-head">
          <div class="summary-card-body">
            <div class="summary-card-label">
              {{ t(`dashboard.summary.cards.${card.id}.label`) }}
            </div>
            <div class="summary-card-value">{{ cardValue(card) }}</div>
          </div>
          <span :class="['status-pill', `status-${card.statusTone}`]">
            {{ t(`dashboard.summary.cards.${card.id}.statusLabel`) }}
          </span>
        </div>
        <p class="summary-card-helper">
          {{ t(`dashboard.summary.cards.${card.id}.helper`) }}
        </p>
        <div class="summary-card-footer">
          <span class="summary-card-meta">
            {{ t(`dashboard.summary.cards.${card.id}.meta`) }}
          </span>
          <button
            class="mini-btn"
            type="button"
            :disabled="!card.route || undefined"
            :aria-disabled="!card.route"
            @click="navigateTo(card.route)"
          >
            {{ t(`dashboard.summary.cards.${card.id}.action`) }}
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
@import "./dashboard.css";

.summary-section {
  margin-top: 20px;
}

.summary-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.summary-card {
  position: relative;
  overflow: hidden;
  padding: 22px;
  display: grid;
  gap: 16px;
  min-height: 188px;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

/* ── Decorative orb ────────────────────────────────── */

.summary-card-orb {
  position: absolute;
  top: -24px;
  right: -24px;
  width: 120px;
  height: 120px;
  transition: transform 180ms ease;
}

.summary-card:hover .summary-card-orb {
  transform: scale(1.06);
}

.summary-card[data-tone="info"] .summary-card-orb {
  background: radial-gradient(circle at 100% 0%, #eff6ff 0%, transparent 70%);
}
.summary-card[data-tone="warn"] .summary-card-orb {
  background: radial-gradient(circle at 100% 0%, #fff7ed 0%, transparent 70%);
}
.summary-card[data-tone="risk"] .summary-card-orb {
  background: radial-gradient(circle at 100% 0%, #fff1f2 0%, transparent 70%);
}

.summary-card[data-tone="risk"] {
  border-color: rgba(220, 38, 38, 0.16);
  box-shadow: 0 12px 32px rgba(220, 38, 38, 0.08);
}

/* ── Card content ──────────────────────────────────── */

.summary-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  position: relative;
  z-index: 1;
}

.summary-card-body {
  position: relative;
  z-index: 1;
}

.summary-card-label {
  font-size: var(--font-size-sm);
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.summary-card-value {
  margin-top: 14px;
  font-size: var(--font-size-display-2);
  line-height: var(--leading-display);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  letter-spacing: -0.03em;
}

.summary-card-helper {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: var(--leading-relaxed);
  color: var(--color-text-3);
  font-weight: var(--font-weight-bold);
  position: relative;
  z-index: 1;
}

.summary-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: auto;
  position: relative;
  z-index: 1;
}

.summary-card-meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  font-weight: var(--font-weight-bold);
}

/* ── Status pills ──────────────────────────────────── */

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  line-height: var(--leading-tight);
  font-weight: var(--font-weight-extrabold);
  border: 1px solid transparent;
  white-space: nowrap;
}

.status-pill::before {
  content: "";
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: currentColor;
}

.status-info {
  color: #fff;
  background: #0369a1;
  border-color: #0369a1;
}
.status-warn {
  color: #fff;
  background: #b45309;
  border-color: #b45309;
}
.status-danger {
  color: #fff;
  background: #b91c1c;
  border-color: #b91c1c;
}

@media (max-width: 1279px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
