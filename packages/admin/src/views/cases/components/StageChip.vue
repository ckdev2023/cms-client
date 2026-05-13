<script lang="ts">
/**
 * Stage 渲染粒度：
 * - `short`：仅展示 stage code（如 `S1`）。
 * - `full`：仅展示本地化全文 label（如 `Filed`）。
 * - `both`：同 Chip 内同时展示 code + label（如 `S1 · Filed`），
 *   用于 Case Detail header 等需要高信息密度的场景。
 */
export type StagePrecision = "short" | "full" | "both";
</script>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip, { type ChipTone } from "../../../shared/ui/Chip.vue";
import type { CaseStageId } from "../types";
import {
  BADGE_TONE_MAP,
  CASE_STAGES,
  getStageI18nKey,
  getStageLabel,
} from "../constants";

/**
 * StageChip：跨页面统一 stage 渲染粒度的 Chip 组件，对齐 BUG-182。
 *
 * - Cases List / Customer Detail Cases tab：`precision="full"`
 * - Case Detail header：`precision="both"`
 */
const props = withDefaults(
  defineProps<{
    /** Stage code（`S1..S9`）或 free-text stage 文案。 */
    code: CaseStageId | string | null | undefined;
    /**
     * 覆盖 `code` 对应的阶段全文 i18n 键（如 BMV S7 认定后跟踪）。
     * 不传时仍使用 `getStageI18nKey(code)`。
     */
    labelI18nKey?: string | null;
    /** 渲染粒度，默认 `full`。 */
    precision?: StagePrecision;
    /** 是否渲染 Chip 圆点提示态（透传 `Chip.dot`）。 */
    dot?: boolean;
    /** code 为空时的兜底展示，默认 `—`。 */
    fallback?: string;
  }>(),
  { precision: "full", dot: false, fallback: "—", labelI18nKey: null },
);

const { t } = useI18n();

const normalizedCode = computed<string>(() =>
  typeof props.code === "string" ? props.code.trim() : "",
);

const isCanonicalStage = computed(() =>
  Boolean(CASE_STAGES[normalizedCode.value as CaseStageId]),
);

const tone = computed<ChipTone>(() => {
  if (!isCanonicalStage.value) return "neutral";
  const badge =
    CASE_STAGES[normalizedCode.value as CaseStageId]?.badge ?? "badge-gray";
  return (BADGE_TONE_MAP[badge] ?? "neutral") as ChipTone;
});

const fullLabel = computed<string>(() => {
  const code = normalizedCode.value;
  if (!code) return "";
  const key = props.labelI18nKey?.trim() || getStageI18nKey(code);
  return key ? t(key) : getStageLabel(code);
});

const displayText = computed<string>(() => {
  const code = normalizedCode.value;
  if (!code) return props.fallback;
  if (props.precision === "short") return code;
  if (props.precision === "full") return fullLabel.value;
  if (!isCanonicalStage.value) return fullLabel.value;
  return `${code} · ${fullLabel.value}`;
});
</script>

<template>
  <Chip :tone="tone" :dot="dot">{{ displayText }}</Chip>
</template>
