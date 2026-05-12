import { pickOptionalString } from "./CustomerAdapterShared";

const COMM_CREATED_BY_FIELDS = ["createdBy", "created_by"];
const COMM_CREATED_BY_DISPLAY_FIELDS = [
  "createdByDisplayName",
  "created_by_display_name",
];
const COMM_FOLLOW_UP_FIELDS = ["followUpDueAt", "follow_up_due_at"];

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 从沟通记录 DTO 解析展示用操作者名称。
 *
 * @param record - API 返回的沟通记录对象
 * @returns 可读的负责人名称；无法解析时用 `System`
 */
export function resolveCommunicationLogActor(
  record: Record<string, unknown>,
): string {
  const display = pickOptionalString(record, COMM_CREATED_BY_DISPLAY_FIELDS);
  if (display) return display;
  const userId = pickOptionalString(record, COMM_CREATED_BY_FIELDS);
  if (userId && UUID_LIKE.test(userId)) return "System";
  return userId ?? "System";
}

/**
 * 根据跟进要求与到期时间解析「下一步」展示文案。
 *
 * @param record - API 返回的沟通记录对象
 * @param detail - 已解析的正文/详情（用于避免与通用「跟进待办」重复）
 * @returns 下一步说明；无则空串
 */
export function resolveCommunicationLogNextAction(
  record: Record<string, unknown>,
  detail: string,
): string {
  const needsFollowUp =
    record.followUpRequired === true || record.follow_up_required === true;
  if (!needsFollowUp) return "";
  const due = pickOptionalString(record, COMM_FOLLOW_UP_FIELDS);
  if (due) return due;
  if (!detail.trim()) return "跟进待办";
  return "";
}
