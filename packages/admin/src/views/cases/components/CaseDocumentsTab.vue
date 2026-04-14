<script setup lang="ts">
import { computed } from "vue";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import CaseDocumentRow from "./CaseDocumentRow.vue";
import type { CaseDetail } from "../types-detail";
import {
  computeProviderStat,
  computeCaseDocumentCompletionRate,
  isDocumentListEmpty,
} from "../model/caseDocumentStats";

/** 文書管理 Tab：按提供者分组展示进度与文書清单，含空状态与动态完成率。 */
const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const isEmpty = computed(() => isDocumentListEmpty(props.detail.documents));

const overallRate = computed(() =>
  computeCaseDocumentCompletionRate(props.detail.documents),
);

const groupStats = computed(() =>
  props.detail.documents.map((g) => ({
    group: g,
    stat: computeProviderStat(g),
  })),
);
</script>

<template>
  <div class="docs-tab">
    <!-- Empty state -->
    <Card v-if="isEmpty" padding="md">
      <div class="docs-tab__empty">
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="docs-tab__empty-icon"
        >
          <path
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span class="docs-tab__empty-title">暂无资料登记</span>
        <span class="docs-tab__empty-desc">
          该案件尚未添加任何资料需求。请通过"登记资料"或"手动添加"开始建立资料清单。
        </span>
        <div v-if="!readonly" class="docs-tab__empty-actions">
          <Button variant="filled" tone="primary" size="sm">登记资料</Button>
          <Button size="sm">手动添加</Button>
        </div>
      </div>
    </Card>

    <template v-else>
      <!-- Provider progress -->
      <Card padding="md">
        <div class="docs-tab__progress-header">
          <span class="docs-tab__kicker">按提供方完成率</span>
          <span class="docs-tab__progress-title">资料收集分组进度</span>
        </div>
        <div class="docs-tab__progress-list">
          <div
            v-for="(p, i) in detail.providerProgress"
            :key="i"
            class="docs-tab__progress-row"
          >
            <span class="docs-tab__progress-label">{{ p.label }}</span>
            <div class="docs-tab__progress-bar">
              <div
                class="docs-tab__progress-bar-fill"
                :style="{
                  width: `${p.total === 0 ? 0 : Math.round((p.done / p.total) * 100)}%`,
                }"
              />
            </div>
            <span class="docs-tab__progress-count"
              >{{ p.done }}/{{ p.total }}</span
            >
          </div>
        </div>
      </Card>

      <!-- Document groups -->
      <Card padding="none">
        <template #header>
          <div class="docs-tab__card-header">
            <div>
              <h2 class="docs-tab__section-title">资料登记清单</h2>
              <div class="docs-tab__global-progress">
                <div class="docs-tab__global-progress-track">
                  <div
                    class="docs-tab__global-progress-fill"
                    :style="{ width: `${overallRate.percent}%` }"
                  />
                </div>
                <span class="docs-tab__global-progress-label">
                  {{ overallRate.label }}（{{ overallRate.percent }}%）
                </span>
              </div>
            </div>
            <div v-if="!readonly" class="docs-tab__header-actions">
              <Button variant="filled" tone="primary" size="sm">
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
                登记资料
              </Button>
              <Button size="sm">
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
                手动添加
              </Button>
            </div>
          </div>
        </template>

        <div
          v-for="({ group, stat }, gi) in groupStats"
          :key="gi"
          class="docs-tab__group"
        >
          <div class="docs-tab__group-header">
            <div class="docs-tab__group-header-row">
              <span class="docs-tab__group-title">{{ group.group }}</span>
              <span class="docs-tab__group-count">{{ stat.label }}</span>
            </div>
            <div class="docs-tab__group-bar">
              <div
                class="docs-tab__group-bar-fill"
                :class="{
                  'docs-tab__group-bar-fill--complete': stat.percent === 100,
                }"
                :style="{ width: `${stat.percent}%` }"
              />
            </div>
          </div>
          <CaseDocumentRow
            v-for="(item, ii) in group.items"
            :key="ii"
            :item="item"
            :readonly="readonly"
          />
          <div v-if="group.items.length === 0" class="docs-tab__group-empty">
            该分组暂无资料项
          </div>
        </div>
      </Card>
    </template>
  </div>
</template>

<style scoped>
.docs-tab {
  display: grid;
  gap: 20px;
}

/* ── Empty state ───────────────────────────────────────── */

.docs-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 24px;
  text-align: center;
}

.docs-tab__empty-icon {
  color: var(--color-text-3);
  opacity: 0.5;
  margin-bottom: 4px;
}

.docs-tab__empty-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.docs-tab__empty-desc {
  font-size: 13px;
  color: var(--color-text-3);
  max-width: 360px;
  line-height: 1.5;
}

.docs-tab__empty-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

/* ── Provider progress ─────────────────────────────────── */

.docs-tab__progress-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 16px;
}

.docs-tab__kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.docs-tab__progress-title {
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.docs-tab__progress-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.docs-tab__progress-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.docs-tab__progress-label {
  flex-shrink: 0;
  width: 140px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.docs-tab__progress-bar {
  flex: 1;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.docs-tab__progress-bar-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.docs-tab__progress-count {
  flex-shrink: 0;
  min-width: 36px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
  text-align: right;
}

/* ── Card header ───────────────────────────────────────── */

.docs-tab__card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.docs-tab__section-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.docs-tab__global-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.docs-tab__global-progress-track {
  flex: 1;
  min-width: 120px;
  height: 6px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.docs-tab__global-progress-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.docs-tab__global-progress-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  white-space: nowrap;
}

.docs-tab__header-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

/* ── Group ─────────────────────────────────────────────── */

.docs-tab__group + .docs-tab__group {
  border-top: 1px solid var(--color-border-1);
}

.docs-tab__group-header {
  padding: 16px 20px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.docs-tab__group-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.docs-tab__group-title {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.docs-tab__group-count {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.docs-tab__group-bar {
  height: 4px;
  background: var(--color-bg-3);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.docs-tab__group-bar-fill {
  height: 100%;
  background: var(--color-primary-6);
  border-radius: var(--radius-full);
  transition: width 0.3s ease;
}

.docs-tab__group-bar-fill--complete {
  background: var(--color-success);
}

.docs-tab__group-empty {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-3);
}
</style>
