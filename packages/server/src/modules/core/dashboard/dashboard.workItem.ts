import type {
  DashboardMetaKey,
  DashboardStatusTone,
  DashboardWorkItem,
  DeadlineRow,
  RiskRow,
  SubmissionRow,
  TodoRow,
} from "./dashboard.shared";

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

function buildCaseMetaKey(row: {
  case_name: string | null;
  case_no: string | null;
}): DashboardMetaKey | undefined {
  const label = row.case_name ?? row.case_no;
  return label ? { key: "case", params: { caseLabel: label } } : undefined;
}

function buildOwnerMetaKey(
  ownerName: string | null | undefined,
): DashboardMetaKey | undefined {
  return ownerName ? { key: "owner", params: { name: ownerName } } : undefined;
}

function buildDueMetaKey(
  dueAt: string | null | undefined,
): DashboardMetaKey | undefined {
  const label = formatDateLabel(dueAt);
  return label ? { key: "due", params: { date: label } } : undefined;
}

function compactMetaKeys(
  values: (DashboardMetaKey | undefined)[],
): DashboardMetaKey[] {
  return values.filter((value): value is DashboardMetaKey => Boolean(value));
}

function todoTone(row: TodoRow): DashboardStatusTone {
  if (row.priority === "high") return "danger";
  if (row.due_at) return "warn";
  if (row.priority === "low") return "muted";
  return "info";
}

const TODO_STATUS_LABEL_KEY: Record<DashboardStatusTone, string> = {
  danger: "highPriority",
  warn: "needsFollowUp",
  muted: "scheduled",
  info: "inProgress",
};

const TODO_STATUS_LABEL: Record<DashboardStatusTone, string> = {
  danger: "高优先",
  warn: "待跟进",
  muted: "已排期",
  info: "进行中",
};

/**
 * 将待办查询结果映射为前端工作项。
 *
 * @param row 待办面板原始数据行。
 * @returns 供前端渲染的待办工作项。
 */
export function mapTodoItem(row: TodoRow): DashboardWorkItem {
  const tone = todoTone(row);
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
    statusLabel: TODO_STATUS_LABEL[tone],
    action: row.case_id ? "查看案件" : "查看任务",
    route: row.case_id ? `/cases/${row.case_id}` : "/tasks",
    statusLabelKey: TODO_STATUS_LABEL_KEY[tone],
    descKey: "todo.statusPriority",
    descParams: { status: row.status, priority: row.priority },
    actionKey: row.case_id ? "viewCase" : "viewTask",
    metaKeys: compactMetaKeys([
      buildCaseMetaKey(row),
      row.assignee_name
        ? { key: "assignee", params: { name: row.assignee_name } }
        : undefined,
      buildDueMetaKey(row.due_at),
    ]),
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
  const isOverdue = daysLeft <= 0;

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
    statusLabelKey: isOverdue ? "overdue" : "daysLeft",
    descKey: "deadline.currentStage",
    descParams: { status: row.status },
    actionKey: "viewCase",
    metaKeys: compactMetaKeys([
      buildOwnerMetaKey(row.owner_name),
      buildDueMetaKey(row.due_at),
    ]),
  };
}

type SubmissionDescriptor = {
  tone: DashboardStatusTone;
  desc: string;
  descKey: string;
  statusLabel: string;
  statusLabelKey: string;
};

function describeSubmission(row: SubmissionRow): SubmissionDescriptor {
  if (row.validation_status !== "passed") {
    return {
      tone: "danger",
      desc: "最新检查未通过，需先修正问题后再提交。",
      descKey: "submission.needsRework",
      statusLabel: "需返工",
      statusLabelKey: "needsRework",
    };
  }
  if (row.review_decision === null) {
    return {
      tone: "info",
      desc: "检查已通过，待复核确认后可正式提交。",
      descKey: "submission.pendingReview",
      statusLabel: "可提交",
      statusLabelKey: "readyToSubmit",
    };
  }
  if (row.review_decision === "approved") {
    return {
      tone: "info",
      desc: "检查与复核均已完成，可安排正式提交。",
      descKey: "submission.approvedReady",
      statusLabel: "可提交",
      statusLabelKey: "readyToSubmit",
    };
  }
  return {
    tone: "warn",
    desc: "复核尚未通过，需补充处理后再提交。",
    descKey: "submission.reviewNotPassed",
    statusLabel: "待复核",
    statusLabelKey: "pendingReview",
  };
}

/**
 * 将待提交查询结果映射为前端工作项。
 *
 * @param row 待提交面板原始数据行。
 * @returns 供前端渲染的待提交工作项。
 */
export function mapSubmissionItem(row: SubmissionRow): DashboardWorkItem {
  const d = describeSubmission(row);
  return {
    id: row.id,
    title: caseTitle(row),
    meta: compact([ownerMetaLabel(row.owner_name), dueMetaLabel(row.due_at)]),
    desc: d.desc,
    status: d.tone,
    statusLabel: d.statusLabel,
    action: "查看案件",
    route: `/cases/${row.id}`,
    statusLabelKey: d.statusLabelKey,
    descKey: d.descKey,
    actionKey: "viewCase",
    metaKeys: compactMetaKeys([
      buildOwnerMetaKey(row.owner_name),
      buildDueMetaKey(row.due_at),
    ]),
  };
}

type RiskDescriptor = {
  desc: string;
  descKey: string;
  descParams?: Record<string, string | number>;
  statusLabel: string;
  statusLabelKey: string;
  action: string;
  actionKey: string;
  route: string;
};

function describeRisk(row: RiskRow, unpaidAmount: number): RiskDescriptor {
  const hasUnpaid = Number.isFinite(unpaidAmount) && unpaidAmount > 0;
  if (hasUnpaid) {
    return {
      desc: `待收金额 ${formatMoneyLabel(row.unpaid_amount)}，需尽快跟进收费。`,
      descKey: "risk.unpaidAmount",
      descParams: { amount: unpaidAmount },
      statusLabel: "收费风险",
      statusLabelKey: "billingRisk",
      action: "查看收费",
      actionKey: "viewBilling",
      route: "/billing",
    };
  }
  if (row.validation_status === "failed") {
    return {
      desc: "最新检查未通过，存在阻断项。",
      descKey: "risk.validationFailed",
      statusLabel: "检查风险",
      statusLabelKey: "validationRisk",
      action: "查看案件",
      actionKey: "viewCase",
      route: `/cases/${row.id}`,
    };
  }
  return {
    desc: "案件已被标记为高风险，请优先处理。",
    descKey: "risk.highRiskGeneric",
    statusLabel: "高风险",
    statusLabelKey: "highRisk",
    action: "查看案件",
    actionKey: "viewCase",
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
  const d = describeRisk(row, unpaidAmount);
  return {
    id: row.id,
    title: caseTitle(row),
    meta: compact([
      ownerMetaLabel(row.owner_name),
      dueMetaLabel(row.due_at),
      hasUnpaid ? `待收：${formatMoneyLabel(row.unpaid_amount)}` : undefined,
    ]),
    desc: d.desc,
    status: "danger",
    statusLabel: d.statusLabel,
    action: d.action,
    route: d.route,
    statusLabelKey: d.statusLabelKey,
    descKey: d.descKey,
    descParams: d.descParams,
    actionKey: d.actionKey,
    metaKeys: compactMetaKeys([
      buildOwnerMetaKey(row.owner_name),
      buildDueMetaKey(row.due_at),
      hasUnpaid
        ? { key: "unpaid", params: { amount: unpaidAmount } }
        : undefined,
    ]),
  };
}
