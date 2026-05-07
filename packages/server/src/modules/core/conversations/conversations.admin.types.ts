import type { Conversation } from "../../portal/model/portalEntities";

/**
 *
 */
export type ConversationListInput = {
  status?: string;
  ownerUserId?: string;
  leadId?: string;
  customerId?: string;
  caseId?: string;
  appUserId?: string;
  unreadOnly?: boolean;
  search?: string;
  page?: number;
  limit?: number;
};

/**
 *
 */
export type ConversationAssignInput = {
  ownerUserId?: string;
};

/**
 *
 */
export type ConversationDetailAggregate = {
  conversation: Conversation;
  lead: { id: string; name: string | null; status: string } | null;
  customer: { id: string; name: string | null } | null;
  case: { id: string; caseNo: string | null } | null;
  appUser: {
    id: string;
    name: string;
    preferredLanguage: string;
  } | null;
};

export const CONV_ADMIN_COLS = `id, lead_id, app_user_id, org_id, channel, preferred_language, status, owner_user_id, last_message_at, unread_count_staff_tenant, unread_count_staff_owner, unread_count_user, customer_id, case_id, created_at, updated_at`;

/** `conversations c` にエイリアスを付けた SELECT 列。 */
export const CONV_ADMIN_COLS_ALIASED = `c.id, c.lead_id, c.app_user_id, c.org_id, c.channel, c.preferred_language, c.status, c.owner_user_id, c.last_message_at, c.unread_count_staff_tenant, c.unread_count_staff_owner, c.unread_count_user, c.customer_id, c.case_id, c.created_at, c.updated_at`;

/** 一覧 JOIN 用の追加 SELECT カラム。 */
export const CONV_LIST_JOIN_COLS = `l.name as lead_name, cu.base_profile as customer_base_profile, u.name as owner_display_name, au.name as app_user_name, lm.original_text as lm_original_text, lm.sender_role as lm_sender_role`;

/** 一覧 LEFT JOIN 句。 */
export const CONV_LIST_JOINS = `left join leads l on l.id = c.lead_id left join customers cu on cu.id = c.customer_id left join users u on u.id = c.owner_user_id left join app_users au on au.id = c.app_user_id left join lateral (select original_text, sender_role from messages m where m.conversation_id = c.id order by m.created_at desc limit 1) lm on true`;

/**
 * Admin 一覧向け会話行（JOIN 結果カラム含む）。
 */
export type AdminConversationListRow = {
  id: string;
  lead_id: string | null;
  app_user_id: string;
  org_id: string | null;
  channel: string;
  preferred_language: string;
  status: string;
  owner_user_id?: string | null;
  last_message_at?: unknown;
  unread_count_staff_tenant?: unknown;
  unread_count_staff_owner?: unknown;
  unread_count_user?: unknown;
  customer_id?: string | null;
  case_id?: string | null;
  created_at: unknown;
  updated_at: unknown;
  lead_name?: string | null;
  customer_base_profile?: unknown;
  owner_display_name?: string | null;
  app_user_name?: string | null;
  lm_original_text?: string | null;
  lm_sender_role?: string | null;
};

/**
 * Admin 一覧レスポンス用アイテム。
 */
export type AdminConversationListItem = Conversation & {
  leadName: string | null;
  customerName: string | null;
  ownerDisplayName: string | null;
  appUserName: string | null;
  linkedEntity: {
    id: string;
    label: string;
    type: "lead" | "customer" | "case";
  } | null;
  ownerLabel: string;
  lastMessagePreview: string;
};
