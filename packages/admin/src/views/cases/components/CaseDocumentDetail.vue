<script setup lang="ts">
import Chip from "../../../shared/ui/Chip.vue";
import type { DocumentItem } from "../types-detail";

/** 文書展开详情：版本历史、审核记录、催办时间线。 */

defineProps<{
  item: DocumentItem;
}>();

/**
 * 将路径复制到剪贴板。
 *
 * @param path - 相对路径字符串
 */
function copyPath(path: string) {
  void navigator.clipboard.writeText(path);
}
</script>

<template>
  <div class="doc-detail">
    <!-- Version history -->
    <div
      v-if="item.versions && item.versions.length > 0"
      class="doc-detail__section"
    >
      <h4 class="doc-detail__section-title">附件版本历史</h4>
      <table class="doc-detail__version-table">
        <thead>
          <tr>
            <th>版本</th>
            <th>文件名</th>
            <th>相对路径</th>
            <th>登记时间</th>
            <th>存储</th>
            <th>来源</th>
            <th>有效期</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in item.versions" :key="v.version">
            <td>
              <span class="doc-detail__version-badge">v{{ v.version }}</span>
            </td>
            <td>{{ v.fileName }}</td>
            <td class="doc-detail__version-path">
              <span :title="v.relativePath">{{ v.relativePath }}</span>
              <button
                type="button"
                class="doc-detail__copy-btn"
                title="复制路径"
                @click.stop="copyPath(v.relativePath)"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                  />
                </svg>
              </button>
            </td>
            <td>{{ v.registeredAt }}</td>
            <td>{{ v.storageType }}</td>
            <td class="doc-detail__version-ref">{{ v.referenceSource }}</td>
            <td>{{ v.expiryDate ?? "—" }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Review records -->
    <div
      v-if="item.reviews && item.reviews.length > 0"
      class="doc-detail__section"
    >
      <h4 class="doc-detail__section-title">审核记录</h4>
      <div class="doc-detail__review-list">
        <div
          v-for="(r, ri) in item.reviews"
          :key="ri"
          class="doc-detail__review-item"
        >
          <Chip
            :tone="r.conclusion === 'approved' ? 'success' : 'danger'"
            size="sm"
          >
            {{ r.conclusionLabel }}
          </Chip>
          <span class="doc-detail__review-meta">
            {{ r.reviewer }} · {{ r.time }}
          </span>
          <span v-if="r.reason" class="doc-detail__review-reason">
            原因：{{ r.reason }}
          </span>
        </div>
      </div>
    </div>

    <!-- Reminder timeline -->
    <div
      v-if="item.reminders && item.reminders.length > 0"
      class="doc-detail__section"
    >
      <h4 class="doc-detail__section-title">催办记录</h4>
      <div class="doc-detail__reminder-timeline">
        <div
          v-for="(rem, ri) in item.reminders"
          :key="ri"
          class="doc-detail__reminder-item"
        >
          <div class="doc-detail__reminder-dot" />
          <div class="doc-detail__reminder-content">
            <span class="doc-detail__reminder-time">{{ rem.time }}</span>
            <span class="doc-detail__reminder-desc">
              {{ rem.method }} · 对象：{{ rem.target }} · 操作人：{{
                rem.operator
              }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.doc-detail {
  padding: 0 20px 16px 42px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.doc-detail__section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-detail__section-title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Version table ─────────────────────────────────── */

.doc-detail__version-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.doc-detail__version-table th {
  text-align: left;
  padding: 6px 8px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.doc-detail__version-table td {
  padding: 6px 8px;
  color: var(--color-text-2);
  border-bottom: 1px solid var(--color-border-1);
  white-space: nowrap;
}

.doc-detail__version-table tr:last-child td {
  border-bottom: none;
}

.doc-detail__version-badge {
  display: inline-block;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  background: var(--color-bg-3);
  border-radius: var(--radius-default);
  color: var(--color-text-2);
}

.doc-detail__version-path {
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: var(--font-mono, monospace);
  max-width: 220px;
}

.doc-detail__version-path > span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-detail__version-ref {
  font-size: 11px;
  color: var(--color-primary-6);
}

.doc-detail__copy-btn {
  flex-shrink: 0;
  border: none;
  background: none;
  padding: 2px;
  cursor: pointer;
  color: var(--color-text-3);
  border-radius: var(--radius-default);
  transition: color 0.15s;
}

.doc-detail__copy-btn:hover {
  color: var(--color-text-1);
}

/* ── Review records ────────────────────────────────── */

.doc-detail__review-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.doc-detail__review-item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.doc-detail__review-meta {
  color: var(--color-text-3);
}

.doc-detail__review-reason {
  flex-basis: 100%;
  padding-left: 4px;
  color: var(--color-text-2);
  font-style: italic;
}

/* ── Reminder timeline ─────────────────────────────── */

.doc-detail__reminder-timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
  padding-left: 12px;
}

.doc-detail__reminder-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  position: relative;
  padding-bottom: 12px;
}

.doc-detail__reminder-item:last-child {
  padding-bottom: 0;
}

.doc-detail__reminder-item::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 10px;
  bottom: -2px;
  width: 1px;
  background: var(--color-border-1);
}

.doc-detail__reminder-item:last-child::before {
  display: none;
}

.doc-detail__reminder-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-primary-6);
  margin-top: 4px;
}

.doc-detail__reminder-content {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
}

.doc-detail__reminder-time {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.doc-detail__reminder-desc {
  color: var(--color-text-3);
}
</style>
