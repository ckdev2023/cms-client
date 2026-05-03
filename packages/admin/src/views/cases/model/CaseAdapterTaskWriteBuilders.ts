/**
 * 任务写入请求体构造器 — UI 任务创建表单 → server POST /tasks 请求体。
 */

/** UI 层任务优先级选项。 */
export type TaskPriorityChoice = "low" | "normal" | "high" | "urgent";

/**
 * 创建任务的 UI 层输入。
 */
export interface TaskCreateInput {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  title: string;
  /**
   *
   */
  description?: string;
  /**
   *
   */
  priority: TaskPriorityChoice;
  /**
   *
   */
  dueAt?: string;
  /**
   *
   */
  assigneeUserId?: string;
}

interface TaskPayload {
  caseId: string;
  title: string;
  description?: string;
  priority: string;
  dueAt?: string;
  assigneeUserId?: string;
}

/**
 * 将 UI 层任务创建输入转换为 server `POST /tasks` 请求体。
 *
 * @param input - UI 层收集的创建参数
 * @returns 符合 server CreateTaskBody 的请求体
 */
export function buildCreateTaskPayload(input: TaskCreateInput): TaskPayload {
  return {
    caseId: input.caseId,
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    priority: input.priority,
    ...(input.dueAt ? { dueAt: input.dueAt } : {}),
    ...(input.assigneeUserId ? { assigneeUserId: input.assigneeUserId } : {}),
  };
}

/**
 * 构建 tasks POST URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @returns POST URL，如 `/api/tasks`
 */
export function buildTasksPostUrl(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "") + "/tasks";
}
