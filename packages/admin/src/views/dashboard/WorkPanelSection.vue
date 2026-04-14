<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import {
  panels,
  workListData,
  type PanelDef,
  type PanelListKey,
  type WorkItemDef,
} from "./workPanelData";

type Scope = "mine" | "group" | "all";
type TimeWindow = 7 | 30;
type ResolvedWorkItem = {
  title: string;
  meta: string[];
  desc: string;
  status: WorkItemDef["status"];
  statusLabel: string;
  action: string;
  route?: string;
};
type ResolvedPanel = {
  id: PanelDef["id"];
  listKey: PanelListKey;
  featured: boolean;
  tag: string;
  title: string;
  subtitle: string;
  action: string;
  emptyMessage: string;
  items: ResolvedWorkItem[];
};

/**
 * 仪表盘工作面板区，按当前视角整理待办、期限与风险列表。
 */
const props = defineProps<{
  scope: Scope;
  timeWindow: TimeWindow;
}>();
const { t } = useI18n();
const router = useRouter();
/**
 * 返回指定面板在当前筛选条件下应展示的案件列表。
 *
 * @param panel 当前工作面板定义
 * @returns 面板对应的可见工作项列表
 */
function panelItems(panel: PanelDef): WorkItemDef[] {
  const scopeData = workListData[props.scope] ?? {};
  const items = scopeData[panel.listKey] ?? [];
  if (panel.listKey !== "deadlines") return items;
  return items.filter((i) => (i.daysLeft ?? 0) <= props.timeWindow);
}

/**
 * 将工作项定义解析为当前语言下可直接渲染的文案对象。
 *
 * @param scope 当前筛选范围
 * @param listKey 当前面板对应的数据分组
 * @param item 原始工作项定义
 * @returns 已完成国际化解析的工作项
 */
function resolveWorkItem(
  scope: Scope,
  listKey: PanelListKey,
  item: WorkItemDef,
): ResolvedWorkItem {
  const prefix = `dashboard.workItems.${scope}.${listKey}.${item.id}`;

  return {
    title: t(`${prefix}.title`),
    meta: item.metaKeys.map((metaKey) => t(`${prefix}.meta.${metaKey}`)),
    desc: t(`${prefix}.desc`),
    status: item.status,
    statusLabel: t(`${prefix}.statusLabel`),
    action: t(`${prefix}.action`),
    route: item.route,
  };
}

const resolvedPanels = computed<ResolvedPanel[]>(() =>
  panels.map((panel) => ({
    ...panel,
    tag: t(`dashboard.panels.${panel.id}.tag`),
    title: t(`dashboard.panels.${panel.id}.title`),
    subtitle: t(`dashboard.panels.${panel.id}.subtitle`),
    action: t(`dashboard.panels.${panel.id}.action`),
    emptyMessage: t(`dashboard.panels.${panel.id}.emptyMessage`),
    items: panelItems(panel).map((item) =>
      resolveWorkItem(props.scope, panel.listKey, item),
    ),
  })),
);
</script>

<template>
  <section class="panel-section">
    <div class="panel-grid">
      <article
        v-for="panel in resolvedPanels"
        :key="panel.listKey"
        class="surface-card work-panel"
        :class="{ 'work-panel--featured': panel.featured }"
      >
        <div class="work-panel-head">
          <div class="work-panel-intro">
            <span class="work-panel-tag">{{ panel.tag }}</span>
            <h2 class="panel-title">{{ panel.title }}</h2>
            <p class="panel-subtitle">{{ panel.subtitle }}</p>
          </div>
          <button class="mini-btn work-panel-action" type="button">
            {{ panel.action }}
          </button>
        </div>

        <div v-if="panel.items.length" class="work-list">
          <article
            v-for="item in panel.items"
            :key="item.title"
            class="work-item"
          >
            <div class="work-item-head">
              <div>
                <h3 class="work-item-title">{{ item.title }}</h3>
                <div class="work-item-meta">
                  <span v-for="m in item.meta" :key="m">{{ m }}</span>
                </div>
              </div>
              <span :class="['status-pill', `status-${item.status}`]">
                {{ item.statusLabel }}
              </span>
            </div>
            <p class="work-item-desc">{{ item.desc }}</p>
            <div class="work-item-actions">
              <button
                class="mini-btn"
                type="button"
                @click="item.route && router.push(item.route)"
              >
                {{ item.action }}
              </button>
            </div>
          </article>
        </div>

        <div v-else class="empty-state">
          {{ panel.emptyMessage }}
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
@import "./dashboard.css";

.panel-section {
  margin-top: 20px;
}

.panel-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.work-panel {
  padding: 22px;
  display: grid;
  gap: 18px;
  align-content: start;
}

.work-panel--featured {
  grid-column: span 2;
  background:
    linear-gradient(180deg, rgb(239 246 255 / 75%), rgb(255 255 255 / 100%)),
    var(--color-bg-1);
  border-color: rgba(14, 165, 233, 0.16);
  box-shadow: 0 18px 44px rgba(14, 165, 233, 0.08);
}

/* ── Panel header ─────────────────────────────────── */

.work-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.work-panel-intro {
  display: grid;
  gap: 10px;
}

.work-panel-tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  padding: 5px 10px;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
  color: var(--color-text-3);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-black);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  line-height: 1.3;
}

.panel-subtitle {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-3);
  font-weight: var(--font-weight-bold);
}

.work-panel-action {
  flex: 0 0 auto;
}

/* ── Work list / items ────────────────────────────── */

.work-list {
  display: grid;
  gap: 12px;
}

.work-item {
  border: 1px solid var(--color-border-1);
  border-radius: 18px;
  padding: 16px;
  background: rgb(255 255 255 / 88%);
  display: grid;
  gap: 12px;
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal),
    border-color var(--transition-normal);
}

.work-item:hover {
  transform: translateY(-1px);
  border-color: var(--color-border-2);
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.06);
}

.work-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.work-item-title {
  margin: 0;
  font-size: var(--font-size-md);
  line-height: 1.45;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.work-item-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-text-3);
  font-weight: var(--font-weight-extrabold);
  margin-top: 6px;
}

.work-item-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--color-text-3);
  font-weight: var(--font-weight-bold);
}

.work-item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ── Status pills ─────────────────────────────────── */

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
  flex-shrink: 0;
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

.status-muted {
  color: #475569;
  background: rgba(148, 163, 184, 0.12);
  border-color: rgba(148, 163, 184, 0.2);
}

/* ── Empty state ──────────────────────────────────── */

.empty-state {
  border: 1px dashed var(--color-border-2);
  border-radius: 16px;
  padding: 18px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--color-text-3);
  background: var(--color-bg-2);
}

/* ── Responsive ───────────────────────────────────── */

@media (max-width: 1199px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }

  .work-panel--featured {
    grid-column: span 1;
  }
}

@media (max-width: 767px) {
  .work-panel-head {
    flex-direction: column;
  }

  .work-item-head {
    flex-direction: column;
  }
}
</style>
