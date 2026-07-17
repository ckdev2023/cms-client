<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { CaseDetail } from "./types-detail-core";
import { resolveStageLabelI18nKey } from "../caseLabels";

/**
 * 案件详情页状态横幅：只读态与失败结案路径提示。
 *
 * 采用 fragment 根（两个并列 banner），使其在壳的 `.case-detail-view` grid 中
 * 仍各占一个 grid item——包一层 wrapper 会让两条横幅塌成同一个 item 而丢掉 gap。
 */
const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const { t } = useI18n();

const stageLabel = computed(() => {
  const key = resolveStageLabelI18nKey(
    props.detail.stageCode,
    props.detail.workflowStep?.stepCode,
  );
  return key ? t(key) : props.detail.stage;
});
</script>

<template>
  <div v-if="readonly" class="case-detail-view__readonly-banner" role="status">
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
    <span>
      {{ t("cases.detail.readonlyBanner", { stage: stageLabel }) }}
    </span>
  </div>

  <div
    v-if="detail.failureCloseout && !readonly"
    class="case-detail-view__failure-banner"
    role="status"
    data-testid="failure-path-banner"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"
      />
    </svg>
    <span>{{ t("cases.detail.failurePathBanner") }}</span>
  </div>
</template>

<style scoped src="./CaseDetailStatusBanners.css"></style>
