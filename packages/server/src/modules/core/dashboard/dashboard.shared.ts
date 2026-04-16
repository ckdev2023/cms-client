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
};

/**
 * 仪表盘接口返回结构。
 */
export type DashboardSummary = {
  scope: DashboardScope;
  timeWindow: DashboardTimeWindow;
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
 * 计数查询结果行。
 */
export type CountRow = { count: string | number };
/**
 * 待办面板原始查询行。
 */
export type TodoRow = {
  id: string;
  title: string;
  case_id: string | null;
  case_no: string | null;
  case_name: string | null;
  assignee_name: string | null;
  due_at: string | null;
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
  due_at: string;
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
  due_at: string | null;
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
  due_at: string | null;
  risk_level: string;
  validation_status: string | null;
  unpaid_amount: string | number;
};

/**
 * 将暂未细分实现的 `group` 范围归一到当前可执行查询范围。
 *
 * @param scope 前端请求的仪表盘范围。
 * @returns 可直接用于 SQL 过滤的范围值。
 */
export function normalizeScope(
  scope: DashboardScope,
): Exclude<DashboardScope, "group"> {
  return scope === "group" ? "all" : scope;
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
 * 生成案件相关查询的范围过滤片段。
 *
 * @param scope 当前查询范围。
 * @param userId 当前登录用户 ID。
 * @param params SQL 参数数组。
 * @param alias 案件表别名。
 * @returns 可拼接到 `where` 子句中的 SQL 片段。
 */
export function buildCaseScopeClause(
  scope: Exclude<DashboardScope, "group">,
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
  scope: Exclude<DashboardScope, "group">,
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

function formatDaysLeftLabel(daysLeft: number): string {
  return daysLeft <= 0 ? "已到期" : `剩余 ${String(daysLeft)} 天`;
}

function formatDateLabel(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function formatMoneyLabel(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "¥0";
  return `¥${new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount)}`;
}

function compact(values: (string | undefined)[]): string[] {
  return values.filter((value): value is string => Boolean(value));
}

function caseTitle(input: {
  case_name: string | null;
  case_no: string | null;
  id: string;
}): string {
  return input.case_name ?? input.case_no ?? input.id;
}

function caseMetaLabel(input: {
  case_name: string | null;
  case_no: string | null;
}): string | undefined {
  const label = input.case_name ?? input.case_no;
  return label ? `案件：${label}` : undefined;
}

function ownerMetaLabel(
  ownerName: string | null | undefined,
): string | undefined {
  return ownerName ? `负责人：${ownerName}` : undefined;
}

function dueMetaLabel(dueAt: string | null | undefined): string | undefined {
  const label = formatDateLabel(dueAt);
  return label ? `期限：${label}` : undefined;
}

/**
 * 将待办查询结果映射为前端工作项。
 *
 * @param row 待办面板原始数据行。
 * @returns 供前端渲染的待办工作项。
 */
export function mapTodoItem(row: TodoRow): DashboardWorkItem {
  const tone: DashboardStatusTone =
    row.priority === "high"
      ? "danger"
      : row.due_at
        ? "warn"
        : row.priority === "low"
          ? "muted"
          : "info";

  return {
    id: row.id,
    title: row.title,
    meta: compact([
      caseMetaLabel(row),
      row.assignee_name ? `执行人：${row.assignee_name}` : undefined,
      dueMetaLabel(row.due_at),
    ]),
    desc: `状态：${row.status} · 优先级：${row.priority}`,
    status: tone,
    statusLabel:
      tone === "danger"
        ? "高优先"
        : tone === "warn"
          ? "待跟进"
          : tone === "muted"
            ? "已排期"
            : "进行中",
    action: row.case_id ? "查看案件" : "查看任务",
    route: row.case_id ? `/cases/${row.case_id}` : "/tasks",
  };
}

/**
 * 将截止日期查询结果映射为前端工作项。
 *
 * @param row 截止日期面板原始数据行。
 * @returns 供前端渲染的截止日期工作项。
 */
export function mapDeadlineItem(row: DeadlineRow): DashboardWorkItem {
  const daysLeft = Number(row.days_left);
  const tone: DashboardStatusTone =
    daysLeft <= 3 ? "danger" : daysLeft <= 7 ? "warn" : "muted";

  return {
    id: row.id,
    title: caseTitle(row),
    meta: compact([ownerMetaLabel(row.owner_name), dueMetaLabel(row.due_at)]),
    desc: `当前阶段：${row.status}`,
    status: tone,
    statusLabel: formatDaysLeftLabel(daysLeft),
    action: "查看案件",
    route: `/cases/${row.id}`,
    daysLeft,
  };
}

/**
 * 将待提交查询结果映射为前端工作项。
 *
 * @param row 待提交面板原始数据行。
 * @returns 供前端渲染的待提交工作项。
 */
export function mapSubmissionItem(row: SubmissionRow): DashboardWorkItem {
  const hasPassedValidation = row.validation_status === "passed";
  const isApproved = row.review_decision === "approved";
  const tone: DashboardStatusTone = !hasPassedValidation
    ? "danger"
    : row.review_decision && !isApproved
      ? "warn"
      : "info";

  const desc = !hasPassedValidation
    ? "最新检查未通过，需先修正问题后再提交。"
    : row.review_decision === null
      ? "检查已通过，待复核确认后可正式提交。"
      : isApproved
        ? "检查与复核均已完成，可安排正式提交。"
        : "复核尚未通过，需补充处理后再提交。";

  return {
    id: row.id,
    title: caseTitle(row),
    meta: compact([ownerMetaLabel(row.owner_name), dueMetaLabel(row.due_at)]),
    desc,
    status: tone,
    statusLabel:
      tone === "danger" ? "需返工" : tone === "warn" ? "待复核" : "可提交",
    action: "查看案件",
    route: `/cases/${row.id}`,
  };
}

/**
 * 将风险查询结果映射为前端工作项。
 *
 * @param row 风险面板原始数据行。
 * @returns 供前端渲染的风险工作项。
 */
export function mapRiskItem(row: RiskRow): DashboardWorkItem {
  const unpaidAmount = Number(row.unpaid_amount);
  const hasUnpaid = Number.isFinite(unpaidAmount) && unpaidAmount > 0;
  const hasFailedValidation = row.validation_status === "failed";
  const desc = hasUnpaid
    ? `待收金额 ${formatMoneyLabel(row.unpaid_amount)}，需尽快跟进收费。`
    : hasFailedValidation
      ? "最新检查未通过，存在阻断项。"
      : "案件已被标记为高风险，请优先处理。";

  return {
    id: row.id,
    title: caseTitle(row),
    meta: compact([
      ownerMetaLabel(row.owner_name),
      dueMetaLabel(row.due_at),
      hasUnpaid ? `待收：${formatMoneyLabel(row.unpaid_amount)}` : undefined,
    ]),
    desc,
    status: "danger",
    statusLabel: hasUnpaid
      ? "收费风险"
      : hasFailedValidation
        ? "检查风险"
        : "高风险",
    action: hasUnpaid ? "查看收费" : "查看案件",
    route: hasUnpaid ? "/billing" : `/cases/${row.id}`,
  };
}
