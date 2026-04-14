<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { CaseDetail, FormGenerated } from "../types-detail";

/** 文書管理 Tab：展示可用模板列表与已生成文書记录。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const TONE_ICON_CLASS: Record<string, string> = {
  success: "forms-tab__icon--success",
  warning: "forms-tab__icon--warning",
  primary: "forms-tab__icon--primary",
  muted: "forms-tab__icon--muted",
};

/**
 * 根据生成文書状态色调返回图标 CSS 类名。
 *
 * @param item - 已生成文書条目
 * @returns CSS 类名
 */
function iconClass(item: FormGenerated): string {
  return TONE_ICON_CLASS[item.tone] ?? "forms-tab__icon--muted";
}

/**
 * 判断当前案件是否有模板或已生成文書。
 *
 * @param detail - 案件详情数据
 * @returns 是否包含文書数据
 */
function hasForms(detail: CaseDetail): boolean {
  return detail.forms.templates.length > 0 || detail.forms.generated.length > 0;
}
</script>

<template>
  <div class="forms-tab">
    <Card padding="none">
      <template #header>
        <h2 class="forms-tab__title">文書管理</h2>
        <Button v-if="!readonly" variant="filled" tone="primary" size="sm">
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
          生成文書
        </Button>
      </template>

      <template v-if="hasForms(detail)">
        <!-- Templates -->
        <div
          v-if="detail.forms.templates.length > 0"
          class="forms-tab__section"
        >
          <div class="forms-tab__kicker">可用模板</div>
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
                <div class="forms-tab__name">{{ tpl.name }}</div>
                <div class="forms-tab__meta">{{ tpl.meta }}</div>
              </div>
            </div>
            <Button v-if="!readonly" size="sm" pill>
              {{ tpl.actionLabel }}
            </Button>
          </div>
        </div>

        <!-- Generated -->
        <div
          v-if="detail.forms.generated.length > 0"
          class="forms-tab__section forms-tab__section--border"
        >
          <div class="forms-tab__kicker">已生成文書</div>
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
                <div class="forms-tab__name">{{ doc.name }}</div>
                <div class="forms-tab__meta">{{ doc.meta }}</div>
              </div>
            </div>
            <div class="forms-tab__row-actions">
              <Button size="sm" pill>
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
                导出
              </Button>
              <button class="forms-tab__link-btn" type="button">
                版本历史
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
        <p>暂无可用文書模板或生成记录</p>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.forms-tab {
  display: grid;
  gap: 20px;
}

.forms-tab__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Sections ─────────────────────────────────────────── */

.forms-tab__section {
  padding: 0 20px 12px;
}

.forms-tab__section--border {
  border-top: 1px solid var(--color-border-1);
}

.forms-tab__kicker {
  padding: 16px 0 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Rows ─────────────────────────────────────────────── */

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
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.forms-tab__meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 2px;
}

.forms-tab__row-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.forms-tab__link-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
  cursor: pointer;
  white-space: nowrap;
}

.forms-tab__link-btn:hover {
  text-decoration: underline;
}

/* ── Icon tones ───────────────────────────────────────── */

.forms-tab__icon--success {
  color: var(--color-success, #22c55e);
}

.forms-tab__icon--warning {
  color: #f59e0b;
}

.forms-tab__icon--primary {
  color: var(--color-primary-6);
}

.forms-tab__icon--muted {
  color: var(--color-text-3);
}

/* ── Empty state ──────────────────────────────────────── */

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
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
