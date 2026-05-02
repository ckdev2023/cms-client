<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../shared/ui/Button.vue";
import Card from "../../shared/ui/Card.vue";
import PageHeader from "../../shared/ui/PageHeader.vue";
import { createTaskRepository } from "./model/TaskRepository";
import {
  canComplete,
  formatDateTime,
  formatUpdatedAt,
  priorityLabel,
  reminderMeta,
  reminderRowTone,
  reminderShortId,
  reminderStatusLabel,
  reminderTitle,
  taskRowTone,
  taskStatusLabel,
} from "./model/taskWorkbenchViewHelpers";
import { residenceLabelToCode } from "./model/residenceLabelToTypeCode";
import { getCaseTypeI18nKey } from "../cases/constants";
import { useTaskWorkbenchModel } from "./model/useTaskWorkbenchModel";
import type { TaskWorkbenchView } from "./types";

/**
 * 任务与提醒工作台页面，集中展示待办任务、逾期任务与提醒日志。
 */
const { t, locale } = useI18n();

const model = useTaskWorkbenchModel({
  repo: createTaskRepository(),
});

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
  const total = isReminders ? model.reminderTotal.value : model.taskTotal.value;
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

    <div class="content-grid">
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
              <tr
                v-for="reminder in model.reminderLog.value"
                :key="reminder.id"
              >
                <td>
                  <div class="cell-stack">
                    <strong>{{
                      reminderTitle(reminder, t, resolveVisaLabel)
                    }}</strong>
                    <small class="cell-id-hint" :title="reminder.id">
                      #{{ reminderShortId(reminder) }}
                    </small>
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
              <tr v-for="task in model.currentTasks.value" :key="task.id">
                <td>
                  <div class="cell-stack">
                    <strong>{{ task.title }}</strong>
                    <span class="cell-meta">{{
                      task.description || task.taskType
                    }}</span>
                  </div>
                </td>
                <td>
                  <div class="cell-stack">
                    <span>{{
                      task.caseId || t("tasks.workbench.placeholder")
                    }}</span>
                    <span class="cell-meta">{{
                      task.assigneeUserId ||
                      t("tasks.workbench.taskTable.unassigned")
                    }}</span>
                  </div>
                </td>
                <td>{{ formatDateTime(task.dueAt, locale) }}</td>
                <td>
                  <span class="status-pill" :data-tone="taskRowTone(task)">
                    {{ taskStatusLabel(task.status, t) }}
                  </span>
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

      <Card
        :title="t('tasks.workbench.aside.title')"
        padding="md"
        class="panel-card"
      >
        <div class="aside-stack">
          <p class="aside-copy">{{ t("tasks.workbench.aside.copy") }}</p>
          <ul class="aside-list">
            <li>{{ t("tasks.workbench.aside.list.item1") }}</li>
            <li>{{ t("tasks.workbench.aside.list.item2") }}</li>
            <li>{{ t("tasks.workbench.aside.list.item3") }}</li>
          </ul>
          <p class="aside-meta">
            {{ formatUpdatedAt(model.lastUpdatedAt.value, locale, t) }}
          </p>
        </div>
      </Card>
    </div>
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
.cell-meta,
.aside-meta {
  color: var(--color-text-3);
}

.summary-card__title {
  font-size: var(--font-size-sm);
}

.summary-card__value {
  font-size: var(--font-size-3xl);
  color: var(--color-text-1);
}

.summary-card__hint,
.aside-copy,
.aside-list,
.aside-meta {
  margin: 0;
  line-height: var(--leading-relaxed);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
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

.cell-stack,
.aside-stack {
  display: grid;
  gap: 6px;
}

.cell-id-hint {
  font-family: var(--font-family-mono, monospace);
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  letter-spacing: 0.04em;
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
  background: #166534;
}

.status-pill[data-tone="warning"] {
  color: #fff;
  background: #9a3412;
}

.status-pill[data-tone="danger"] {
  color: #fff;
  background: #991b1b;
}

.aside-list {
  padding-left: 20px;
}

@media (max-width: 1080px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .state-block--error {
    align-items: flex-start;
    flex-direction: column;
  }

  .data-table {
    display: block;
    overflow-x: auto;
  }
}
</style>
