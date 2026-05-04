/**
 * Lead 管理側（admin/staff）専用エンティティ。
 *
 * lead_followups / lead_logs テーブルに対応。
 * portal 側 Lead 本体は portal/model/portalEntities.ts で管理。
 */
// ── Lead Status ──
export const LEAD_P0_STATUSES = [
  "new",
  "following",
  "pending_sign",
  "signed",
  "converted_case",
  "lost",
];
/**
 * P0 合法状态遷移ホワイトリスト。
 *
 * key = 現在のステータス、value = 遷移可能先ステータス群。
 * `lost → following`（復活）を含む。
 */
export const LEAD_STATUS_TRANSITIONS = new Map([
  ["new", new Set(["following", "lost"])],
  ["following", new Set(["pending_sign", "lost"])],
  ["pending_sign", new Set(["signed", "lost"])],
  ["signed", new Set(["converted_case", "lost"])],
  ["converted_case", new Set([])],
  ["lost", new Set(["following"])],
]);
/**
 * 判断给定值是否为合法的 Lead P0 状态。
 * @param value 待判断的值。
 * @returns 当 value 属于 LeadP0Status 时返回 true。
 */
export function isLeadP0Status(value) {
  return typeof value === "string" && LEAD_P0_STATUSES.includes(value);
}
// ── Followup Channel ──
export const LEAD_FOLLOWUP_CHANNELS = [
  "phone",
  "email",
  "wechat",
  "line",
  "onsite",
  "other",
];
/**
 * 判断给定值是否为合法的跟进渠道。
 * @param value 待判断的值。
 * @returns 当 value 属于 LeadFollowupChannel 时返回 true。
 */
export function isLeadFollowupChannel(value) {
  return typeof value === "string" && LEAD_FOLLOWUP_CHANNELS.includes(value);
}
// ── Value Helpers ──
function toTimestampStringOrNull(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  return null;
}
function requireTimestampString(value, field) {
  const s = toTimestampStringOrNull(value);
  if (!s) throw new Error(`Invalid timestamp: ${field}`);
  return s;
}
function normalizePayload(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch {
      return {};
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}
// ── Map Functions ──
/**
 * 将 Lead 跟进记录查询行映射为领域实体。
 * @param r LeadFollowup 查询结果行。
 * @returns 映射后的 LeadFollowup 实体。
 */
export function mapLeadFollowupRow(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    channel: r.channel,
    summary: r.summary,
    conclusion: r.conclusion,
    nextAction: r.next_action,
    nextFollowUpAt: toTimestampStringOrNull(r.next_follow_up_at),
    createdBy: r.created_by,
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}
/**
 * 将 Lead 日志查询行映射为领域实体。
 * @param r LeadLog 查询结果行。
 * @returns 映射后的 LeadLog 实体。
 */
export function mapLeadLogRow(r) {
  return {
    id: r.id,
    leadId: r.lead_id,
    logType: r.log_type,
    payload: normalizePayload(r.payload),
    createdBy: r.created_by,
    createdAt: requireTimestampString(r.created_at, "created_at"),
  };
}
//# sourceMappingURL=leadEntities.js.map
