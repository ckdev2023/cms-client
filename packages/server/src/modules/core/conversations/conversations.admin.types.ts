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
