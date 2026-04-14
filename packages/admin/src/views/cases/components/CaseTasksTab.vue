<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import type { CaseDetail, TaskItem } from "../types-detail";

/** 任务列表 Tab：展示待办与已完成任务，含到期日与负责人。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const DUE_COLOR_CLASS: Record<string, string> = {
  danger: "tasks-tab__due--danger",
  warning: "tasks-tab__due--warning",
  muted: "tasks-tab__due--muted",
};

const AVATAR_COLOR: Record<string, string> = {
  primary: "var(--color-primary-6)",
  success: "var(--color-success, #22c55e)",
  warning: "#f59e0b",
};

/**
 * 根据到期日紧急程度返回 CSS 类名。
 *
 * @param item - 任务条目
 * @returns CSS 类名
 */
function dueClass(item: TaskItem): string {
  return DUE_COLOR_CLASS[item.dueColor] ?? "tasks-tab__due--muted";
}

/**
 * 根据任务负责人色调返回头像背景色。
 *
 * @param item - 任务条目
 * @returns 背景色 CSS 值
 */
function avatarBg(item: TaskItem): string {
  return AVATAR_COLOR[item.color] ?? "var(--color-primary-6)";
}
</script>

<template>
  <div class="tasks-tab">
    <Card padding="none">
      <template #header>
        <h2 class="tasks-tab__title">任务列表</h2>
        <button v-if="!readonly" class="tasks-tab__add-link" type="button">
          <svg
            width="16"
            height="16"
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
          新增任务
        </button>
      </template>

      <template v-if="detail.tasks.length > 0">
        <div v-for="(task, i) in detail.tasks" :key="i" class="tasks-tab__row">
          <div class="tasks-tab__row-left">
            <span
              :class="[
                'tasks-tab__checkbox',
                { 'tasks-tab__checkbox--done': task.done },
              ]"
              role="checkbox"
              :aria-checked="task.done"
              :aria-label="task.label"
            >
              <svg
                v-if="task.done"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <span
              :class="[
                'tasks-tab__label',
                { 'tasks-tab__label--done': task.done },
              ]"
            >
              {{ task.label }}
            </span>
          </div>
          <div class="tasks-tab__row-right">
            <span :class="['tasks-tab__due', dueClass(task)]">
              {{ task.due }}
            </span>
            <span
              class="tasks-tab__avatar"
              :style="{ backgroundColor: avatarBg(task) }"
              :title="task.assignee"
            >
              {{ task.assignee }}
            </span>
          </div>
        </div>

        <div v-if="!readonly" class="tasks-tab__footer">
          <button class="tasks-tab__add-inline" type="button">
            <svg
              width="16"
              height="16"
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
            <span>添加新任务...</span>
          </button>
        </div>
      </template>

      <div v-else class="tasks-tab__empty">
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
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <p>暂无待办任务</p>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.tasks-tab {
  display: grid;
  gap: 20px;
}

.tasks-tab__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Header add link ──────────────────────────────────── */

.tasks-tab__add-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
  cursor: pointer;
}

.tasks-tab__add-link:hover {
  text-decoration: underline;
}

/* ── Task rows ────────────────────────────────────────── */

.tasks-tab__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
}

.tasks-tab__row + .tasks-tab__row {
  border-top: 1px solid var(--color-border-1);
}

.tasks-tab__row-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.tasks-tab__row-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

/* ── Checkbox ─────────────────────────────────────────── */

.tasks-tab__checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border: 2px solid var(--color-border-2);
  border-radius: var(--radius-full);
  background: var(--color-bg-1);
  transition:
    background-color 0.15s,
    border-color 0.15s;
}

.tasks-tab__checkbox--done {
  background: var(--color-primary-6);
  border-color: var(--color-primary-6);
  color: #fff;
}

/* ── Label ────────────────────────────────────────────── */

.tasks-tab__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.tasks-tab__label--done {
  color: var(--color-text-3);
  text-decoration: line-through;
  font-weight: var(--font-weight-semibold);
}

/* ── Due badge ────────────────────────────────────────── */

.tasks-tab__due {
  display: inline-block;
  padding: 3px 8px;
  border-radius: var(--radius-default);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  line-height: 1.4;
  white-space: nowrap;
}

.tasks-tab__due--danger {
  background: rgba(220, 38, 38, 0.08);
  color: var(--color-danger);
}

.tasks-tab__due--warning {
  background: rgba(245, 158, 11, 0.08);
  color: #92400e;
}

.tasks-tab__due--muted {
  background: var(--color-bg-3);
  color: var(--color-text-3);
}

/* ── Avatar circle ────────────────────────────────────── */

.tasks-tab__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-weight-black);
  color: #fff;
  flex-shrink: 0;
}

/* ── Footer: add inline ──────────────────────────────── */

.tasks-tab__footer {
  border-top: 1px solid var(--color-border-1);
  padding: 14px 20px;
}

.tasks-tab__add-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  cursor: pointer;
  text-align: left;
  transition: color 0.15s;
}

.tasks-tab__add-inline:hover {
  color: var(--color-text-1);
}

/* ── Empty state ──────────────────────────────────────── */

.tasks-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  color: var(--color-text-3);
}

.tasks-tab__empty p {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
