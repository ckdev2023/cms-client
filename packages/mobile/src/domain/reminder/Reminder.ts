/**
 * P0 提醒发送状态枚举。
 */
export type ReminderSendStatus = "pending" | "sent" | "failed" | "canceled";

/**
 * P0 提醒目标类型枚举。
 */
export type ReminderTargetType =
  | "case"
  | "customer"
  | "requirement"
  | "deadline"
  | "billing_plan";

/**
 * P0 固定提醒天数（不可配置，P1 才可配置化）。
 */
export const RESIDENCE_REMINDER_DAYS = [180, 90, 30] as const;

/**
 * Reminder 领域实体（P0 §3.21）。
 */
export type Reminder = {
  /** ID。 */
  id: string;
  /** 关联案件（可选）。 */
  caseId: string | null;
  /** 目标类型。 */
  targetType: ReminderTargetType;
  /** 目标实体 ID。 */
  targetId: string;
  /** 提醒时间。 */
  remindAt: string;
  /** 发送状态。 */
  sendStatus: ReminderSendStatus;
  /** 去重键。 */
  dedupeKey: string | null;
  /** 负载快照。 */
  payloadSnapshot: Record<string, unknown> | null;
  /** 创建时间。 */
  createdAt: string;
};

/**
 * 生成在留续签提醒的去重键。
 *
 * @param caseId 案件 ID
 * @param daysBefore 提前天数（180/90/30）
 * @returns 去重键
 */
export function buildResidenceReminderDedupeKey(
  caseId: string,
  daysBefore: number,
): string {
  return `residence_renewal:${caseId}:${String(daysBefore)}d`;
}
