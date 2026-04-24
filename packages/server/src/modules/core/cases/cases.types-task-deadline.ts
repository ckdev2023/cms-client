// ────────────────────────────────────────────────────────────────
// Task / Deadline / Reminder 案件视角读模型 — 冻结契约
//
// 案件详情 tasks tab 消费 tasks 列表端点（caseId 过滤）；
// 案件详情 deadlines tab 消费：
//   1. Case 本体期限字段派生的 deadline 列表（聚合 DTO 内联）
//   2. reminders 列表端点（caseId 过滤）
//
// P0 边界：CaseDeadline 表尚未落地，deadline 由 Case 本体
// 日期字段（due_at / residence_expiry_date / submission_date /
// result_date）派生为只读视图。P1 落地 case_deadlines 表后，
// 此处追加 `CaseDeadlineEntityDto` 并保持向后兼容。
//
// 以下类型描述 admin adapter 消费的 DTO 形状，
// 与现有 REST 端点的返回值一一对应。
// ────────────────────────────────────────────────────────────────

// ─── Tasks ──────────────────────────────────────────────────────

/**
 * 案件视角任务列表查询参数。
 *
 * 映射端点：`GET /api/tasks?caseId=:caseId`
 */
export type CaseTaskListInput = {
  caseId: string;
  status?: string;
  assigneeUserId?: string;
  page?: number;
  limit?: number;
};

/**
 * 案件视角任务 DTO — 在 `Task` 核心实体基础上追加 assignee 展示名。
 *
 * admin adapter 消费此结构映射为 `TaskItem`。
 * 字段语义：
 * - `taskType`：general | document_follow_up | client_contact | submission | review
 * - `priority`：low | normal | high | urgent
 * - `status`：pending | in_progress | completed | cancelled
 * - `sourceType`：template | requirement | validation | submission | reminder | manual
 */
export type CaseTaskDto = {
  id: string;
  caseId: string | null;
  title: string;
  description: string | null;
  taskType: string;
  assigneeUserId: string | null;
  assigneeDisplayName: string | null;
  priority: string;
  dueAt: string | null;
  status: string;
  sourceType: string | null;
  sourceId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * 案件视角任务列表响应。
 */
export type CaseTaskListResult = {
  items: CaseTaskDto[];
  total: number;
};

// ─── Deadlines ──────────────────────────────────────────────────

/**
 * P0 期限类型枚举 — 对齐 P0 数据模型 §3.13。
 *
 * P0 仅使用前四项；P1 追加 `coe_expiry` / `entry_deadline`。
 */
export type CaseDeadlineType =
  | "residence_expiry"
  | "supplement_due"
  | "submission_due"
  | "result_expected";

/**
 * 期限紧急度 — admin 着色依据。
 *
 * 规则（P0-CONTRACT-DETAIL §10）：
 * - `danger`：≤ 7 天或已过期 → 红色
 * - `warning`：8–30 天 → 黄色
 * - `normal`：> 30 天或无日期 → 灰色
 */
export type CaseDeadlineSeverity = "danger" | "warning" | "normal";

/**
 * 案件视角期限 DTO — P0 由 Case 本体日期字段派生。
 *
 * admin adapter 消费此结构映射为 `DeadlineItem`。
 *
 * P0 期限-字段映射：
 * - `residence_expiry` → `Case.residenceExpiryDate`
 * - `supplement_due`   → `Case.dueAt`（补件截止复用案件到期日）
 * - `submission_due`   → `Case.submissionDate`
 * - `result_expected`  → `Case.resultDate`
 *
 * P1 落地 `case_deadlines` 表后，此 DTO 扩展 `sourceType` / `sourceId` /
 * `note` 字段并保持向后兼容。
 */
export type CaseDeadlineDto = {
  deadlineType: CaseDeadlineType;
  label: string;
  dueAt: string | null;
  remainingDays: number | null;
  severity: CaseDeadlineSeverity;
};

/**
 * 案件视角期限列表响应 — 内联于 detail aggregate 或独立端点。
 *
 * P0 固定返回 4 项（residence_expiry / supplement_due /
 * submission_due / result_expected），dueAt 为 null 表示未设定。
 */
export type CaseDeadlineListResult = {
  items: CaseDeadlineDto[];
};

// ─── Reminders ──────────────────────────────────────────────────

/**
 * 案件视角提醒列表查询参数。
 *
 * 映射端点：`GET /api/reminders?caseId=:caseId`
 */
export type CaseReminderListInput = {
  caseId: string;
  sendStatus?: string;
  targetType?: string;
  page?: number;
  limit?: number;
};

/**
 * 案件视角提醒 DTO — 与 `Reminder` 核心实体同构。
 *
 * admin adapter 消费此结构在 deadlines tab 展示提醒计划。
 * 字段语义：
 * - `targetType`：case | customer | requirement | deadline | billing_plan
 * - `sendStatus`：pending | sent | failed | canceled
 * - `channel`：in_app（P0 仅站内提醒）
 */
export type CaseReminderDto = {
  id: string;
  caseId: string | null;
  targetType: string;
  targetId: string;
  remindAt: string;
  recipientType: string;
  recipientId: string | null;
  channel: string;
  dedupeKey: string | null;
  sendStatus: string;
  retryCount: number;
  sentAt: string | null;
  payloadSnapshot: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * 案件视角提醒列表响应。
 */
export type CaseReminderListResult = {
  items: CaseReminderDto[];
  total: number;
};

// ─── Deadline 计算工具类型 ─────────────────────────────────────

/**
 * 从 Case 本体日期字段派生 deadlines 的输入 — server 端聚合用。
 *
 * 仅取 `CaseDeadlineDto` 计算所需的最小字段集，
 * 避免传递完整 Case 实体。
 */
export type CaseDeadlineSourceFields = {
  dueAt: string | null;
  residenceExpiryDate: string | null;
  submissionDate: string | null;
  resultDate: string | null;
};
