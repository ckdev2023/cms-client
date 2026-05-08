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
  tags?: string[];
  page?: number;
  limit?: number;
};

// ── Create ──

/** Lead 新規作成入力。`name` 必須、他は更新と同一。 */
export type LeadCreateInput = {
  name: string;
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
  language?: string;
};

// ── Convert Customer ──

/** Lead → Customer 転化入力。 */
export type LeadConvertCustomerInput = {
  customerId?: string;
  localizedNames?: {
    zh?: string;
    ja?: string;
    en?: string;
    defaultLocale?: "zh" | "ja" | "en";
  };
  confirmDedup?: boolean;
};

/** Lead → Case 転化入力。 */
export type LeadConvertCaseInput = {
  caseTypeCode: string;
  ownerUserId: string;
  groupId?: string;
};

/** 転化可能なステータス群。 */
export const CONVERTIBLE_STATUSES = new Set([
  "following",
  "pending_sign",
  "signed",
]);

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
  /** 自分自身を結果から除外したい場合に渡す Lead ID（R-FLOW5-A-4）。 */
  leadId?: string;
};

/** 重複検索結果。 */
export type LeadDedupResult = {
  leads: Lead[];
  customers: { id: string; name: string | null }[];
};

// ── Detail Aggregate ──

/** 転化先 Customer サマリ（Lead 詳細用）。 */
export type ConvertedCustomerSummary = {
  id: string;
  name: string | null;
  customerNo?: string | null;
  displayName?: string | null;
  group?: { id: string; name: string } | null;
  convertedAt?: string | null;
};

/** 転化先 Case サマリ（Lead 詳細用 / R-FLOW5-A-8）。 */
export type ConvertedCaseSummary = {
  id: string;
  caseNo: string | null;
  caseTypeCode?: string | null;
  title?: string | null;
  applicantName?: string | null;
  group?: { id: string; name: string } | null;
  convertedAt?: string | null;
};

/** Lead 詳細集約（フォローアップ/ログ/重複候補/転化先含む）。 */
export type LeadDetailAggregate = {
  lead: Lead;
  followups: LeadFollowup[];
  logs: LeadLog[];
  dedupHints: LeadDedupResult;
  convertedCustomer: ConvertedCustomerSummary | null;
  convertedCase: ConvertedCaseSummary | null;
};

// ── Column Definitions ──

const LEAD_COL_NAMES = [
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
  "tags",
  "created_at",
  "updated_at",
] as const;

/** Lead テーブルのカラム一覧（SELECT で使用）。 */
export const LEAD_COLS = LEAD_COL_NAMES.join(", ");

/** `leads l` エイリアス付き SELECT 列。 */
export const LEAD_COLS_ALIASED = LEAD_COL_NAMES.map((c) => `l.${c}`).join(", ");

/** 一覧 JOIN 用の追加 SELECT カラム。 */
export const LEAD_LIST_JOIN_COLS =
  "u.name as owner_display_name, g.name as group_name";

/** 一覧 LEFT JOIN 句。 */
export const LEAD_LIST_JOINS =
  "left join users u on u.id = l.owner_user_id left join groups g on g.id = l.group_id";

/** Admin 一覧 JOIN 結果行。 */
export type AdminLeadListRow = {
  id: string;
  org_id: string | null;
  app_user_id: string;
  source: string;
  language: string;
  status: string;
  assigned_org_id: string | null;
  owner_user_id?: string | null;
  lead_no?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  source_channel?: string | null;
  referrer?: string | null;
  intended_case_type?: string | null;
  group_id?: string | null;
  next_action?: string | null;
  next_follow_up_at?: unknown;
  quote_amount?: unknown;
  note?: string | null;
  lost_reason?: string | null;
  converted_customer_id?: string | null;
  converted_case_id?: string | null;
  tags?: string[] | null;
  created_at: unknown;
  updated_at: unknown;
  owner_display_name?: string | null;
  group_name?: string | null;
};

/** Admin 一覧レスポンス用アイテム。 */
export type AdminLeadListItem = Lead & {
  ownerDisplayName: string | null;
  groupName: string | null;
};

/** lead_followups テーブルのカラム一覧。 */
export const FOLLOWUP_COLS =
  "id, lead_id, channel, summary, conclusion, next_action, next_follow_up_at, created_by, created_at";

/** lead_logs テーブルのカラム一覧（actor displayName を含む）。
 *
 * `lead_logs ll left join users u on u.id = ll.created_by` を前提とする。
 * H-5 修正：actor displayName を追加し UI 側で「誰が」を可視化する。
 */
export const LOG_COLS =
  "ll.id, ll.lead_id, ll.log_type, ll.payload, ll.created_by, u.name as created_by_display_name, ll.created_at";

/** lead_logs の SELECT 用 FROM 句（users JOIN 含む）。 */
export const LOG_FROM_WITH_ACTOR =
  "lead_logs ll left join users u on u.id = ll.created_by";

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

export { extractCustomerName } from "../customers/customerName";
