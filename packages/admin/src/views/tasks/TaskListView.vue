<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../shared/ui/Button.vue";
import Card from "../../shared/ui/Card.vue";
import PageHeader from "../../shared/ui/PageHeader.vue";
import WorkbenchNotes from "./components/WorkbenchNotes.vue";
import { useToast } from "../../shared/model/useToast";
import { createTaskRepository } from "./model/TaskRepository";
import {
  canComplete,
  formatDateTime,
  formatTaskWorkbenchTitle,
  formatUpdatedAt,
  isTaskOverdue,
  priorityLabel,
  reminderMeta,
  reminderRowTone,
  reminderStatusLabel,
  reminderTitle,
  taskRowTone,
  taskStatusLabel,
} from "./model/taskWorkbenchViewHelpers";
import { residenceLabelToCode } from "./model/residenceLabelToTypeCode";
import { getCaseTypeI18nKey } from "../../shared/model/caseTypeI18n";
import { useTaskWorkbenchModel } from "./model/useTaskWorkbenchModel";
import { createTaskWorkbenchToastNotifier } from "./model/useTaskWorkbenchToast";
import type { TaskRecord, TaskWorkbenchView } from "./types";

/**
 * 任务与提醒工作台页面，集中展示待办任务、逾期任务与提醒日志。
 */
const { t, locale } = useI18n();
const toast = useToast();

const model = useTaskWorkbenchModel({
  repo: createTaskRepository(),
  notifyComplete: createTaskWorkbenchToastNotifier(toast, t),
});

/**
 * 判断给定任务是否处于"已逾期"状态，供模板中行级样式与角标渲染复用。
 *
 * @param task - 待判断的任务记录。
 * @returns 任务已逾期时返回 `true`。
 */
function isOverdueRow(task: TaskRecord): boolean {
  return isTaskOverdue(task);
}

/**
 * 将 server payload 中的 ja-JP 在留资格标签反查为当前 locale 的翻译文案。
 *
 * @param raw - 原始在留资格标签字符串
 * @returns 翻译后文案；未命中时返回 null
 */
function resolveVisaLabel(raw: string): string | null {
  const code = residenceLabelToCode(raw);
  if (!code) return null;
  const key = getCaseTypeI18nKey(code);
  return key ? t(key) : null;
}

const viewCards = computed(
  (): {
    key: TaskWorkbenchView;
    title: string;
    hint: string;
    count: number;
  }[] => [
    {
      key: "pending",
      title: t("tasks.workbench.views.pending.title"),
      hint: t("tasks.workbench.views.pending.hint"),
      count: model.counts.value.pending,
    },
    {
      key: "today",
      title: t("tasks.workbench.views.today.title"),
      hint: t("tasks.workbench.views.today.hint"),
      count: model.counts.value.today,
    },
    {
      key: "overdue",
      title: t("tasks.workbench.views.overdue.title"),
      hint: t("tasks.workbench.views.overdue.hint"),
      count: model.counts.value.overdue,
    },
    {
      key: "reminders",
      title: t("tasks.workbench.views.reminders.title"),
      hint: t("tasks.workbench.views.reminders.hint"),
      count: model.counts.value.reminders,
    },
  ],
);

const panelTitle = computed(() => {
  if (model.activeView.value === "today")
    return t("tasks.workbench.views.today.panelTitle");
  if (model.activeView.value === "overdue")
    return t("tasks.workbench.views.overdue.panelTitle");
  if (model.activeView.value === "reminders")
    return t("tasks.workbench.views.reminders.panelTitle");
  return t("tasks.workbench.views.pending.panelTitle");
});

const panelCountLabel = computed(() => {
  const isReminders = model.activeView.value === "reminders";
  const visible = isReminders
    ? model.reminderLog.value.length
    : model.currentTasks.value.length;
  // 分母用 panelTotal（即 counts[activeView]），保持与顶部 KPI 卡片同语义；
  // 不要回退成 taskTotal/reminderTotal，那是服务端原始 total（含已完成/已取消）。
  const total = model.panelTotal.value;
  return t("tasks.workbench.panelCount", { visible, total });
});

onMounted(() => {
  void model.fetchWorkbench();
});
</script>

<template>
  <div class="tasks-view">
    <PageHeader
      :title="t('shell.nav.items.tasks')"
      :subtitle="t('tasks.workbench.subtitle')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('shell.nav.items.tasks') },
      ]"
    >
      <template #actions>
        <span class="updated-at">
          {{ formatUpdatedAt(model.lastUpdatedAt.value, locale, t) }}
        </span>
        <Button
          :loading="model.loading.value"
          @click="void model.fetchWorkbench()"
        >
          {{ t("tasks.workbench.refresh") }}
        </Button>
      </template>
    </PageHeader>

    <div class="summary-grid">
      <button
        v-for="card in viewCards"
        :key="card.key"
        type="button"
        class="summary-card"
        :class="{ 'summary-card--active': model.activeView.value === card.key }"
        :aria-pressed="model.activeView.value === card.key"
        @click="model.setActiveView(card.key)"
      >
        <span class="summary-card__title">{{ card.title }}</span>
        <strong class="summary-card__value">{{ card.count }}</strong>
        <span class="summary-card__hint">{{ card.hint }}</span>
      </button>
    </div>

    <WorkbenchNotes />

    <Card
      v-if="model.error.value"
      :title="t('tasks.workbench.errorTitle')"
      padding="md"
    >
      <div class="state-block state-block--error">
        <p>{{ model.error.value }}</p>
        <Button size="sm" @click="void model.fetchWorkbench()">
          {{ t("tasks.workbench.reload") }}
        </Button>
      </div>
    </Card>

    <Card
      :title="panelTitle"
      padding="none"
      class="panel-card panel-card--main"
    >
      <template #extra>
        <span class="panel-meta">{{ panelCountLabel }}</span>
      </template>

      <div v-if="model.loading.value" class="state-block">
        {{ t("tasks.workbench.loading") }}
      </div>

      <div v-else-if="model.activeView.value === 'reminders'">
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t("tasks.workbench.reminderTable.headerTitle") }}</th>
              <th>{{ t("tasks.workbench.reminderTable.headerTime") }}</th>
              <th>{{ t("tasks.workbench.reminderTable.headerStatus") }}</th>
              <th>{{ t("tasks.workbench.reminderTable.headerMeta") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="reminder in model.reminderLog.value" :key="reminder.id">
              <td>
                <div class="cell-stack" :title="reminder.id">
                  <strong>{{
                    reminderTitle(reminder, t, resolveVisaLabel)
                  }}</strong>
                </div>
              </td>
              <td>{{ formatDateTime(reminder.remindAt, locale) }}</td>
              <td>
                <span
                  class="status-pill"
                  :data-tone="reminderRowTone(reminder)"
                >
                  {{ reminderStatusLabel(reminder.sendStatus, t) }}
                </span>
              </td>
              <td>{{ reminderMeta(reminder, t) }}</td>
            </tr>
            <tr v-if="model.reminderLog.value.length === 0">
              <td colspan="4" class="empty-row">
                {{ t("tasks.workbench.reminderTable.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>{{ t("tasks.workbench.taskTable.headerTask") }}</th>
              <th>{{ t("tasks.workbench.taskTable.headerCase") }}</th>
              <th>{{ t("tasks.workbench.taskTable.headerDue") }}</th>
              <th>{{ t("tasks.workbench.taskTable.headerStatus") }}</th>
              <th>{{ t("tasks.workbench.taskTable.headerPriority") }}</th>
              <th>{{ t("tasks.workbench.taskTable.headerActions") }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="task in model.currentTasks.value"
              :key="task.id"
              :class="{ 'task-row--overdue': isOverdueRow(task) }"
              :data-overdue="isOverdueRow(task) ? 'true' : null"
            >
              <td>
                <div class="cell-stack">
                  <strong>{{ formatTaskWorkbenchTitle(task, t) }}</strong>
                  <span class="cell-meta">{{
                    task.description || task.taskType
                  }}</span>
                </div>
              </td>
              <td>
                <div class="cell-stack">
                  <strong>{{
                    task.caseName ||
                    task.caseNo ||
                    t("tasks.workbench.placeholder")
                  }}</strong>
                  <span class="cell-meta">{{
                    task.assigneeName ||
                    t("tasks.workbench.taskTable.unassigned")
                  }}</span>
                </div>
              </td>
              <td>{{ formatDateTime(task.dueAt, locale) }}</td>
              <td>
                <div class="status-cell">
                  <span
                    class="status-pill"
                    :data-tone="taskRowTone(task, isOverdueRow(task))"
                  >
                    {{ taskStatusLabel(task.status, t) }}
                  </span>
                  <span
                    v-if="isOverdueRow(task)"
                    class="overdue-badge"
                    :aria-label="
                      t('tasks.workbench.taskTable.overdueA11yLabel')
                    "
                  >
                    {{ t("tasks.workbench.taskTable.overdueBadge") }}
                  </span>
                </div>
              </td>
              <td>{{ priorityLabel(task.priority, t) }}</td>
              <td>
                <Button
                  size="sm"
                  :disabled="!canComplete(task)"
                  :loading="model.completingId.value === task.id"
                  @click="void model.completeTask(task.id)"
                >
                  {{ t("tasks.workbench.taskTable.complete") }}
                </Button>
              </td>
            </tr>
            <tr v-if="model.currentTasks.value.length === 0">
              <td colspan="6" class="empty-row">
                {{ t("tasks.workbench.taskTable.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>

<style scoped>
.tasks-view {
  display: grid;
  gap: 24px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.summary-card {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  background: var(--color-bg-1);
  box-shadow: var(--shadow-1);
  text-align: left;
  cursor: pointer;
}

.summary-card--active {
  border-color: var(--color-primary-6);
  box-shadow: var(--shadow-primary-btn);
}

.summary-card__title,
.summary-card__hint,
.panel-meta,
.cell-meta {
  color: var(--color-text-3);
}

.summary-card__title {
  font-size: var(--font-size-sm);
}

.summary-card__value {
  font-size: var(--font-size-3xl);
  color: var(--color-text-1);
}

.summary-card__hint {
  margin: 0;
  line-height: var(--leading-relaxed);
}

.updated-at {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.panel-card--main {
  min-width: 0;
}

.panel-card--main :deep(.ui-card__header) {
  padding: 14px 20px;
}

.state-block,
.empty-row {
  padding: 24px;
  color: var(--color-text-3);
}

.state-block--error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border-1);
  vertical-align: middle;
  text-align: left;
}

.data-table tbody tr:hover td {
  background-color: var(--color-bg-overlay-hover);
}

.data-table th {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  background: var(--color-bg-2);
}

.cell-stack {
  display: grid;
  gap: 6px;
}

.status-cell {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  background: var(--color-bg-2);
}

.status-pill[data-tone="success"] {
  color: #fff;
  background: var(--color-success-text);
}

.status-pill[data-tone="warning"] {
  color: #fff;
  background: #9a3412;
}

.status-pill[data-tone="danger"] {
  color: #fff;
  background: var(--color-danger-text);
}

.status-pill[data-tone="info"] {
  color: #fff;
  background: #1d4ed8;
}

.status-pill[data-tone="muted"] {
  color: var(--color-text-3);
  background: var(--color-bg-2);
}

.overdue-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-danger-text);
  background: #fee2e2;
  border: 1px solid #fecaca;
  letter-spacing: 0.02em;
}

.task-row--overdue td:first-child {
  box-shadow: inset 3px 0 0 0 var(--color-danger-text);
}

@media (max-width: 767px) {
  .state-block--error {
    align-items: flex-start;
    flex-direction: column;
  }

  .data-table {
    display: block;
    overflow-x: auto;
  }

  .tasks-view :deep(.ui-page-header__actions) {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
