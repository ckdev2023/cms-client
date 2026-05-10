<script setup lang="ts">
/* eslint-disable max-lines */
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CaseDetail, FormGenerated } from "../types-detail";
import { iconClass, chipTone, hasForms } from "./CaseFormsTab.helpers";
import { downloadGeneratedDocument } from "../model/useGeneratedDocumentDownload";

/** 文書管理 Tab：展示可用模板列表与已生成文書记录。 */
const { t } = useI18n();

defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const emit = defineEmits<{
  (e: "open-generate-modal", templateId?: string): void;
  (e: "finalize", docId: string): void;
  (e: "export", docId: string): void;
  (e: "download-error", payload: { docId: string; reason: string }): void;
}>();

/**
 * 处理下载点击 — 通过认证 fetch 触发浏览器保存。
 *
 * @param event - 原始 click 事件（用于阻止默认导航）
 * @param doc - 已生成文書 view-model
 */
async function handleDownloadClick(
  event: MouseEvent,
  doc: FormGenerated,
): Promise<void> {
  if (!doc.downloadUrl) return;
  event.preventDefault();
  const result = await downloadGeneratedDocument(doc.downloadUrl, doc.name);
  if (!result.ok) {
    emit("download-error", { docId: doc.id, reason: result.reason });
  }
}
</script>

<template>
  <div class="forms-tab">
    <Card padding="none">
      <template #header>
        <h2 class="forms-tab__title">
          {{ t("cases.detail.forms.title") }}
        </h2>
        <Button
          v-if="!readonly"
          variant="filled"
          tone="primary"
          size="sm"
          @click="emit('open-generate-modal')"
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
            <path d="M12 4v16m8-8H4" />
          </svg>
          {{ t("cases.detail.forms.generateAction") }}
        </Button>
      </template>

      <template v-if="hasForms(detail, readonly)">
        <!-- Templates -->
        <div
          v-if="detail.forms.templates.length > 0 && !readonly"
          class="forms-tab__section"
        >
          <div class="forms-tab__kicker">
            {{ t("cases.detail.forms.kickerTemplates") }}
          </div>
          <div
            v-for="(tpl, i) in detail.forms.templates"
            :key="`tpl-${i}`"
            class="forms-tab__row"
          >
            <div class="forms-tab__row-left">
              <svg
                class="forms-tab__row-icon forms-tab__icon--primary"
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
                <path
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <div class="forms-tab__name" lang="ja">{{ tpl.name }}</div>
                <div class="forms-tab__meta">
                  <template v-if="tpl.docTypeKey">{{
                    t(tpl.docTypeKey)
                  }}</template>
                  <template v-else-if="tpl.docTypeRaw">{{
                    tpl.docTypeRaw
                  }}</template>
                  <template v-if="tpl.language"> · {{ tpl.language }}</template>
                  <template v-if="tpl.versionNo && tpl.versionNo > 0">
                    · v{{ tpl.versionNo }}</template
                  >
                </div>
              </div>
            </div>
            <Button
              v-if="!readonly"
              size="sm"
              pill
              @click="emit('open-generate-modal', tpl.id)"
            >
              {{ tpl.actionLabel }}
            </Button>
          </div>
        </div>

        <!-- Generated -->
        <div
          v-if="detail.forms.generated.length > 0"
          class="forms-tab__section forms-tab__section--border"
        >
          <div class="forms-tab__kicker">
            {{ t("cases.detail.forms.kickerGenerated") }}
          </div>
          <div
            v-for="(doc, i) in detail.forms.generated"
            :key="`gen-${i}`"
            class="forms-tab__row"
          >
            <div class="forms-tab__row-left">
              <svg
                :class="['forms-tab__row-icon', iconClass(doc)]"
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
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div class="forms-tab__name" lang="ja">{{ doc.name }}</div>
                <div class="forms-tab__meta">
                  {{ doc.meta }}
                  <template v-if="doc.approvedBy || doc.approvedAt">
                    &nbsp;·
                    {{
                      t("cases.detail.forms.metaApprovedAt", {
                        action: t(
                          `cases.detail.forms.status.${doc.backendStatus}`,
                        ),
                        name: doc.approvedBy ?? "",
                        time: doc.approvedAt ?? "",
                      })
                    }}
                  </template>
                </div>
              </div>
              <Chip :tone="chipTone(doc)" size="micro">
                {{ t(`cases.detail.forms.status.${doc.backendStatus}`) }}
              </Chip>
            </div>
            <div class="forms-tab__row-actions">
              <span
                v-if="doc.backendStatus === 'exporting'"
                class="forms-tab__exporting-indicator"
                data-testid="exporting-indicator"
              >
                <svg
                  class="forms-tab__spinner"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" opacity="0.25" />
                  <path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <span class="forms-tab__btn-label">{{
                  t("cases.detail.forms.status.exporting")
                }}</span>
              </span>
              <span
                v-if="doc.fileUrlIsPlaceholder"
                class="forms-tab__placeholder-badge"
                data-testid="placeholder-badge"
              >
                {{ t("cases.detail.forms.placeholderBadge") }}
              </span>
              <a
                v-if="
                  doc.backendStatus === 'exported' &&
                  doc.downloadUrl &&
                  !doc.fileUrlIsPlaceholder
                "
                class="forms-tab__download-link"
                :href="doc.downloadUrl"
                download
                data-testid="download-link"
                :aria-label="t('cases.detail.forms.downloadAction')"
                @click="handleDownloadClick($event, doc)"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span class="forms-tab__btn-label">{{
                  t("cases.detail.forms.downloadAction")
                }}</span>
              </a>
              <Button
                v-if="doc.backendStatus === 'draft' && !readonly"
                size="sm"
                pill
                data-testid="finalize-btn"
                @click="emit('finalize', doc.id)"
              >
                {{ t("cases.detail.forms.finalizeAction") }}
              </Button>
              <Button
                v-if="doc.backendStatus === 'export_failed' && !readonly"
                size="sm"
                pill
                data-testid="retry-export-btn"
                @click="emit('export', doc.id)"
              >
                {{ t("cases.detail.forms.retryExportAction") }}
              </Button>
              <Button
                v-if="
                  (doc.backendStatus === 'final' ||
                    doc.backendStatus === 'exported') &&
                  !readonly
                "
                size="sm"
                pill
                data-testid="export-btn"
                :aria-label="
                  doc.backendStatus === 'exported'
                    ? t('cases.detail.forms.exportAgainAction')
                    : t('cases.detail.forms.exportAction')
                "
                @click="emit('export', doc.id)"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span class="forms-tab__btn-label">{{
                  doc.backendStatus === "exported"
                    ? t("cases.detail.forms.exportAgainAction")
                    : t("cases.detail.forms.exportAction")
                }}</span>
              </Button>
              <button
                class="forms-tab__link-btn"
                type="button"
                disabled
                :title="t('shell.topbar.comingSoon')"
              >
                {{ t("cases.detail.forms.versionHistoryAction") }}
              </button>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="forms-tab__empty">
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
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <p>{{ t("cases.detail.forms.empty") }}</p>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.forms-tab {
  display: grid;
  gap: 20px;
}
.forms-tab :deep(.ui-card__header) {
  padding: 14px 20px;
}
.forms-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-tight);
  color: var(--color-text-1);
}
.forms-tab__section {
  padding: 0 20px 12px;
}
.forms-tab__section--border {
  border-top: 1px solid var(--color-border-1);
}
.forms-tab__kicker {
  padding: 16px 0 8px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.forms-tab__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
}
.forms-tab__row + .forms-tab__row {
  border-top: 1px solid var(--color-border-1);
}
.forms-tab__row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}
.forms-tab__row-icon {
  flex-shrink: 0;
}
.forms-tab__name {
  font-size: var(--font-size-base);
  line-height: var(--leading-base);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.forms-tab__meta {
  font-size: var(--font-size-sm);
  line-height: var(--leading-sm);
  color: var(--color-text-3);
  margin-top: 2px;
}
.forms-tab__row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.forms-tab__download-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
  text-decoration: none;
  white-space: nowrap;
}
.forms-tab__download-link:hover {
  text-decoration: underline;
}
.forms-tab__download-link:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
.forms-tab__link-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
  cursor: pointer;
  white-space: nowrap;
}
.forms-tab__link-btn:hover:not(:disabled) {
  text-decoration: underline;
}
.forms-tab__link-btn:focus-visible:not(:disabled) {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
.forms-tab__link-btn:disabled {
  color: var(--color-text-3);
  cursor: not-allowed;
  opacity: 0.5;
}
.forms-tab__icon--success {
  color: var(--color-success, #22c55e);
}
.forms-tab__icon--warning {
  color: var(--color-warning);
}
.forms-tab__icon--primary {
  color: var(--color-primary-6);
}
.forms-tab__icon--danger {
  color: var(--color-danger-vivid);
}
.forms-tab__icon--muted {
  color: var(--color-text-3);
}
.forms-tab__placeholder-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: var(--font-size-sm);
  line-height: var(--leading-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  background: var(--color-bg-3);
  white-space: nowrap;
}
.forms-tab__exporting-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-base);
  line-height: var(--leading-base);
  color: var(--color-text-2);
}
.forms-tab__spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .forms-tab__row {
    flex-wrap: wrap;
  }
  .forms-tab__row-actions {
    gap: 8px;
    flex-wrap: wrap;
  }
  .forms-tab__btn-label {
    display: none;
  }
  .forms-tab__row-actions .forms-tab__link-btn {
    font-size: 0;
  }
  .forms-tab__row-actions .forms-tab__link-btn::before {
    content: "⏱";
    font-size: var(--font-size-base);
  }
}
.forms-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--color-text-3);
}
.forms-tab__empty p {
  margin: 0;
  font-size: var(--font-size-base);
  line-height: var(--leading-base);
  font-weight: var(--font-weight-semibold);
}
</style>
