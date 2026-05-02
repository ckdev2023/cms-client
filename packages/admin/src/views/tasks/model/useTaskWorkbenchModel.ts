import { computed, ref } from "vue";
import type { ReminderRecord, TaskRecord, TaskWorkbenchView } from "../types";
import type { TaskRepository } from "./TaskRepository";

const ACTIVE_TASK_STATUSES = new Set(["pending", "in_progress"]);

function toTimestamp(value: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function startOfDay(date: Date): number {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

function sortTasks(items: TaskRecord[]): TaskRecord[] {
  return [...items].sort((left, right) => {
    const leftDue = toTimestamp(left.dueAt) ?? Number.MAX_SAFE_INTEGER;
    const rightDue = toTimestamp(right.dueAt) ?? Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return (
      (toTimestamp(right.createdAt) ?? 0) - (toTimestamp(left.createdAt) ?? 0)
    );
  });
}

function sortReminders(items: ReminderRecord[]): ReminderRecord[] {
  return [...items].sort((left, right) => {
    const leftAt = toTimestamp(left.remindAt) ?? Number.MAX_SAFE_INTEGER;
    const rightAt = toTimestamp(right.remindAt) ?? Number.MAX_SAFE_INTEGER;
    if (leftAt !== rightAt) return leftAt - rightAt;

    return (
      (toTimestamp(right.createdAt) ?? 0) - (toTimestamp(left.createdAt) ?? 0)
    );
  });
}

function isDueToday(task: TaskRecord, dayStart: number): boolean {
  const dueAt = toTimestamp(task.dueAt);
  if (dueAt === null || !ACTIVE_TASK_STATUSES.has(task.status)) return false;
  return dueAt >= dayStart && dueAt < dayStart + 86_400_000;
}

function isOverdue(task: TaskRecord, dayStart: number): boolean {
  const dueAt = toTimestamp(task.dueAt);
  return (
    dueAt !== null && ACTIVE_TASK_STATUSES.has(task.status) && dueAt < dayStart
  );
}

/**
 * 任务工作台完成任务时通过 notifier 透传给视图层的事件载荷。
 */
export interface TaskWorkbenchCompleteEvent {
  /** 事件类型：`success` 表示已完成、`error` 表示完成失败。 */
  kind: "success" | "error";
  /** 触发事件的任务 id。 */
  taskId: string;
  /** 服务端返回的最新任务（成功时存在）。 */
  task?: TaskRecord;
}

/**
 * 任务工作台模型的外部依赖。
 */
export interface TaskWorkbenchModelDeps {
  /** 负责读取与更新任务数据的仓储。 */
  repo: TaskRepository;
  /** 当前时间提供器，便于测试中固定时间。 */
  now?: () => Date;
  /**
   * 任务完成动作的反馈通知器，由视图层注入（默认空函数）。
   * 用于驱动 toast / 埋点等副作用，model 自身保持纯净。
   */
  notifyComplete?: (event: TaskWorkbenchCompleteEvent) => void;
}

function createTaskWorkbenchState() {
  return {
    tasks: ref<TaskRecord[]>([]),
    reminders: ref<ReminderRecord[]>([]),
    loading: ref(false),
    error: ref<string | null>(null),
    completingId: ref<string | null>(null),
    lastCompletedTask: ref<TaskRecord | null>(null),
    activeView: ref<TaskWorkbenchView>("pending"),
    taskTotal: ref(0),
    reminderTotal: ref(0),
    lastUpdatedAt: ref<string | null>(null),
  };
}

type TaskWorkbenchState = ReturnType<typeof createTaskWorkbenchState>;

function createTaskWorkbenchCollections(
  state: TaskWorkbenchState,
  now: () => Date,
) {
  const dayStart = computed(() => startOfDay(now()));
  const openTasks = computed(() =>
    sortTasks(
      state.tasks.value.filter((task) => ACTIVE_TASK_STATUSES.has(task.status)),
    ),
  );
  const todayTasks = computed(() =>
    openTasks.value.filter((task) => isDueToday(task, dayStart.value)),
  );
  const overdueTasks = computed(() =>
    openTasks.value.filter((task) => isOverdue(task, dayStart.value)),
  );
  const reminderLog = computed(() => sortReminders(state.reminders.value));
  const currentTasks = computed(() => {
    if (state.activeView.value === "today") return todayTasks.value;
    if (state.activeView.value === "overdue") return overdueTasks.value;
    return openTasks.value;
  });
  const counts = computed(() => ({
    pending: openTasks.value.length,
    today: todayTasks.value.length,
    overdue: overdueTasks.value.length,
    reminders: reminderLog.value.length,
  }));
  const panelTotal = computed(() => counts.value[state.activeView.value]);

  return { counts, currentTasks, reminderLog, panelTotal };
}

function createFetchWorkbench(
  state: TaskWorkbenchState,
  repo: TaskRepository,
  now: () => Date,
) {
  return async (): Promise<void> => {
    state.loading.value = true;
    state.error.value = null;

    try {
      const [taskResult, reminderResult] = await Promise.all([
        repo.listTasks({ limit: 200 }),
        repo.listReminders({ limit: 200 }),
      ]);

      state.tasks.value = sortTasks(taskResult.items);
      state.reminders.value = sortReminders(reminderResult.items);
      state.taskTotal.value = taskResult.total;
      state.reminderTotal.value = reminderResult.total;
      state.lastUpdatedAt.value = now().toISOString();
    } catch {
      state.error.value = "任务与提醒加载失败，请稍后重试。";
    } finally {
      state.loading.value = false;
    }
  };
}

function createCompleteTask(
  state: TaskWorkbenchState,
  repo: TaskRepository,
  now: () => Date,
  notifyComplete: (event: TaskWorkbenchCompleteEvent) => void,
) {
  return async (id: string): Promise<void> => {
    const trimmedId = id.trim();
    if (!trimmedId || state.completingId.value) return;

    state.completingId.value = trimmedId;
    state.error.value = null;
    try {
      const updated = await repo.completeTask(trimmedId);
      state.tasks.value = sortTasks(
        state.tasks.value.map((task) =>
          task.id === trimmedId ? updated : task,
        ),
      );
      state.lastCompletedTask.value = updated;
      state.lastUpdatedAt.value = now().toISOString();
      notifyComplete({ kind: "success", taskId: trimmedId, task: updated });
    } catch {
      state.error.value = "任务完成操作失败，请稍后重试。";
      notifyComplete({ kind: "error", taskId: trimmedId });
    } finally {
      state.completingId.value = null;
    }
  };
}

/**
 * 创建任务与提醒工作台的视图模型。
 *
 * @param deps - 工作台所需的仓储、时间与通知器依赖。
 * @returns 暴露给页面使用的状态、派生数据和交互方法。
 */
export function useTaskWorkbenchModel(deps: TaskWorkbenchModelDeps) {
  const { repo, now = () => new Date(), notifyComplete = () => {} } = deps;
  const state = createTaskWorkbenchState();
  const collections = createTaskWorkbenchCollections(state, now);
  const fetchWorkbench = createFetchWorkbench(state, repo, now);
  const completeTask = createCompleteTask(state, repo, now, notifyComplete);
  const setActiveView = (view: TaskWorkbenchView): void => {
    state.activeView.value = view;
  };

  return {
    ...state,
    ...collections,
    fetchWorkbench,
    completeTask,
    setActiveView,
  };
}
