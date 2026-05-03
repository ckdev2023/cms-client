/**
 * 提醒/期限写入请求体构造器 — UI 期限类型 → server targetType + payloadSnapshot 映射。
 *
 * UI 3 种分类（residence_expiry / renewal_reminder / custom）映射为
 * `targetType`（case / case_party_residence）和 `payloadSnapshot.kind` 的组合。
 */

/**
 * UI 层期限分类选项。
 */
export type DeadlineKindChoice =
  | "residence_expiry"
  | "renewal_reminder"
  | "custom";

/**
 * 创建提醒的 UI 层输入。
 */
export interface ReminderCreateInput {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  targetType: "case" | "case_party_residence";
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
  kind: DeadlineKindChoice;
  /**
   *
   */
  memo?: string;
}

interface ReminderPayload {
  targetType: string;
  targetId: string;
  remindAt: string;
  caseId: string;
  channel: string;
  payloadSnapshot: { kind: string; memo?: string };
}

/**
 * 将 UI 层期限创建输入转换为 server `POST /reminders` 请求体。
 *
 * @param input - UI 层收集的创建参数
 * @returns 符合 server CreateReminderBody 的请求体
 */
export function buildCreateReminderPayload(
  input: ReminderCreateInput,
): ReminderPayload {
  return {
    targetType: input.targetType,
    targetId: input.targetId,
    remindAt: input.remindAt,
    caseId: input.caseId,
    channel: "in_app",
    payloadSnapshot: {
      kind: input.kind,
      ...(input.memo ? { memo: input.memo } : {}),
    },
  };
}

/**
 * 构建 reminders POST URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @returns POST URL，如 `/api/reminders`
 */
export function buildRemindersPostUrl(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "") + "/reminders";
}
