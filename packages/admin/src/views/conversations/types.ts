/**
 * 会话状态。
 *
 * - `open` — 进行中
 * - `closed` — 已关闭
 */
export type ConversationStatus = "open" | "closed";

/**
 * 消息种类（P0 §2.5）。
 */
export type MessageKind =
  | "text"
  | "system_event"
  | "intake_link"
  | "quote_link"
  | "sign_link";

/**
 * 消息可见范围。
 */
export type MessageVisibleScope = "internal_only" | "client_visible";

/**
 * 翻译状态。
 */
export type TranslationStatus = "none" | "pending" | "completed" | "failed";

/**
 * 消息发送方类型。
 */
export type SenderType = "app_user" | "staff";

/**
 * 可见性范围。
 */
export type ConversationScope = "mine" | "group" | "all";

/** 空字符串表示"全部"（不过滤）。 */
export type ConversationStatusFilter = "" | ConversationStatus;
/** 空字符串表示"全部"（不过滤）。 */
export type ConversationOwnerFilter = "" | string;

/**
 * 会话列表筛选状态。
 */
export interface ConversationFiltersState {
  /**
   *
   */
  scope: ConversationScope;
  /**
   *
   */
  search: string;
  /**
   *
   */
  status: ConversationStatusFilter;
  /**
   *
   */
  owner: ConversationOwnerFilter;
  /**
   *
   */
  unreadOnly: boolean;
}

/**
 * 关联实体概要（Lead / Customer / Case）。
 */
export interface LinkedEntitySummary {
  /**
   *
   */
  id: string;
  /**
   *
   */
  label: string;
  /**
   *
   */
  type: "lead" | "customer" | "case";
}

/**
 * 会话列表行。
 */
export interface ConversationListItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  channel: string;
  /**
   *
   */
  preferredLanguage: string;
  /**
   *
   */
  status: ConversationStatus;
  /**
   *
   */
  ownerUserId: string | null;
  /**
   *
   */
  ownerLabel: string;
  /**
   *
   */
  lastMessagePreview: string;
  /**
   *
   */
  lastMessageAt: string;
  /**
   *
   */
  lastMessageAtLabel: string;
  /**
   *
   */
  unreadCountUser: number;
  /**
   *
   */
  unreadCountStaffTenant: number;
  /**
   *
   */
  unreadCountStaffOwner: number;
  /**
   *
   */
  linkedEntity: LinkedEntitySummary | null;
  /**
   *
   */
  appUserName: string;
}

/**
 * 消息条目。
 */
export interface MessageItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  conversationId: string;
  /**
   *
   */
  senderType: SenderType;
  /**
   *
   */
  senderName: string;
  /**
   *
   */
  content: string;
  /**
   *
   */
  kind: MessageKind;
  /**
   *
   */
  visibleScope: MessageVisibleScope;
  /**
   *
   */
  translationStatus: TranslationStatus;
  /**
   *
   */
  translatedContent: string | null;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  createdAtLabel: string;
}

/**
 * 会话详情聚合。
 */
export interface ConversationDetail {
  /**
   *
   */
  id: string;
  /**
   *
   */
  channel: string;
  /**
   *
   */
  preferredLanguage: string;
  /**
   *
   */
  status: ConversationStatus;
  /**
   *
   */
  ownerUserId: string | null;
  /**
   *
   */
  ownerLabel: string;
  /**
   *
   */
  leadId: string | null;
  /**
   *
   */
  customerId: string | null;
  /**
   *
   */
  caseId: string | null;
  /**
   *
   */
  appUserName: string;
  /**
   *
   */
  linkedLead: LinkedEntitySummary | null;
  /**
   *
   */
  linkedCustomer: LinkedEntitySummary | null;
  /**
   *
   */
  linkedCase: LinkedEntitySummary | null;
  /**
   *
   */
  unreadCountUser: number;
  /**
   *
   */
  unreadCountStaffTenant: number;
  /**
   *
   */
  unreadCountStaffOwner: number;
  /**
   *
   */
  createdAt: string;
}
