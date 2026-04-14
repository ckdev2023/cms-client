<script setup lang="ts">
import { useI18n } from "vue-i18n";

type Scope = "mine" | "group" | "all";
type TimeWindow = 7 | 30;

/**
 * 仪表盘摘要卡片区，根据当前视角和时间窗口展示核心统计。
 */
const props = defineProps<{
  scope: Scope;
  timeWindow: TimeWindow;
}>();

const { t } = useI18n();

interface SummaryCardDef {
  id: string;
  tone: "info" | "warn" | "risk";
  statusTone: "info" | "warn" | "danger";
  values: Record<Scope, string | Record<TimeWindow, string>>;
}
const cards: SummaryCardDef[] = [
  {
    id: "todayTasks",
    tone: "info",
    statusTone: "info",
    values: { mine: "6", group: "14", all: "41" },
  },
  {
    id: "upcomingCases",
    tone: "warn",
    statusTone: "warn",
    values: {
      mine: { 7: "3", 30: "6" },
      group: { 7: "8", 30: "12" },
      all: { 7: "19", 30: "30" },
    },
  },
  {
    id: "pendingSubmissions",
    tone: "info",
    statusTone: "info",
    values: { mine: "2", group: "5", all: "10" },
  },
  {
    id: "riskCases",
    tone: "risk",
    statusTone: "danger",
    values: { mine: "2", group: "4", all: "9" },
  },
];

/**
 * 解析当前卡片在所选范围与时间窗口下的显示值。
 *
 * @param card 当前摘要卡片定义
 * @returns 卡片应展示的数值文本
 */
function cardValue(card: SummaryCardDef): string {
  const v = card.values[props.scope];
  if (typeof v === "string") return v;
  return v[props.timeWindow];
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
          <button class="mini-btn" type="button">
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
  top: -18px;
  right: -18px;
  width: 104px;
  height: 104px;
  border-radius: 0 0 0 999px;
  opacity: 0.94;
  transition: transform 180ms ease;
}

.summary-card:hover .summary-card-orb {
  transform: scale(1.06);
}

.summary-card[data-tone="info"] .summary-card-orb {
  background: #eff6ff;
}
.summary-card[data-tone="warn"] .summary-card-orb {
  background: #fff7ed;
}
.summary-card[data-tone="risk"] .summary-card-orb {
  background: #fff1f2;
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
  font-weight: var(--font-weight-black);
  color: var(--color-text-3);
  line-height: 1.4;
}

.summary-card-value {
  margin-top: 14px;
  font-size: 40px;
  line-height: 1;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  letter-spacing: -0.03em;
}

.summary-card-helper {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
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
  line-height: 1.2;
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
  color: #0369a1;
  background: rgba(14, 165, 233, 0.12);
  border-color: rgba(14, 165, 233, 0.2);
}
.status-warn {
  color: #b45309;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.22);
}
.status-danger {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.1);
  border-color: rgba(220, 38, 38, 0.16);
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
