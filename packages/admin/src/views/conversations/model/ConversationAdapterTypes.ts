/**
 * ConversationAdapterTypes — 会话适配层类型契约。
 */

import type {
  ConversationListItem,
  ConversationDetail,
  MessageItem,
  MessageKind,
  MessageVisibleScope,
} from "../types";

// ─── List Params ────────────────────────────────────────────────

/**
 * 会话列表 HTTP 查询参数。
 */
export interface ConversationListParams {
  /**
   *
   */
  scope?: string;
  /**
   *
   */
  search?: string;
  /**
   *
   */
  status?: string;
  /**
   *
   */
  ownerUserId?: string;
  /**
   *
   */
  leadId?: string;
  /**
   *
   */
  customerId?: string;
  /**
   *
   */
  caseId?: string;
  /**
   *
   */
  appUserId?: string;
  /**
   *
   */
  unreadOnly?: boolean;
  /**
   *
   */
  page?: number;
  /**
   *
   */
  limit?: number;
}

export const CONVERSATION_LIST_PARAM_KEYS = [
  "scope",
  "search",
  "status",
  "ownerUserId",
  "leadId",
  "customerId",
  "caseId",
  "appUserId",
  "unreadOnly",
  "page",
  "limit",
] as const;

export const CONVERSATION_LIST_HTTP_FIELD_MAP: Record<string, string> = {
  scope: "scope",
  search: "search",
  status: "status",
  ownerUserId: "ownerUserId",
  leadId: "leadId",
  customerId: "customerId",
  caseId: "caseId",
  appUserId: "appUserId",
  unreadOnly: "unreadOnly",
  page: "page",
  limit: "limit",
};

// ─── Results ────────────────────────────────────────────────────

/**
 * 会话列表接口返回结果（分页）。
 */
export interface ConversationListResult {
  /**
   *
   */
  items: ConversationListItem[];
  /**
   *
   */
  total: number;
  /**
   *
   */
  page: number;
  /**
   *
   */
  limit: number;
}

/**
 * 写入操作统一返回结构。
 */
export interface ConversationMutationResult {
  /**
   *
   */
  id: string;
}

/**
 * 会话详情聚合。
 */
export interface ConversationDetailAggregate {
  /**
   *
   */
  detail: ConversationDetail;
}

// ─── Write Inputs ───────────────────────────────────────────────

/**
 * 指派负责人输入。
 */
export interface ConversationAssignInput {
  /**
   *
   */
  ownerUserId: string;
}

/**
 * 发送消息输入。
 */
export interface ConversationSendMessageInput {
  /**
   *
   */
  originalText: string;
  /**
   *
   */
  originalLanguage: string;
  /**
   *
   */
  kind?: MessageKind;
  /**
   *
   */
  visibleScope?: MessageVisibleScope;
  /**
   *
   */
  forceOriginal?: boolean;
}

/**
 * 重试翻译输入。
 */
export interface ConversationRetryTranslationInput {
  /**
   *
   */
  messageId: string;
}

// ─── Messages List Result ───────────────────────────────────────

/**
 * 会话消息列表返回结果（分页）。
 */
export interface ConversationMessagesResult {
  /**
   *
   */
  items: MessageItem[];
  /**
   *
   */
  total: number;
  /**
   *
   */
  page: number;
  /**
   *
   */
  limit: number;
}
