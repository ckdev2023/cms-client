import type { ReminderRecord, TaskRecord } from "../types";

/**
 * vue-i18n `t` 函数的最小签名，便于纯函数 helper 接收翻译能力。
 */
export type TaskI18nT = (
  key: string,
  named?: Record<string, string | number>,
) => string;

/**
 * 将 ISO 时间格式化为指定语言环境下的可读日期时间文本。
 *
 * @param value - 待格式化的时间字符串。
 * @param locale - 当前页面使用的语言环境。
 * @param placeholder - 缺失或解析失败时使用的占位符。
 * @returns 格式化后的日期时间文本。
 */
export function formatDateTime(
  value: string | null,
  locale: string,
  placeholder = "—",
): string {
  if (!value) return placeholder;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * 生成顶部刷新时间文案。
 *
 * @param value - 最近刷新时间。
 * @param locale - 当前页面使用的语言环境。
 * @param t - vue-i18n 翻译函数。
 * @returns 适合页面展示的刷新提示文本。
 */
export function formatUpdatedAt(
  value: string | null,
  locale: string,
  t: TaskI18nT,
): string {
  return value
    ? t("tasks.workbench.lastUpdated", { time: formatDateTime(value, locale) })
    : t("tasks.workbench.notLoaded");
}

/**
 * 将任务状态码转换为本地化标签。
 *
 * @param status - 任务状态码。
 * @param t - vue-i18n 翻译函数。
 * @returns 对应的本地化状态名称。
 */
export function taskStatusLabel(status: string, t: TaskI18nT): string {
  const known = ["pending", "in_progress", "completed", "cancelled"] as const;
  return (known as readonly string[]).includes(status)
    ? t(`tasks.taskStatus.${status}`)
    : status;
}

/**
 * 将任务优先级转换为本地化标签。
 *
 * @param priority - 任务优先级编码。
 * @param t - vue-i18n 翻译函数。
 * @returns 对应的本地化优先级名称。
 */
export function priorityLabel(priority: string, t: TaskI18nT): string {
  const known = ["low", "normal", "high", "urgent"] as const;
  return (known as readonly string[]).includes(priority)
    ? t(`tasks.priority.${priority}`)
    : priority;
}

/**
 * 将提醒发送状态转换为本地化标签。
 *
 * @param status - 提醒发送状态码。
 * @param t - vue-i18n 翻译函数。
 * @returns 对应的本地化状态名称。
 */
export function reminderStatusLabel(status: string, t: TaskI18nT): string {
  const known = ["pending", "sent", "failed", "canceled"] as const;
  return (known as readonly string[]).includes(status)
    ? t(`tasks.reminderStatus.${status}`)
    : status;
}

/**
 * 根据提醒快照信息生成列表标题。
 *
 * @param reminder - 提醒记录。
 * @param t - vue-i18n 翻译函数。
 * @returns 适合在表格中展示的提醒标题。
 */
export function reminderTitle(reminder: ReminderRecord, t: TaskI18nT): string {
  const payload = reminder.payloadSnapshot ?? {};
  if (typeof payload.label === "string" && payload.label.trim()) {
    return payload.label.trim();
  }

  const daysBefore = payload.daysBefore;
  const statusOfResidence = payload.statusOfResidence;
  if (typeof daysBefore === "number") {
    if (typeof statusOfResidence === "string" && statusOfResidence.trim()) {
      return t("tasks.reminderTitle.daysBefore", {
        visa: `${statusOfResidence.trim()} · `,
        days: daysBefore,
      });
    }
    return t("tasks.reminderTitle.daysBeforeNoVisa", { days: daysBefore });
  }

  if (payload.pendingCoeDate === true) {
    return t("tasks.reminderTitle.pendingCoeDate");
  }

  return t("tasks.reminderTitle.fallback", {
    type: reminder.targetType,
    id: reminder.targetId,
  });
}

const SHORT_UUID_LENGTH = 8;

/**
 * 把 raw UUID 折叠成 8 位短码，避免直接渲染整段 UUID。
 *
 * @param value - 原始 UUID。
 * @returns 截断后的短码；若原值短于阈值则原样返回。
 */
function toShortUuid(value: string): string {
  return value.length > SHORT_UUID_LENGTH
    ? value.slice(0, SHORT_UUID_LENGTH)
    : value;
}

const UUID_V4_RE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * dedupeKey 内の UUID v4 部分を 8 文字短縮形に置き換え、
 * `residence_period:` / `case:` 等のビジネスプレフィックスはそのまま保持する（BUG-171）。
 *
 * @param key - 原始 dedupeKey 文字列。
 * @returns UUID 部分が短縮された文字列。
 */
export function maskDedupeKeyUuid(key: string): string {
  return key.replace(UUID_V4_RE, (match) => toShortUuid(match));
}

/**
 * 选取案件展示标签：优先 `caseNo`，缺失时回退短 UUID（BUG-163）。
 *
 * @param reminder - 提醒记录。
 * @returns 适合在表格中展示的案件标识；无案件信息时返回 `null`。
 */
export function reminderCaseLabel(reminder: ReminderRecord): string | null {
  if (reminder.caseNo && reminder.caseNo.trim()) return reminder.caseNo.trim();
  if (reminder.caseId && reminder.caseId.trim())
    return toShortUuid(reminder.caseId.trim());
  return null;
}

/**
 * 选取接收人展示标签：优先 `recipientName`，缺失时回退短 UUID（BUG-163）。
 *
 * @param reminder - 提醒记录。
 * @returns 适合在表格中展示的接收人标识；无接收人信息时返回 `null`。
 */
export function reminderRecipientLabel(
  reminder: ReminderRecord,
): string | null {
  if (reminder.recipientName && reminder.recipientName.trim())
    return reminder.recipientName.trim();
  if (reminder.recipientId && reminder.recipientId.trim())
    return toShortUuid(reminder.recipientId.trim());
  return null;
}

/**
 * 拼装提醒记录的附加元信息文案。
 *
 * @param reminder - 提醒记录。
 * @param t - vue-i18n 翻译函数。
 * @returns 案件、接收人和去重键组成的摘要文本。
 */
export function reminderMeta(reminder: ReminderRecord, t: TaskI18nT): string {
  const caseLabel = reminderCaseLabel(reminder);
  const recipientLabel = reminderRecipientLabel(reminder);
  const segments = [
    caseLabel ? t("tasks.reminderMeta.case", { id: caseLabel }) : null,
    recipientLabel
      ? t("tasks.reminderMeta.recipient", { id: recipientLabel })
      : null,
    reminder.dedupeKey
      ? t("tasks.reminderMeta.dedupeKey", {
          key: maskDedupeKeyUuid(reminder.dedupeKey),
        })
      : null,
  ].filter((value): value is string => Boolean(value));

  return segments.join(" · ") || t("tasks.reminderMeta.empty");
}

/**
 * 生成提醒 id 的弱化展示文本（短 UUID）。
 *
 * @param reminder - 提醒记录。
 * @returns 8 位短 UUID，可放入 `<small>` 弱化展示（BUG-163）。
 */
export function reminderShortId(reminder: ReminderRecord): string {
  return toShortUuid(reminder.id);
}

/**
 * 计算任务行的语义色调。
 *
 * @param task - 任务记录。
 * @returns 供状态标签使用的色调标识。
 */
export function taskRowTone(task: TaskRecord): string {
  if (task.status === "completed") return "success";
  if (task.priority === "urgent") return "danger";
  if (task.priority === "high") return "warning";
  return "neutral";
}

/**
 * 计算提醒行的语义色调。
 *
 * @param reminder - 提醒记录。
 * @returns 供状态标签使用的色调标识。
 */
export function reminderRowTone(reminder: ReminderRecord): string {
  if (reminder.sendStatus === "failed") return "danger";
  if (reminder.sendStatus === "sent") return "success";
  return "neutral";
}

/**
 * 判断任务当前是否允许执行“完成”操作。
 *
 * @param task - 待判断的任务记录。
 * @returns 当任务仍处于可处理状态时返回 `true`。
 */
export function canComplete(task: TaskRecord): boolean {
  return task.status === "pending" || task.status === "in_progress";
}
