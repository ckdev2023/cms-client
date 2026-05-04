// ── Column Definitions ──
/** Lead テーブルのカラム一覧（SELECT で使用）。 */
export const LEAD_COLS = [
  "id",
  "org_id",
  "app_user_id",
  "source",
  "language",
  "status",
  "assigned_org_id",
  "owner_user_id",
  "lead_no",
  "name",
  "phone",
  "email",
  "source_channel",
  "referrer",
  "intended_case_type",
  "group_id",
  "next_action",
  "next_follow_up_at",
  "quote_amount",
  "note",
  "lost_reason",
  "converted_customer_id",
  "converted_case_id",
  "created_at",
  "updated_at",
].join(", ");
/** lead_followups テーブルのカラム一覧。 */
export const FOLLOWUP_COLS =
  "id, lead_id, channel, summary, conclusion, next_action, next_follow_up_at, created_by, created_at";
/** lead_logs テーブルのカラム一覧。 */
export const LOG_COLS =
  "id, lead_id, log_type, payload, created_by, created_at";
// ── Updatable field whitelist ──
/** 更新可能フィールドのホワイトリスト（TS key → DB column）。 */
export const UPDATABLE_FIELDS = new Map([
  ["name", "name"],
  ["phone", "phone"],
  ["email", "email"],
  ["sourceChannel", "source_channel"],
  ["referrer", "referrer"],
  ["intendedCaseType", "intended_case_type"],
  ["groupId", "group_id"],
  ["ownerUserId", "owner_user_id"],
  ["nextAction", "next_action"],
  ["nextFollowUpAt", "next_follow_up_at"],
  ["quoteAmount", "quote_amount"],
  ["note", "note"],
]);
// ── Helpers ──
/**
 * base_profile から顧客名を抽出する。
 * @param baseProfile base_profile JSON
 * @returns 顧客名、取得不可時は null
 */
export function extractCustomerName(baseProfile) {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile;
  if (typeof bp.name === "string") return bp.name;
  if (typeof bp.lastName === "string") {
    const first = typeof bp.firstName === "string" ? bp.firstName : "";
    return `${bp.lastName} ${first}`.trim();
  }
  return null;
}
//# sourceMappingURL=leads.admin.types.js.map
