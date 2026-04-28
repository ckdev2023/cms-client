// ────────────────────────────────────────────────────────────────
// Reminder Blueprint → Reminder Row 真相源映射 — P1 冻结契约
//
// 本文件定义 `reminder_schedule_blueprint`（来自 case_templates）
// 到 `reminders` 表 INSERT 行的完整映射规则。
//
// 真相源：
//   blueprint 来自 case_templates.reminder_schedule_blueprint
//   P0 无模板时降级为 DEFAULT_REMINDER_SCHEDULE
//
// 约束：
//   1. daysBefore ← blueprint.daysBefore（正整数）
//   2. channel ← blueprint.channel（须满足 chk_reminders_channel 约束，P0 = 'in_app'）
//   3. recipientType ← RECIPIENT_TYPE_MAP[blueprint.recipientType]
//   4. remindAt ← validUntil - daysBefore 天
//   5. dedupeKey ← `residence_period:<periodId>:<daysBefore>`
//   6. target_type 固定 'customer'，target_id = customerId
//   7. payload_snapshot 包含 residencePeriodId / validUntil / daysBefore / statusOfResidence
//
// 权威引用：
//   - P1/01 §3 M8（在留到期提醒）
//   - P0/07 §3.21（reminders 表字段）
//   - bmvTemplateConfig.ts BMV_REMINDER_SCHEDULE_BLUEPRINT
//   - 016_billing_reminders_truth.up.sql chk_reminders_channel
// ────────────────────────────────────────────────────────────────

import type { ReminderScheduleBlueprintItem } from "../cases/cases.types-template-blueprints";

/**
 * P0 降级用默认提醒计划 — 当案件无模板或模板无 blueprint 时使用。
 *
 * 偏移天数 180 / 90 / 30 与 BMV_REMINDER_SCHEDULE_BLUEPRINT 一致，
 * 但此处作为独立常量维护，避免 P0 依赖 P1 模板定义。
 */
export const DEFAULT_REMINDER_SCHEDULE: readonly ReminderScheduleBlueprintItem[] =
  [
    {
      daysBefore: 180,
      channel: "in_app",
      recipientType: "owner",
      label: "在留到期前180天提醒",
    },
    {
      daysBefore: 90,
      channel: "in_app",
      recipientType: "owner",
      label: "在留到期前90天提醒",
    },
    {
      daysBefore: 30,
      channel: "in_app",
      recipientType: "owner",
      label: "在留到期前30天提醒",
    },
  ];

/**
 * Blueprint recipientType → reminders.recipient_type 映射。
 *
 * blueprint 使用业务语义值（owner / assistant）；
 * 实际写入 reminders 表时需映射为 DB 枚举（internal_user）。
 *
 * P0 仅支持 owner → internal_user 映射。
 */
export const RECIPIENT_TYPE_MAP: Readonly<Record<string, string>> = {
  owner: "internal_user",
  assistant: "internal_user",
};

/**
 * 从 blueprint item 解析 recipient_type 写入值。
 * 未知 recipientType 降级为 'internal_user'。
 * @param blueprintRecipientType - blueprint 中声明的接收人类型。
 * @returns reminders 表使用的 recipient_type 值。
 */
export function resolveRecipientType(blueprintRecipientType: string): string {
  return RECIPIENT_TYPE_MAP[blueprintRecipientType] ?? "internal_user";
}

/** 已解析的单条提醒生成计划 — 可直接驱动 INSERT。 */
export type ResolvedReminderPlan = {
  daysBefore: number;
  remindAt: string;
  dedupeKey: string;
  channel: string;
  recipientType: string;
  label: string;
};

/**
 * 将 blueprint 条目转换为可直接驱动 INSERT 的提醒计划。
 *
 * @param items blueprint 条目（来自 case_templates 或 DEFAULT_REMINDER_SCHEDULE）
 * @param periodId 在留期间 ID（用于 dedupeKey）
 * @param validUntil 在留到期日 YYYY-MM-DD
 * @returns 解析后的提醒计划列表
 * @throws 当 validUntil 格式非法时抛出
 */
export function resolveReminderPlans(
  items: readonly ReminderScheduleBlueprintItem[],
  periodId: string,
  validUntil: string,
): ResolvedReminderPlan[] {
  const [year, month, day] = validUntil.split("-").map(Number);
  if (!year || !month || !day) {
    throw new Error("Invalid validUntil format");
  }
  const base = Date.UTC(year, month - 1, day, 0, 0, 0, 0);

  return items.map((item) => {
    const remindAt = new Date(
      base - item.daysBefore * 24 * 60 * 60 * 1000,
    ).toISOString();
    return {
      daysBefore: item.daysBefore,
      remindAt,
      dedupeKey: `residence_period:${periodId}:${String(item.daysBefore)}`,
      channel: item.channel,
      recipientType: resolveRecipientType(item.recipientType),
      label: item.label,
    };
  });
}
