import type {
  ListResult,
  ReminderListParams,
  ReminderRecord,
  TaskListParams,
  TaskRecord,
} from "../types";
import {
  createRuntime,
  requestAndAdapt,
  TaskRepositoryError,
  type TaskRepositoryFactoryInput,
  type TaskRepositoryRuntime,
} from "./TaskRepositorySupport";

/**
 * 任务与提醒工作台依赖的仓储接口。
 */
export interface TaskRepository {
  /** 读取任务列表。 */
  listTasks(params?: TaskListParams): Promise<ListResult<TaskRecord>>;
  /** 读取提醒日志列表。 */
  listReminders(
    params?: ReminderListParams,
  ): Promise<ListResult<ReminderRecord>>;
  /** 将指定任务标记为已完成。 */
  completeTask(id: string): Promise<TaskRecord>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function readNullableString(
  record: Record<string, unknown>,
  key: string,
): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function readNullableObject(
  record: Record<string, unknown>,
  key: string,
): Record<string, unknown> | null {
  return asRecord(record[key]);
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function adaptTask(value: unknown): TaskRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  const title = readString(record, "title");
  if (!id || !title) return null;

  return {
    id,
    caseId: readNullableString(record, "caseId"),
    title,
    description: readNullableString(record, "description"),
    taskType: readString(record, "taskType") || "general",
    assigneeUserId: readNullableString(record, "assigneeUserId"),
    priority: readString(record, "priority") || "normal",
    dueAt: readNullableString(record, "dueAt"),
    status: readString(record, "status") || "pending",
    sourceType: readNullableString(record, "sourceType"),
    sourceId: readNullableString(record, "sourceId"),
    completedAt: readNullableString(record, "completedAt"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function adaptReminder(value: unknown): ReminderRecord | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = readString(record, "id");
  const remindAt = readString(record, "remindAt");
  if (!id || !remindAt) return null;

  return {
    id,
    caseId: readNullableString(record, "caseId"),
    caseNo: readNullableString(record, "caseNo"),
    targetType: readString(record, "targetType") || "case",
    targetId: readString(record, "targetId"),
    remindAt,
    recipientType: readString(record, "recipientType") || "user",
    recipientId: readNullableString(record, "recipientId"),
    recipientName: readNullableString(record, "recipientName"),
    channel: readString(record, "channel") || "in_app",
    dedupeKey: readNullableString(record, "dedupeKey"),
    sendStatus: readString(record, "sendStatus") || "pending",
    retryCount: readNumber(record, "retryCount"),
    sentAt: readNullableString(record, "sentAt"),
    payloadSnapshot: readNullableObject(record, "payloadSnapshot"),
    createdAt: readString(record, "createdAt"),
    updatedAt: readString(record, "updatedAt"),
  };
}

function adaptListResult<T>(
  value: unknown,
  adaptItem: (item: unknown) => T | null,
): ListResult<T> | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.items)) return null;

  return {
    items: record.items
      .map(adaptItem)
      .filter((item): item is T => item !== null),
    total: readNumber(record, "total"),
  };
}

function buildListUrl(
  basePath: string,
  params: TaskListParams | ReminderListParams = {},
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `${basePath}?${query}` : basePath;
}

function createListTasks(runtime: TaskRepositoryRuntime) {
  return async (params: TaskListParams = {}) =>
    requestAndAdapt({
      runtime,
      url: buildListUrl(runtime.apiPath, params),
      method: "GET",
      adapt: (value) => adaptListResult(value, adaptTask),
      errorMessage: "Invalid tasks response",
    });
}

function createListReminders(runtime: TaskRepositoryRuntime) {
  return async (params: ReminderListParams = {}) =>
    requestAndAdapt({
      runtime,
      url: buildListUrl(runtime.remindersApiPath, params),
      method: "GET",
      adapt: (value) => adaptListResult(value, adaptReminder),
      errorMessage: "Invalid reminders response",
    });
}

function createCompleteTask(runtime: TaskRepositoryRuntime) {
  return async (id: string) => {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new TaskRepositoryError({
        code: "VALIDATION_ERROR",
        errorName: "TaskRepositoryError",
        message: "Task id is required",
      });
    }

    return requestAndAdapt({
      runtime,
      url: `${runtime.apiPath}/${encodeURIComponent(normalizedId)}/complete`,
      method: "POST",
      adapt: adaptTask,
      errorMessage: "Invalid task completion response",
    });
  };
}

/**
 * 创建任务工作台使用的仓储实例。
 *
 * @param input - 仓储初始化配置，可注入请求函数、认证令牌与接口路径。
 * @returns 提供任务列表、提醒列表和完成任务操作的仓储对象。
 */
export function createTaskRepository(
  input: TaskRepositoryFactoryInput = {},
): TaskRepository {
  const runtime = createRuntime(input);

  return {
    listTasks: createListTasks(runtime),
    listReminders: createListReminders(runtime),
    completeTask: createCompleteTask(runtime),
  };
}
