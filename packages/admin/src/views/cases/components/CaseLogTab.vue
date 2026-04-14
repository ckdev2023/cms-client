<script setup lang="ts">
import { ref, computed } from "vue";
import Card from "../../../shared/ui/Card.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, LogEntry } from "../types-detail";
import type { LogCategoryKey } from "../types";
import { LOG_CATEGORIES } from "../constants";

/** 日志 Tab：展示三分类日志（操作/审核/状态变更）与分段筛选控件。 */
const props = defineProps<{
  detail: CaseDetail;
}>();

const activeCategory = ref<LogCategoryKey>("all");

const filteredEntries = computed<LogEntry[]>(() => {
  if (activeCategory.value === "all") return props.detail.logEntries;
  return props.detail.logEntries.filter((e) => e.type === activeCategory.value);
});

const DOT_COLOR_MAP: Record<string, string> = {
  primary: "var(--color-primary-6)",
  success: "var(--color-success, #22c55e)",
  warning: "#f59e0b",
  danger: "var(--color-danger, #dc2626)",
  border: "var(--color-border-2)",
};

const AVATAR_BG: Record<string, string> = {
  primary: "var(--color-primary-6)",
  success: "var(--color-success, #22c55e)",
  warning: "#f59e0b",
  surface: "var(--color-bg-3)",
};

const CHIP_TONE_MAP: Record<string, ChipTone> = {
  green: "success",
  blue: "primary",
};

/**
 * 根据日志条目的时间线圆点色标返回 CSS 颜色。
 *
 * @param entry - 日志条目
 * @returns CSS 颜色值
 */
function dotBg(entry: LogEntry): string {
  return DOT_COLOR_MAP[entry.dotColor] ?? "var(--color-border-2)";
}

/**
 * 根据头像色调键返回背景色。
 *
 * @param style - 头像样式标识
 * @returns CSS 背景色值
 */
function avatarBg(style: string): string {
  return AVATAR_BG[style] ?? "var(--color-primary-6)";
}

/**
 * 根据头像色调键返回前景色。
 *
 * @param style - 头像样式标识
 * @returns CSS 前景色值
 */
function avatarColor(style: string): string {
  return style === "surface" ? "var(--color-text-2)" : "#fff";
}

/**
 * 根据日志条目的分类标签返回 Chip 色调。
 *
 * @param entry - 日志条目
 * @returns Chip 色调标识
 */
function chipTone(entry: LogEntry): ChipTone {
  return CHIP_TONE_MAP[entry.categoryChip] ?? "neutral";
}
</script>

<template>
  <div class="log-tab">
    <Card padding="lg">
      <div class="log-tab__header">
        <h2 class="log-tab__title">日志</h2>
        <div class="log-tab__segmented" role="radiogroup" aria-label="日志分类">
          <button
            v-for="cat in LOG_CATEGORIES"
            :key="cat.key"
            type="button"
            role="radio"
            :aria-checked="activeCategory === cat.key"
            :class="[
              'log-tab__segment',
              { 'log-tab__segment--active': activeCategory === cat.key },
            ]"
            @click="activeCategory = cat.key"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <div v-if="filteredEntries.length > 0" class="log-tab__timeline">
        <div
          v-for="(entry, i) in filteredEntries"
          :key="i"
          class="log-tab__entry"
        >
          <span
            class="log-tab__dot"
            :style="{ backgroundColor: dotBg(entry) }"
            aria-hidden="true"
          />
          <div class="log-tab__entry-content">
            <div class="log-tab__entry-main">
              <div class="log-tab__entry-left">
                <span
                  class="log-tab__avatar"
                  :style="{
                    backgroundColor: avatarBg(entry.avatarStyle),
                    color: avatarColor(entry.avatarStyle),
                  }"
                >
                  {{ entry.avatar }}
                </span>
                <div class="log-tab__entry-info">
                  <p class="log-tab__entry-text">{{ entry.text }}</p>
                  <div class="log-tab__entry-meta">
                    <Chip :tone="chipTone(entry)" size="sm">
                      {{ entry.category }}
                    </Chip>
                    <span class="log-tab__entry-object">
                      {{ entry.objectType }}
                    </span>
                  </div>
                </div>
              </div>
              <span class="log-tab__entry-time">{{ entry.time }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="log-tab__empty">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p>暂无日志记录</p>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.log-tab {
  display: grid;
  gap: 20px;
}

/* ── Header ──────────────────────────────────────────── */

.log-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 24px;
}

.log-tab__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Segmented control ───────────────────────────────── */

.log-tab__segmented {
  display: inline-flex;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-default);
  overflow: hidden;
  background: var(--color-bg-3);
}

.log-tab__segment {
  padding: 6px 14px;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  cursor: pointer;
  transition:
    background-color 0.15s,
    color 0.15s;
  white-space: nowrap;
}

.log-tab__segment + .log-tab__segment {
  border-left: 1px solid var(--color-border-2);
}

.log-tab__segment:hover {
  color: var(--color-text-1);
}

.log-tab__segment--active {
  background: var(--color-bg-1);
  color: var(--color-text-1);
  font-weight: var(--font-weight-black);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

/* ── Timeline ────────────────────────────────────────── */

.log-tab__timeline {
  border-left: 2px solid var(--color-border-1);
  margin-left: 8px;
}

.log-tab__entry {
  position: relative;
  padding: 16px 0 16px 24px;
  transition: background-color 0.15s;
}

.log-tab__entry + .log-tab__entry {
  border-top: 1px solid var(--color-border-1);
}

.log-tab__entry:hover {
  background-color: var(--color-bg-2, #fbfbfd);
}

.log-tab__dot {
  position: absolute;
  left: -5px;
  top: 22px;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

/* ── Entry content ───────────────────────────────────── */

.log-tab__entry-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.log-tab__entry-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.log-tab__entry-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.log-tab__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-full);
  font-size: 9px;
  font-weight: var(--font-weight-black);
  flex-shrink: 0;
}

.log-tab__entry-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.log-tab__entry-text {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-1);
  line-height: 1.5;
}

.log-tab__entry-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-tab__entry-object {
  font-size: 11px;
  color: var(--color-text-3);
}

.log-tab__entry-time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Empty state ─────────────────────────────────────── */

.log-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--color-text-3);
}

.log-tab__empty p {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
