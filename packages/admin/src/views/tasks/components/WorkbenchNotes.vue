<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 任务工作台「页面说明」折叠披露组件，默认收起，避免抢占主面板空间。
 */
const { t } = useI18n();
</script>

<template>
  <details class="workbench-notes">
    <summary class="workbench-notes__summary">
      <svg
        class="workbench-notes__icon"
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
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
      <span>{{ t("tasks.workbench.aside.title") }}</span>
    </summary>
    <div class="workbench-notes__body">
      <p class="workbench-notes__copy">
        {{ t("tasks.workbench.aside.copy") }}
      </p>
      <ul class="workbench-notes__list">
        <li>{{ t("tasks.workbench.aside.list.item1") }}</li>
        <li>{{ t("tasks.workbench.aside.list.item2") }}</li>
        <li>{{ t("tasks.workbench.aside.list.item3") }}</li>
      </ul>
    </div>
  </details>
</template>

<style scoped>
.workbench-notes {
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  background: var(--color-bg-2);
}

.workbench-notes[open] {
  background: var(--color-bg-1);
}

.workbench-notes__summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-2);
  cursor: pointer;
  list-style: none;
  user-select: none;
}

.workbench-notes__summary::-webkit-details-marker {
  display: none;
}

.workbench-notes__summary::after {
  content: "";
  width: 8px;
  height: 8px;
  margin-left: 4px;
  border-right: 1.5px solid currentColor;
  border-bottom: 1.5px solid currentColor;
  transform: rotate(45deg);
  transition: transform 160ms ease;
}

.workbench-notes[open] .workbench-notes__summary::after {
  transform: rotate(-135deg);
}

.workbench-notes__icon {
  color: var(--color-text-3);
  flex-shrink: 0;
}

.workbench-notes__body {
  padding: 0 16px 14px;
  display: grid;
  gap: 8px;
  color: var(--color-text-2);
  font-size: var(--font-size-sm);
  line-height: var(--leading-relaxed);
}

.workbench-notes__copy {
  margin: 0;
}

.workbench-notes__list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 4px;
}
</style>
