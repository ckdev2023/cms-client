<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Chip from "../../../shared/ui/Chip.vue";
import { formatDateTime } from "../../../shared/model/formatDateTime";
import {
  resolveTimelineText,
  type I18nAccessor,
} from "../model/CaseTimelineTextResolver";
import type { CaseDetailTab } from "../types";
import type { TimelineEntry, TimelineTrack } from "../types-detail";

/** 概览页时间线区：双轨（business_phase / stage）+ other 单轨 fallback。 */
const { t, te, locale } = useI18n();
const props = defineProps<{
  timeline: TimelineEntry[];
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
}>();

const hasDualTrack = computed(() =>
  props.timeline.some(
    (e) => e.track === "business_phase" || e.track === "stage",
  ),
);

/**
 * 按轨道筛选时间线条目。
 *
 * @param track - 目标轨道
 * @returns 过滤后的条目列表
 */
function trackEntries(track: TimelineTrack): TimelineEntry[] {
  return props.timeline.filter((e) => e.track === track);
}

const phaseTrackEntries = computed(() => trackEntries("business_phase"));
const stageTrackEntries = computed(() => trackEntries("stage"));
const otherTrackEntries = computed(() => trackEntries("other"));

const i18nAccessor: I18nAccessor = { t, te };

/**
 * 将时间线颜色键映射为实际颜色值。
 *
 * @param color - 时间线颜色键。
 * @returns 对应的颜色值。
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

/**
 * 解析概览时间线条目的文案（委托共享 resolver）。
 *
 * @param entry - 时间线条目
 * @returns 翻译后的展示文本
 */
function resolveText(entry: TimelineEntry): string {
  return resolveTimelineText(entry, i18nAccessor);
}

/**
 * 格式化时间戳：成功则返回 locale 格式化结果，失败回退原值。
 *
 * @param raw - 原始时间戳字符串
 * @param loc - BCP 47 locale 标识符
 * @returns 格式化后的日期时间
 */
function formatEntryTime(raw: string, loc: string): string {
  if (!raw) return "";
  return formatDateTime(raw, loc) || raw;
}
</script>

<template>
  <Card :title="t('cases.detail.overview.timeline.title')" padding="md">
    <div v-if="timeline.length === 0" class="overview-tab__timeline-empty">
      {{ t("cases.detail.overview.timeline.empty") }}
    </div>

    <div
      v-else-if="hasDualTrack"
      class="overview-timeline__dual-track"
      data-testid="timeline-dual-track"
    >
      <div
        v-if="phaseTrackEntries.length > 0"
        class="overview-timeline__track-lane"
        data-testid="timeline-track-business-phase"
      >
        <div class="overview-timeline__track-label">
          {{ t("cases.log.timeline.trackBusinessPhase") }}
        </div>
        <div class="overview-timeline">
          <div
            v-for="(entry, i) in phaseTrackEntries"
            :key="'bp-' + i"
            class="overview-timeline__item"
          >
            <span
              class="overview-timeline__dot"
              :style="{ backgroundColor: timelineColor(entry.color) }"
            />
            <div>
              <div class="overview-timeline__text">
                {{ resolveText(entry) }}
                <Chip
                  v-if="entry.synthesized"
                  tone="neutral"
                  size="micro"
                  class="overview-timeline__synthesized-chip"
                  data-testid="synthesized-chip"
                >
                  {{ t("cases.log.timeline.synthesizedHint") }}
                </Chip>
              </div>
              <div class="overview-timeline__meta">
                {{ formatEntryTime(entry.meta, locale) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="stageTrackEntries.length > 0"
        class="overview-timeline__track-lane"
        data-testid="timeline-track-stage"
      >
        <div class="overview-timeline__track-label">
          {{ t("cases.log.timeline.trackStage") }}
        </div>
        <div class="overview-timeline">
          <div
            v-for="(entry, i) in stageTrackEntries"
            :key="'st-' + i"
            class="overview-timeline__item"
          >
            <span
              class="overview-timeline__dot"
              :style="{ backgroundColor: timelineColor(entry.color) }"
            />
            <div>
              <div class="overview-timeline__text">
                {{ resolveText(entry) }}
                <Chip
                  v-if="entry.synthesized"
                  tone="neutral"
                  size="micro"
                  class="overview-timeline__synthesized-chip"
                  data-testid="synthesized-chip"
                >
                  {{ t("cases.log.timeline.synthesizedHint") }}
                </Chip>
              </div>
              <div class="overview-timeline__meta">
                {{ formatEntryTime(entry.meta, locale) }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="otherTrackEntries.length > 0">
        <div class="overview-timeline">
          <div
            v-for="(entry, i) in otherTrackEntries"
            :key="'ot-' + i"
            class="overview-timeline__item"
          >
            <span
              class="overview-timeline__dot"
              :style="{ backgroundColor: timelineColor(entry.color) }"
            />
            <div>
              <div class="overview-timeline__text">
                {{ resolveText(entry) }}
              </div>
              <div class="overview-timeline__meta">
                {{ formatEntryTime(entry.meta, locale) }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="overview-timeline">
      <div
        v-for="(entry, i) in timeline"
        :key="i"
        class="overview-timeline__item"
      >
        <span
          class="overview-timeline__dot"
          :style="{ backgroundColor: timelineColor(entry.color) }"
        />
        <div>
          <div class="overview-timeline__text">
            {{ resolveText(entry) }}
          </div>
          <div class="overview-timeline__meta">
            {{ formatEntryTime(entry.meta, locale) }}
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <button
        class="overview-timeline__more"
        type="button"
        @click="emit('switchTab', 'log')"
      >
        {{ t("cases.detail.overview.timeline.viewAll") }}
      </button>
    </template>
  </Card>
</template>

<style scoped>
.overview-tab__timeline-empty {
  padding: 12px 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.overview-timeline {
  position: relative;
  margin-left: 12px;
  padding-left: 20px;
  border-left: 2px solid var(--color-border-1);
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.overview-timeline__item {
  position: relative;
  display: flex;
  flex-direction: column;
}
.overview-timeline__dot {
  position: absolute;
  left: -27px;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}
.overview-timeline__text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
.overview-timeline__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
}
.overview-timeline__more {
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
.overview-timeline__more:hover {
  color: var(--color-text-1);
}

.overview-timeline__dual-track {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}
@media (max-width: 768px) {
  .overview-timeline__dual-track {
    grid-template-columns: 1fr;
  }
}
.overview-timeline__track-lane {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.overview-timeline__track-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--color-border-1);
}
.overview-timeline__synthesized-chip {
  margin-left: 6px;
  vertical-align: middle;
}
</style>
