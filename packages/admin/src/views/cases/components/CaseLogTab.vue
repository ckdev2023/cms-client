<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseDetail, LogEntry } from "../types-detail";
import type { LogCategoryKey } from "../types";
import { LOG_CATEGORIES } from "../constants";

/** 日志 Tab：展示案件日志时间线与分类筛选。 */
const { t } = useI18n();

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
 * 解析时间线文本——对 `fromPhaseKey` / `toPhaseKey` 进行二次翻译后再插值。
 *
 * Adapter 层返回的 params 中包含「待翻译的 i18n key」（如 `cases.phases.APPROVED`），
 * 视图层需要先把这些 key 翻译成当前 locale 下的文案，再传给外层 `t()` 做最终插值。
 *
 * @param entry - 日志条目
 * @returns 翻译后的时间线文本
 */
function resolveTimelineText(entry: LogEntry): string {
  const params: Record<string, unknown> = { ...(entry.textParams ?? {}) };
  if (typeof params.fromPhaseKey === "string" && params.fromPhaseKey) {
    params.from = t(params.fromPhaseKey);
  }
  if (typeof params.toPhaseKey === "string" && params.toPhaseKey) {
    params.to = t(params.toPhaseKey);
  }
  return t(entry.text, params);
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
                <span class="log-tab__avatar" :style="entry.avatarStyle">
                  {{ entry.avatar }}
                </span>
                <div class="log-tab__entry-info">
                  <p class="log-tab__entry-text">
                    {{ resolveTimelineText(entry) }}
                  </p>
                  <div class="log-tab__entry-meta">
                    <Chip :tone="chipTone(entry)" size="sm">
                      {{ t(entry.category) }}
                    </Chip>
                    <span class="log-tab__entry-object">
                      {{ t(entry.objectType) }}
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
