<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import CaseOverviewSidebar from "./CaseOverviewSidebar.vue";
import type { CaseDetailTab } from "../types";
import type { CaseDetail, ProviderProgress } from "../types-detail";

/** 概览 Tab：展示案件摘要卡片、提供方进度、下一步动作、近期动态与侧边栏。 */
defineProps<{
  detail: CaseDetail;
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
}>();

/**
 * 计算提供方资料完成百分比。
 *
 * @param p - 提供方进度数据
 * @returns 完成百分比（0–100）
 */
function progressPercent(p: ProviderProgress): number {
  return p.total === 0 ? 0 : Math.round((p.done / p.total) * 100);
}

/**
 * 将时间线条目的语义色名称映射为 CSS 颜色值。
 *
 * @param color - 语义色名称（如 "primary"、"danger"）
 * @returns 对应的 CSS 变量或色值
 */
function timelineColor(color: string): string {
  const map: Record<string, string> = {
    primary: "var(--color-primary-6)",
    warning: "#f59e0b",
    success: "var(--color-success)",
    danger: "var(--color-danger)",
    border: "var(--color-border-2)",
  };
  return map[color] ?? "var(--color-border-2)";
}
</script>

<template>
  <div class="overview-tab">
    <!-- Summary cards -->
    <div class="overview-tab__grid-4">
      <Card padding="md">
        <div class="overview-tab__stat">
          <span class="overview-tab__stat-label">当前办案进度</span>
          <span class="overview-tab__stat-value">{{ detail.stage }}</span>
          <span class="overview-tab__stat-meta">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {{ detail.stageMeta }}
          </span>
        </div>
      </Card>
      <Card padding="md">
        <div class="overview-tab__stat">
          <span class="overview-tab__stat-label">预计截止日期</span>
          <span
            :class="[
              'overview-tab__stat-value',
              { 'overview-tab__stat-value--danger': detail.deadlineDanger },
            ]"
            >{{ detail.deadline }}</span
          >
          <span
            :class="[
              'overview-tab__stat-meta',
              { 'overview-tab__stat-meta--danger': detail.deadlineDanger },
            ]"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {{ detail.deadlineMeta }}
          </span>
        </div>
      </Card>
      <Card padding="md">
        <div class="overview-tab__stat">
          <span class="overview-tab__stat-label">资料完成率</span>
          <div class="overview-tab__progress-row">
            <span class="overview-tab__stat-value"
              >{{ detail.progressPercent }}%</span
            >
            <div class="overview-tab__progress-track">
              <div
                class="overview-tab__progress-fill"
                :style="{ width: `${detail.progressPercent}%` }"
              />
            </div>
          </div>
          <span class="overview-tab__stat-meta">{{
            detail.progressCount
          }}</span>
        </div>
      </Card>
      <Card padding="md">
        <div class="overview-tab__stat">
          <span class="overview-tab__stat-label">财务状况</span>
          <span class="overview-tab__stat-value">{{
            detail.billingAmount
          }}</span>
          <span class="overview-tab__stat-meta">{{ detail.billingMeta }}</span>
        </div>
      </Card>
    </div>

    <!-- Provider progress -->
    <Card padding="md">
      <div class="overview-tab__provider-header">
        <span class="overview-tab__kicker">按提供方完成率</span>
        <span class="overview-tab__provider-title">资料收集分组进度</span>
      </div>
      <div class="overview-tab__provider-list">
        <div
          v-for="(p, i) in detail.providerProgress"
          :key="i"
          class="overview-tab__provider-row"
        >
          <span class="overview-tab__provider-label">{{ p.label }}</span>
          <div class="overview-tab__provider-bar">
            <div
              class="overview-tab__provider-bar-fill"
              :style="{ width: `${progressPercent(p)}%` }"
            />
          </div>
          <span class="overview-tab__provider-count"
            >{{ p.done }}/{{ p.total }}</span
          >
        </div>
      </div>
    </Card>

    <!-- Main 2-column layout -->
    <div class="overview-tab__main-grid">
      <div class="overview-tab__main-left">
        <!-- Next action -->
        <div class="overview-tab__next-action">
          <div class="overview-tab__next-action-icon">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div class="overview-tab__next-action-body">
            <h3 class="overview-tab__next-action-title">下一关键动作</h3>
            <p class="overview-tab__next-action-text">
              {{ detail.nextAction }}
            </p>
            <div class="overview-tab__next-action-buttons">
              <Button
                variant="filled"
                tone="primary"
                size="sm"
                @click="
                  emit(
                    'switchTab',
                    detail.overviewActions.primary.tab as CaseDetailTab,
                  )
                "
              >
                {{ detail.overviewActions.primary.label }}
              </Button>
              <Button
                size="sm"
                @click="
                  emit(
                    'switchTab',
                    detail.overviewActions.secondary.tab as CaseDetailTab,
                  )
                "
              >
                {{ detail.overviewActions.secondary.label }}
              </Button>
            </div>
          </div>
        </div>

        <!-- Timeline -->
        <Card title="近期动态" padding="md">
          <div class="overview-tab__timeline">
            <div
              v-for="(entry, i) in detail.timeline"
              :key="i"
              class="overview-tab__timeline-item"
            >
              <span
                class="overview-tab__timeline-dot"
                :style="{ backgroundColor: timelineColor(entry.color) }"
              />
              <div>
                <div class="overview-tab__timeline-text">{{ entry.text }}</div>
                <div class="overview-tab__timeline-meta">{{ entry.meta }}</div>
              </div>
            </div>
          </div>
          <template #footer>
            <button
              class="overview-tab__timeline-more"
              type="button"
              @click="emit('switchTab', 'log')"
            >
              查看完整日志 →
            </button>
          </template>
        </Card>
      </div>

      <CaseOverviewSidebar
        :detail="detail"
        @switch-tab="(tab) => emit('switchTab', tab)"
      />
    </div>
  </div>
</template>

<style scoped>
.overview-tab {
  display: grid;
  gap: 20px;
}

.overview-tab__grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1024px) {
  .overview-tab__grid-4 {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 600px) {
  .overview-tab__grid-4 {
    grid-template-columns: 1fr;
  }
}

.overview-tab__stat {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.overview-tab__stat-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.overview-tab__stat-value {
  font-size: 22px;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
  line-height: 1.2;
}
.overview-tab__stat-value--danger {
  color: var(--color-danger);
}
.overview-tab__stat-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
.overview-tab__stat-meta--danger {
  color: var(--color-danger);
}

.overview-tab__progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 2px;
}
.overview-tab__progress-track {
  flex: 1;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.overview-tab__progress-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.overview-tab__provider-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
}
.overview-tab__kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.overview-tab__provider-title {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.overview-tab__provider-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.overview-tab__provider-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.overview-tab__provider-label {
  flex-shrink: 0;
  width: 120px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}
.overview-tab__provider-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}
.overview-tab__provider-bar-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}
.overview-tab__provider-count {
  flex-shrink: 0;
  min-width: 36px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
  text-align: right;
}

.overview-tab__main-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}
@media (max-width: 1024px) {
  .overview-tab__main-grid {
    grid-template-columns: 1fr;
  }
}
.overview-tab__main-left {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-tab__next-action {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #fffaf5 0%, var(--color-bg-1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-xl);
}
.overview-tab__next-action-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: #fff;
  border: 1px solid rgba(245, 158, 11, 0.2);
  box-shadow: var(--shadow-1);
  color: #f59e0b;
}
.overview-tab__next-action-body {
  flex: 1;
  min-width: 0;
}
.overview-tab__next-action-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.overview-tab__next-action-text {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  line-height: 1.6;
}
.overview-tab__next-action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.overview-tab__timeline {
  position: relative;
  margin-left: 12px;
  padding-left: 20px;
  border-left: 2px solid var(--color-border-1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.overview-tab__timeline-item {
  position: relative;
  display: flex;
  flex-direction: column;
}
.overview-tab__timeline-dot {
  position: absolute;
  left: -27px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}
.overview-tab__timeline-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
.overview-tab__timeline-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
}
.overview-tab__timeline-more {
  display: block;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  cursor: pointer;
  text-align: center;
}
.overview-tab__timeline-more:hover {
  color: var(--color-text-1);
}
</style>
