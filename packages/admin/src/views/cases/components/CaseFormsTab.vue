<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CaseDetail, FormGenerated, FormTemplate } from "../types-detail";
import {
  iconClass,
  chipTone,
  hasForms,
  canFinalizeDraftGeneratedDoc,
} from "./CaseFormsTab.helpers";
import { downloadGeneratedDocument } from "../model/useGeneratedDocumentDownload";

/** 文書管理 Tab：展示可用模板列表与已生成文書记录。 */
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    detail: CaseDetail;
    readonly: boolean;
    templatesLoading?: boolean;
  }>(),
  { templatesLoading: false },
);

const showTemplatesLoading = computed(
  () =>
    props.templatesLoading &&
    !props.readonly &&
    !hasForms(props.detail, props.readonly),
);

const emit = defineEmits<{
  /** 不传 template：顶部入口；传入则为对应模板行的登记入口。 */
  (e: "open-generate-modal", template?: FormTemplate): void;
  (e: "finalize", docId: string): void;
  (e: "delete-draft", docId: string): void;
  (e: "download-error", payload: { docId: string; reason: string }): void;
}>();

/** 将给定 URL 写入系统剪贴板（异步 fire-and-forget）。
 * @param url - 要复制的链接文本
 */
function copyToClipboard(url: string): void {
  void navigator.clipboard.writeText(url);
}

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
          {{ t("cases.detail.forms.registerAction") }}
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
              @click="emit('open-generate-modal', tpl)"
            >
              {{ t("cases.detail.forms.generateAction") }}
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
          <p
            v-if="detail.forms.generated.length > 0 && !readonly"
            class="forms-tab__gate-hint"
          >
            {{ t("cases.detail.forms.submissionGateHint") }}
          </p>
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
                v-if="doc.fileUrlIsPlaceholder"
                class="forms-tab__placeholder-badge"
                data-testid="placeholder-badge"
              >
                {{ t("cases.detail.forms.placeholderBadge") }}
              </span>
              <a
                v-if="doc.resourceOpenUrl"
                class="forms-tab__download-link"
                :href="doc.resourceOpenUrl"
                target="_blank"
                rel="noopener noreferrer"
                data-testid="open-resource-link"
                :aria-label="t('cases.detail.forms.openLinkAction')"
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
                    d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"
                  />
                </svg>
                <span class="forms-tab__btn-label">{{
                  t("cases.detail.forms.openLinkAction")
                }}</span>
              </a>
              <button
                v-if="doc.resourceOpenUrl"
                type="button"
                class="forms-tab__link-btn"
                data-testid="copy-resource-link"
                :aria-label="t('cases.detail.forms.copyLinkAction')"
                @click="copyToClipboard(doc.resourceOpenUrl!)"
              >
                {{ t("cases.detail.forms.copyLinkAction") }}
              </button>
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
                :disabled="!canFinalizeDraftGeneratedDoc(doc)"
                :title="
                  !canFinalizeDraftGeneratedDoc(doc)
                    ? t('cases.detail.forms.finalizeRequiresExternalUrlHint')
                    : undefined
                "
                @click="emit('finalize', doc.id)"
              >
                {{ t("cases.detail.forms.finalizeAction") }}
              </Button>
              <Button
                v-if="doc.backendStatus === 'draft' && !readonly"
                variant="outlined"
                tone="danger"
                size="sm"
                pill
                data-testid="delete-draft-btn"
                @click="emit('delete-draft', doc.id)"
              >
                {{ t("cases.detail.forms.deleteDraftAction") }}
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

      <div
        v-else-if="showTemplatesLoading"
        class="forms-tab__empty forms-tab__empty--loading"
        data-testid="forms-templates-loading"
        role="status"
        aria-live="polite"
      >
        <p>{{ t("cases.detail.forms.templatesLoading") }}</p>
      </div>

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

<style scoped src="./CaseFormsTab.css"></style>
