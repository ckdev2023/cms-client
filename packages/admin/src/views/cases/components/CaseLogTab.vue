<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, LogEntry } from "../types-detail";
import type { LogCategoryKey } from "../types";
import { LOG_CATEGORIES } from "../constants";
import { formatDateTime } from "../../../shared/model/formatDateTime";
import {
  resolveTimelineText,
  type I18nAccessor,
} from "../model/CaseTimelineTextResolver";

/** 日志 Tab：展示案件日志时间线与分类筛选。 */
const { t, te, locale } = useI18n();

const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const activeCategory = ref<LogCategoryKey>("all");

const filteredEntries = computed<LogEntry[]>(() => {
  if (activeCategory.value === "all") return props.detail.logEntries;
  return props.detail.logEntries.filter((e) => e.type === activeCategory.value);
});

const CHIP_TONE_MAP: Record<string, ChipTone> = {
  "chip-muted": "neutral",
  "chip-warning": "warning",
  "chip-primary": "primary",
};

/**
 * 获取日志时间点圆点的背景颜色。
 * @param entry - 日志项。
 * @returns 对应的背景颜色值。
 */
function dotBg(entry: LogEntry): string {
  if (entry.synthesized) return "var(--color-border-2)";
  return entry.dotColor || "var(--color-border-2)";
}

/**
 * 获取日志分类标签对应的 `ChipTone`。
 * @param entry - 日志项。
 * @returns 对应的标签色调。
 */
function chipTone(entry: LogEntry): ChipTone {
  return CHIP_TONE_MAP[entry.categoryChip] ?? "neutral";
}

/**
 * 格式化日志条目的时间戳：成功则返回 locale 格式化结果，失败回退原值。
 *
 * @param raw - 原始时间戳字符串。
 * @param loc - BCP 47 locale 标识符。
 * @returns 格式化后的日期时间，或在解析失败时回退原值。
 */
function formatEntryTime(raw: string, loc: string): string {
  if (!raw) return "";
  const formatted = formatDateTime(raw, loc);
  return formatted || raw;
}

const i18nAccessor: I18nAccessor = { t, te };

/**
 * 解析日志条目的时间线文案（委托共享 resolver）。
 *
 * @param entry - 日志条目
 * @returns 翻译后的展示文本
 */
function resolveEntryText(entry: LogEntry): string {
  return resolveTimelineText(entry, i18nAccessor);
}
</script>

<template>
  <div class="log-tab">
    <Card padding="lg">
      <div class="log-tab__header">
        <h2 class="log-tab__title">{{ t("cases.detail.log.title") }}</h2>
        <div
          class="log-tab__segmented"
          role="radiogroup"
          :aria-label="t('cases.detail.log.categoryLabel')"
        >
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
            {{ t(cat.i18nKey) }}
          </button>
        </div>
      </div>

      <div v-if="filteredEntries.length > 0" class="log-tab__timeline">
        <div
          v-for="(entry, i) in filteredEntries"
          :key="i"
          :class="[
            'log-tab__entry',
            { 'log-tab__entry--synthesized': !!entry.synthesized },
          ]"
        >
          <span
            class="log-tab__dot"
            :style="{ backgroundColor: dotBg(entry) }"
            aria-hidden="true"
          />
          <div class="log-tab__entry-content">
            <div class="log-tab__entry-main">
              <div class="log-tab__entry-left">
                <span class="log-tab__avatar" :style="entry.avatarStyle">
                  {{ entry.avatar }}
                </span>
                <div class="log-tab__entry-info">
                  <p class="log-tab__entry-text">
                    {{ resolveEntryText(entry) }}
                    <Chip
                      v-if="entry.synthesized"
                      tone="neutral"
                      size="micro"
                      class="log-tab__synthesized-chip"
                      data-testid="log-synthesized-chip"
                    >
                      {{ t("cases.log.timeline.synthesizedHint") }}
                    </Chip>
                  </p>
                  <div class="log-tab__entry-meta">
                    <Chip :tone="chipTone(entry)">
                      {{ t(entry.category) }}
                    </Chip>
                    <span class="log-tab__entry-object">
                      {{ t(entry.objectType) }}
                    </span>
                  </div>
                </div>
              </div>
              <span class="log-tab__entry-time">{{
                formatEntryTime(entry.time, locale)
              }}</span>
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
        <p>{{ t("cases.detail.log.empty") }}</p>
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
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Segmented control ───────────────────────────────── */

.log-tab__segmented {
  display: inline-flex;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-md);
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
  font-weight: var(--font-weight-bold);
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
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: #fff;
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
}

.log-tab__entry-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.log-tab__entry-object {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.log-tab__entry-time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Synthesized / data-repair visual distinction ─────── */

.log-tab__entry--synthesized {
  opacity: 0.7;
  background-color: var(--color-bg-2, #fbfbfd);
}

.log-tab__synthesized-chip {
  margin-left: 6px;
  vertical-align: middle;
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
