/**
 * 任务写入请求体构造器 — UI 表单输入 → server `POST /tasks` 请求体。
 */

/**
 * 任务创建的 UI 输入。
 */
export interface TaskCreateInput {
  /** 标题（必填，会执行 trim 校验）。 */
  title: string;
  /** 关联案件 ID（可选）。 */
  caseId?: string;
  /** 描述。 */
  description?: string;
  /** 任务类型。 */
  taskType?: string;
  /** 负责人。 */
  assigneeUserId?: string;
  /** 优先级。 */
  priority?: string;
  /** 截止时间（ISO）。 */
  dueAt?: string;
}

/**
 * server `POST /tasks` 请求体形态——可选字段按需 omit。
 */
export interface TaskCreatePayload {
  /**
   *
   */
  title: string;
  /**
   *
   */
  caseId?: string;
  /**
   *
   */
  description?: string;
  /**
   *
   */
  taskType?: string;
  /**
   *
   */
  assigneeUserId?: string;
  /**
   *
   */
  priority?: string;
  /**
   *
   */
  dueAt?: string;
}

function appendIfDefined<K extends keyof TaskCreatePayload>(
  target: TaskCreatePayload,
  key: K,
  value: TaskCreatePayload[K] | null | undefined,
): void {
  if (value === undefined || value === null || value === "") return;
  target[key] = value;
}

/**
 * 将 UI 创建任务输入转换为 server 请求体；可选字段缺省时不下发。
 *
 * @param input - UI 收集的任务字段
 * @returns 适合直接 JSON 序列化的请求体
 */
export function buildCreateTaskPayload(
  input: TaskCreateInput,
): TaskCreatePayload {
  const payload: TaskCreatePayload = { title: input.title.trim() };
  appendIfDefined(payload, "caseId", input.caseId);
  appendIfDefined(payload, "description", input.description);
  appendIfDefined(payload, "taskType", input.taskType);
  appendIfDefined(payload, "assigneeUserId", input.assigneeUserId);
  appendIfDefined(payload, "priority", input.priority);
  appendIfDefined(payload, "dueAt", input.dueAt);
  return payload;
}
