/**
 * 仪表盘查询范围。
 */
export type DashboardScope = "mine" | "group" | "all";
/**
 * 仪表盘时间窗口。
 */
export type DashboardTimeWindow = 7 | 30;
/**
 * 仪表盘状态标签色调。
 */
export type DashboardStatusTone = "info" | "warn" | "danger" | "muted";

/**
 * 前端工作面板 meta 条目的 i18n key 结构。
 */
export type DashboardMetaKey = {
  key: string;
  params?: Record<string, string | number>;
};

/**
 * 前端工作面板通用项结构。
 */
export type DashboardWorkItem = {
  id: string;
  title: string;
  meta: string[];
  desc: string;
  status: DashboardStatusTone;
  statusLabel: string;
  action: string;
  route?: string;
  daysLeft?: number;
  statusLabelKey?: string;
  statusLabelParams?: Record<string, string | number>;
  descKey?: string;
  descParams?: Record<string, string | number>;
  actionKey?: string;
  metaKeys?: DashboardMetaKey[];
};

/**
 * 仪表盘查询输入。
 */
export type DashboardSummaryInput = {
  scope: DashboardScope;
  timeWindow: DashboardTimeWindow;
  groupId?: string;
  limit?: number;
};

/**
 * 仪表盘接口返回结构。
 */
export type DashboardSummary = {
  scope: DashboardScope;
  timeWindow: DashboardTimeWindow;
  effectiveGroupId?: string;
  summary: {
    todayTasks: number;
    upcomingCases: number;
    pendingSubmissions: number;
    riskCases: number;
  };
  panels: {
    todo: DashboardWorkItem[];
    deadlines: DashboardWorkItem[];
    submissions: DashboardWorkItem[];
    risks: DashboardWorkItem[];
  };
};

/**
 * 仪表盘 group 下拉选项。
 */
export type DashboardGroupOption = {
  id: string;
  name: string;
  isPrimary: boolean;
  isMember: boolean;
};

/**
 * 计数查询结果行。
 */
export type CountRow = { count: string | number };
/**
 * 待办面板原始查询行。
 *
 * `due_at` 类型同时接受 `string` 与 `Date`：`pg` 驱动默认把
 * `timestamp with time zone` 列解析为 JS `Date`（OID 1184 parser），
 * 而 mock/SQL `to_char` 等场景仍可能给到 ISO 字符串。
 */
export type TodoRow = {
  id: string;
  title: string;
  case_id: string | null;
  case_no: string | null;
  case_name: string | null;
  assignee_name: string | null;
  due_at: string | Date | null;
  priority: string;
  status: string;
};
/**
 * 截止日期面板原始查询行。
 */
export type DeadlineRow = {
  id: string;
  case_no: string | null;
  case_name: string | null;
  owner_name: string | null;
  due_at: string | Date;
  status: string;
  days_left: number | string;
};
/**
 * 待提交面板原始查询行。
 */
export type SubmissionRow = {
  id: string;
  case_no: string | null;
  case_name: string | null;
  owner_name: string | null;
  due_at: string | Date | null;
  validation_status: string | null;
  review_decision: string | null;
};
/**
 * 风险面板原始查询行。
 */
export type RiskRow = {
  id: string;
  case_no: string | null;
  case_name: string | null;
  owner_name: string | null;
  due_at: string | Date | null;
  risk_level: string;
  validation_status: string | null;
  unpaid_amount: string | number;
};

/**
 * manager / owner は管理者ロールとみなす。
 *
 * @param role ユーザーロール文字列。
 * @returns manager または owner の場合 true。
 */
export function isManagerRole(role: string): boolean {
  return role === "manager" || role === "owner";
}

/**
 * 向 SQL 参数数组追加一个参数并返回其占位符。
 *
 * @param params SQL 参数数组。
 * @param value 待追加的参数值。
 * @returns PostgreSQL 占位符字符串。
 */
export function pushParam(params: unknown[], value: unknown): string {
  params.push(value);
  return `$${String(params.length)}`;
}

/**
 * 生成 group 过滤的 SQL 片段。
 *
 * `scope=group` 时用 `groupId` 限定 `cases.group_id`；其他 scope 返回空。
 *
 * @param scope 当前查询范围。
 * @param groupId 当前选中 group ID（仅 scope=group 时有效）。
 * @param params SQL 参数数组。
 * @param alias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildGroupClause(
  scope: DashboardScope,
  groupId: string | undefined,
  params: unknown[],
  alias = "c",
): string {
  if (scope !== "group" || !groupId) return "";
  const ph = pushParam(params, groupId);
  return `and ${alias}.group_id = ${ph}`;
}

/**
 * 生成案件相关查询的范围过滤片段。
 *
 * @param scope 当前查询范围。
 * @param userId 当前登录用户 ID。
 * @param params SQL 参数数组。
 * @param alias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildCaseScopeClause(
  scope: DashboardScope,
  userId: string,
  params: unknown[],
  alias = "c",
): string {
  if (scope !== "mine") return "";
  const userParam = pushParam(params, userId);
  return `and (${alias}.owner_user_id = ${userParam} or ${alias}.assistant_user_id = ${userParam})`;
}

/**
 * 生成任务相关查询的范围过滤片段。
 *
 * @param scope 当前查询范围。
 * @param userId 当前登录用户 ID。
 * @param params SQL 参数数组。
 * @param taskAlias 任务表别名。
 * @param caseAlias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildTaskScopeClause(
  scope: DashboardScope,
  userId: string,
  params: unknown[],
  taskAlias = "t",
  caseAlias = "c",
): string {
  if (scope !== "mine") return "";
  const userParam = pushParam(params, userId);
  return `and (
    ${taskAlias}.assignee_user_id = ${userParam}
    or ${caseAlias}.owner_user_id = ${userParam}
    or ${caseAlias}.assistant_user_id = ${userParam}
  )`;
}

/**
 * 从聚合查询结果中读取数字计数。
 *
 * @param rows 数据库返回的计数行。
 * @returns 规范化后的数字计数。
 */
export function readCount(rows: CountRow[]): number {
  const raw = rows[0]?.count ?? 0;
  const count = Number(raw);
  return Number.isFinite(count) ? count : 0;
}
