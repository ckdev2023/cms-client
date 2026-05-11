<script setup lang="ts">
import { useI18n } from "vue-i18n";

import Chip from "../../../shared/ui/Chip.vue";

type SectionIcon = "applicant" | "supporter" | "office" | "folder";

type PreviewRow = {
  id: string;
  label: string;
  required: boolean;
  conditionalTag?: string;
};

type PreviewSection = {
  key: string;
  icon: SectionIcon;
  title: string;
  items: PreviewRow[];
};

/** 案件新建步骤二：资料清单预览区（加载中、摘要 chip、按提供方分组的预览列表）。 */
defineProps<{
  loading: boolean;
  sections: PreviewSection[] | null;
  summaryTotal: number;
  summaryRequired: number;
}>();

const { t } = useI18n();

/**
 * 子分组内的必须项条数。
 *
 * @param items 资料项列表
 * @returns 必须项数量
 */
function sectionRequiredCount(
  items: ReadonlyArray<{ required: boolean }>,
): number {
  let count = 0;
  for (const it of items) if (it.required) count += 1;
  return count;
}
</script>

<template>
  <section class="preview" data-testid="document-preview">
    <header class="preview__header">
      <div class="preview__heading">
        <h3 class="preview__title">
          {{ t("cases.create.step2.documentPreview") }}
        </h3>
        <p class="preview__hint">
          {{ t("cases.create.step2.documentPreviewHint") }}
        </p>
      </div>
      <Chip
        v-if="summaryTotal > 0"
        tone="primary"
        size="md"
        data-testid="document-preview-summary"
      >
        {{
          t("cases.create.step2.documentPreviewSummary", {
            total: summaryTotal,
            required: summaryRequired,
          })
        }}
      </Chip>
    </header>

    <div
      v-if="loading"
      class="preview__loading"
      data-testid="document-preview-loading"
      role="status"
    >
      {{ t("cases.create.step2.documentPreviewLoading") }}
    </div>
    <div v-else-if="sections?.length" class="preview__sections">
      <article v-for="sec in sections" :key="sec.key" class="preview-card">
        <header class="preview-card__header">
          <span
            class="preview-card__icon"
            :data-icon="sec.icon"
            aria-hidden="true"
          >
            <svg
              v-if="sec.icon === 'applicant'"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
            </svg>
            <svg
              v-else-if="sec.icon === 'supporter'"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="9" cy="8" r="3.2" />
              <circle cx="17" cy="9.5" r="2.6" />
              <path d="M2.5 20c0-3.4 3-5.8 6.5-5.8s6.5 2.4 6.5 5.8" />
              <path d="M15 20c0-2.6 2-4.6 5-4.6" />
            </svg>
            <svg
              v-else-if="sec.icon === 'office'"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              <path d="M3 13h18" />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
              />
            </svg>
          </span>
          <h4 class="preview-card__title">
            {{ sec.title }}
          </h4>
          <span class="preview-card__count">
            {{
              t("cases.create.step2.documentPreviewSummary", {
                total: sec.items.length,
                required: sectionRequiredCount(sec.items),
              })
            }}
          </span>
        </header>
        <ul class="preview-card__list">
          <li
            v-for="item in sec.items"
            :key="item.id"
            class="preview-item"
            :data-required="item.required"
          >
            <span class="preview-item__bullet" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12.5l4 4L19 7" />
              </svg>
            </span>
            <span class="preview-item__body">
              <span class="preview-item__label">{{ item.label }}</span>
              <span v-if="item.conditionalTag" class="preview-item__condition">
                {{ item.conditionalTag }}
              </span>
            </span>
            <Chip
              v-if="item.required"
              tone="warning"
              size="micro"
              class="preview-item__chip"
            >
              {{ t("cases.create.step2.requiredBadge") }}
            </Chip>
            <Chip v-else tone="neutral" size="micro" class="preview-item__chip">
              {{ t("cases.create.step2.optionalBadge") }}
            </Chip>
          </li>
        </ul>
      </article>
    </div>
    <div v-else class="preview__empty">
      {{ t("cases.create.step2.documentPreviewEmpty") }}
    </div>
  </section>
</template>
