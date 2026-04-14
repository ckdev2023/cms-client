<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

/**
 * 仪表盘快捷操作面板，提供常用入口与时间窗口切换工具。
 */
defineProps<{
  timeWindow: 7 | 30;
  scopeSummary: string;
}>();

const emit = defineEmits<{
  "update:timeWindow": [value: 7 | 30];
}>();

const { t } = useI18n();
const router = useRouter();

const quickActions: {
  id: string;
  tone: string;
  icon: string;
  route?: string;
}[] = [
  {
    id: "createLead",
    tone: "blue",
    icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    route: "/leads?action=new",
  },
  {
    id: "createCustomer",
    tone: "indigo",
    icon: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
  },
  {
    id: "createCase",
    tone: "teal",
    icon: "M12 4v16m8-8H4",
  },
  {
    id: "dueSoon",
    tone: "rose",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

const inlineActions: { id: string; route?: string }[] = [
  { id: "createFollowUp" },
  { id: "completeToday" },
  { id: "goSubmit" },
  { id: "addReceipt", route: "/billing" },
];

/**
 * 判断当前快捷操作是否已接入可用路由。
 *
 * @param route 按钮绑定的目标路由
 * @returns 存在目标路由时返回 `true`
 */
function isActionAvailable(route?: string): boolean {
  return Boolean(route);
}

/**
 * 在按钮已接入路由时执行导航，未接线时直接忽略点击。
 *
 * @param route 按钮绑定的目标路由
 */
function navigateTo(route?: string): void {
  if (!route) return;
  router.push(route);
}
</script>

<template>
  <section class="surface-card quick-actions-card">
    <div class="quick-actions-head">
      <div>
        <h2 class="section-title">{{ t("dashboard.quickActions.title") }}</h2>
        <p class="section-subtitle">
          {{ t("dashboard.quickActions.subtitle") }}
        </p>
      </div>
      <a class="section-link" href="#/tasks">
        {{ t("dashboard.quickActions.viewMyTasks") }}
      </a>
    </div>

    <div class="quick-actions-grid">
      <button
        v-for="qa in quickActions"
        :key="qa.id"
        class="quick-action-card"
        type="button"
        :disabled="!isActionAvailable(qa.route) || undefined"
        :aria-disabled="!isActionAvailable(qa.route)"
        @click="navigateTo(qa.route)"
      >
        <span class="quick-action-icon" :data-tone="qa.tone" aria-hidden="true">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="qa.icon"
            />
          </svg>
        </span>
        <span class="quick-action-copy">
          <span class="quick-action-title">
            {{ t(`dashboard.quickActions.cards.${qa.id}.title`) }}
          </span>
          <span class="quick-action-desc">
            {{ t(`dashboard.quickActions.cards.${qa.id}.desc`) }}
          </span>
        </span>
      </button>
    </div>

    <div class="toolbar-meta">
      <div class="toolbar-meta-left">
        <div>
          <div class="toolbar-meta-label">
            {{ t("dashboard.quickActions.timeRange") }}
          </div>
          <div
            class="segmented-control"
            role="tablist"
            :aria-label="t('dashboard.quickActions.timeRange')"
          >
            <button
              v-for="w in [7, 30] as const"
              :key="w"
              :class="['segment-btn', { active: timeWindow === w }]"
              type="button"
              @click="emit('update:timeWindow', w)"
            >
              {{ t("dashboard.quickActions.dayUnit", { count: w }) }}
            </button>
          </div>
        </div>
        <p class="scope-summary-note">{{ scopeSummary }}</p>
      </div>
      <div class="toolbar-inline-actions">
        <button
          v-for="a in inlineActions"
          :key="a.id"
          class="mini-btn"
          type="button"
          :disabled="!isActionAvailable(a.route) || undefined"
          :aria-disabled="!isActionAvailable(a.route)"
          @click="navigateTo(a.route)"
        >
          {{ t(`dashboard.quickActions.inlineActions.${a.id}`) }}
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
@import "./dashboard.css";

.quick-actions-card {
  padding: 22px;
  display: grid;
  gap: 18px;
}

.quick-actions-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.section-link {
  color: var(--color-primary-6);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-extrabold);
  text-decoration: none;
  white-space: nowrap;
}

.quick-actions-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.quick-action-card {
  width: 100%;
  border-radius: 20px;
  border: 1px solid var(--color-border-1);
  background: linear-gradient(180deg, #fff, var(--color-bg-2));
  padding: 18px 16px;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  font: inherit;
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal),
    background-color var(--transition-normal);
}

.quick-action-card:hover:not(:disabled) {
  transform: translateY(-1px);
  background: var(--color-bg-2);
  box-shadow: 0 14px 30px rgba(15, 23, 42, 0.08);
}

.quick-action-card:disabled,
.mini-btn:disabled {
  cursor: not-allowed;
  opacity: 0.56;
  box-shadow: none;
}

.quick-action-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border-2);
}

.quick-action-icon svg {
  width: 18px;
  height: 18px;
}

.quick-action-icon[data-tone="blue"] {
  background: #eff6ff;
  color: #1d4ed8;
}
.quick-action-icon[data-tone="indigo"] {
  background: #eef2ff;
  color: #4338ca;
}
.quick-action-icon[data-tone="teal"] {
  background: #ecfeff;
  color: #0f766e;
}
.quick-action-icon[data-tone="rose"] {
  background: #fff1f2;
  color: #be123c;
}

.quick-action-copy {
  min-width: 0;
  display: block;
}

.quick-action-title {
  display: block;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  line-height: 1.35;
}

.quick-action-desc {
  display: block;
  margin-top: 3px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-text-3);
  font-weight: var(--font-weight-bold);
}

/* ── Toolbar meta ──────────────────────────────────── */

.toolbar-meta {
  display: grid;
  gap: 14px;
  padding-top: 2px;
}

.toolbar-meta-left {
  display: grid;
  gap: 12px;
}

.toolbar-meta-label {
  font-size: var(--font-size-sm);
  letter-spacing: var(--letter-spacing-caps);
  text-transform: uppercase;
  font-weight: var(--font-weight-black);
  color: var(--color-text-3);
  line-height: 1.4;
}

.toolbar-inline-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.scope-summary-note {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--color-text-3);
}

@media (min-width: 1024px) {
  .toolbar-meta {
    grid-template-columns: auto minmax(0, 1fr);
    align-items: end;
  }

  .toolbar-inline-actions {
    justify-content: flex-end;
  }
}

@media (max-width: 1279px) {
  .quick-actions-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .quick-actions-grid {
    grid-template-columns: 1fr;
  }
}
</style>
