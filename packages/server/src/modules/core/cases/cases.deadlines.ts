import type {
  CaseDeadlineDto,
  CaseDeadlineSeverity,
  CaseDeadlineSourceFields,
  CaseDeadlineType,
} from "./cases.types-task-deadline";

type DeadlineMapping = {
  type: CaseDeadlineType;
  label: string;
  field: keyof CaseDeadlineSourceFields;
};

const DEADLINE_MAPPINGS: DeadlineMapping[] = [
  {
    type: "residence_expiry",
    label: "在留到期日",
    field: "residenceExpiryDate",
  },
  { type: "supplement_due", label: "补件截止日", field: "dueAt" },
  { type: "submission_due", label: "提交预約日", field: "submissionDate" },
  { type: "result_expected", label: "結果予計日", field: "resultDate" },
];

/**
 * 计算日期距今天的剩余天数。
 *
 * @param dueAt ISO 日期字符串或 null
 * @param now 当前时间基准（默认 new Date()）
 * @returns 正数 = 未来，负数 = 已过期，null = 无日期
 */
export function computeRemainingDays(
  dueAt: string | null,
  now: Date = new Date(),
): number | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return null;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueStart.getTime() - todayStart.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * 根据剩余天数判定紧急度。
 *
 * P0-CONTRACT-DETAIL §10：
 * - danger ：≤ 7 天或已过期
 * - warning：8–30 天
 * - normal ：> 30 天或无日期
 *
 * @param remainingDays 距截止日剩余天数（null = 未设定）
 * @returns 紧急度等级
 */
export function computeSeverity(
  remainingDays: number | null,
): CaseDeadlineSeverity {
  if (remainingDays === null) return "normal";
  if (remainingDays <= 7) return "danger";
  if (remainingDays <= 30) return "warning";
  return "normal";
}

/**
 * 从 Case 本体日期字段派生 P0 期限列表。
 *
 * 固定返回 4 项（residence_expiry / supplement_due /
 * submission_due / result_expected），未设定日期的项 dueAt 为 null。
 *
 * @param source Case 本体日期字段子集
 * @param now 当前时间基准（可选，测试注入用）
 * @returns 期限 DTO 数组
 */
export function deriveCaseDeadlines(
  source: CaseDeadlineSourceFields,
  now?: Date,
): CaseDeadlineDto[] {
  return DEADLINE_MAPPINGS.map((mapping) => {
    const dueAt = source[mapping.field];
    const remainingDays = computeRemainingDays(dueAt, now);
    return {
      deadlineType: mapping.type,
      label: mapping.label,
      dueAt,
      remainingDays,
      severity: computeSeverity(remainingDays),
    };
  });
}
