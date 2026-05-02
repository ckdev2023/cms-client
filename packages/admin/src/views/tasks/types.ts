/**
 *
 */
export interface TaskRecord {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string | null;
  /**
   *
   */
  title: string;
  /**
   *
   */
  description: string | null;
  /**
   *
   */
  taskType: string;
  /**
   *
   */
  assigneeUserId: string | null;
  /**
   *
   */
  priority: string;
  /**
   *
   */
  dueAt: string | null;
  /**
   *
   */
  status: string;
  /**
   *
   */
  sourceType: string | null;
  /**
   *
   */
  sourceId: string | null;
  /**
   *
   */
  completedAt: string | null;
  /**
   * 服务端 join `cases.case_no` 解析出的案件编号，缺失时为 `null`。
   */
  caseNo: string | null;
  /**
   * 服务端 join `cases.case_name` 解析出的案件名称，缺失时为 `null`。
   */
  caseName: string | null;
  /**
   * 服务端 join `users.name` 解析出的担当者显示名，缺失时为 `null`。
   */
  assigneeName: string | null;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  updatedAt: string;
}

/**
 *
 */
export interface ReminderRecord {
  /**
   *
   */
  id: string;
  /**
   *
   */
  caseId: string | null;
  /**
   * 服务端 join `cases.case_no` 解析出的案件编号，缺失时为 `null`（BUG-163）。
   */
  caseNo: string | null;
  /**
   *
   */
  targetType: string;
  /**
   *
   */
  targetId: string;
  /**
   *
   */
  remindAt: string;
  /**
   *
   */
  recipientType: string;
  /**
   *
   */
  recipientId: string | null;
  /**
   * 服务端 join `users.name` 解析出的接收人显示名，缺失时为 `null`（BUG-163）。
   */
  recipientName: string | null;
  /**
   *
   */
  channel: string;
  /**
   *
   */
  dedupeKey: string | null;
  /**
   *
   */
  sendStatus: string;
  /**
   *
   */
  retryCount: number;
  /**
   *
   */
  sentAt: string | null;
  /**
   *
   */
  payloadSnapshot: Record<string, unknown> | null;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  updatedAt: string;
}

/**
 *
 */
export interface ListResult<T> {
  /**
   *
   */
  items: T[];
  /**
   *
   */
  total: number;
}

/**
 *
 */
export interface TaskListParams {
  /**
   *
   */
  status?: string;
  /**
   *
   */
  page?: number;
  /**
   *
   */
  limit?: number;
}

/**
 *
 */
export interface ReminderListParams {
  /**
   *
   */
  sendStatus?: string;
  /**
   *
   */
  page?: number;
  /**
   *
   */
  limit?: number;
}

/**
 *
 */
export type TaskWorkbenchView = "pending" | "today" | "overdue" | "reminders";
