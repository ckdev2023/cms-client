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
