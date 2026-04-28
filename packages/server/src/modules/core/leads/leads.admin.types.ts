import type { Lead } from "../../portal/model/portalEntities";
import type { LeadFollowup, LeadLog } from "./leadEntities";

// ── List ──

/** Lead 一覧の表示範囲。 */
export type LeadListScope = "mine" | "group" | "all";

/** Lead 一覧検索条件。 */
export type LeadListInput = {
  scope?: LeadListScope;
  status?: string;
  ownerUserId?: string;
  groupId?: string;
  businessType?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

// ── Update ──

/** Lead 業務フィールド更新入力。 */
export type LeadUpdateInput = {
  name?: string;
  phone?: string;
  email?: string;
  sourceChannel?: string;
  referrer?: string;
  intendedCaseType?: string;
  groupId?: string;
  ownerUserId?: string;
  nextAction?: string;
  nextFollowUpAt?: string;
  quoteAmount?: number;
  note?: string;
};

/** Lead ステータス遷移入力。 */
export type LeadStatusInput = {
  status: string;
  lostReason?: string;
};

// ── Followup ──

/** フォローアップ作成入力。 */
export type LeadFollowupInput = {
  channel: string;
  summary?: string;
  conclusion?: string;
  nextAction?: string;
  nextFollowUpAt?: string;
};

// ── Bulk ──

/** 一括担当者変更入力。 */
export type LeadBulkAssignInput = {
  leadIds: string[];
  ownerUserId: string;
};

/** 一括フォローアップ入力。 */
export type LeadBulkFollowupInput = {
  leadIds: string[];
  channel: string;
  summary?: string;
};

/** 一括ステータス変更入力。 */
export type LeadBulkStatusInput = {
  leadIds: string[];
  status: string;
  lostReason?: string;
};

/** 一括タグ更新入力。 */
export type LeadBulkTagsInput = {
  leadIds: string[];
  tags: string[];
};

// ── Dedup ──

/** 重複検索入力。 */
export type LeadDedupInput = {
  phone?: string;
  email?: string;
};

/** 重複検索結果。 */
export type LeadDedupResult = {
  leads: Lead[];
  customers: { id: string; name: string | null }[];
};

// ── Detail Aggregate ──

/** Lead 詳細集約（フォローアップ/ログ/重複候補/転化先含む）。 */
export type LeadDetailAggregate = {
  lead: Lead;
  followups: LeadFollowup[];
  logs: LeadLog[];
  dedupHints: LeadDedupResult;
  convertedCustomer: { id: string; name: string | null } | null;
  convertedCase: { id: string; caseNo: string | null } | null;
};

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
export const UPDATABLE_FIELDS: ReadonlyMap<keyof LeadUpdateInput, string> =
  new Map([
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
export function extractCustomerName(baseProfile: unknown): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;
  if (typeof bp.name === "string") return bp.name;
  if (typeof bp.lastName === "string") {
    const first = typeof bp.firstName === "string" ? bp.firstName : "";
    return `${bp.lastName} ${first}`.trim();
  }
  return null;
}
