/**
 * ConversationAdapterWriteBuilders — 写入请求体构造 + URL 构造 + 筛选转换。
 */

import type {
  ConversationListParams,
  ConversationAssignInput,
  ConversationSendMessageInput,
} from "./ConversationAdapterTypes";
import {
  CONVERSATION_LIST_PARAM_KEYS,
  CONVERSATION_LIST_HTTP_FIELD_MAP,
} from "./ConversationAdapterTypes";

// ─── URL / Path builders ────────────────────────────────────────

function normalizeFilterValue(
  value: string | null | undefined,
): string | undefined {
  if (value == null) return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/**
 * 将列表筛选参数转换为 URLSearchParams，空值自动省略。
 *
 * @param params - 会话列表查询参数
 * @returns 序列化后的 URLSearchParams
 */
export function buildConversationListSearchParams(
  params: ConversationListParams,
): URLSearchParams {
  const sp = new URLSearchParams();

  for (const key of CONVERSATION_LIST_PARAM_KEYS) {
    const raw = params[key];
    if (raw === undefined || raw === null) continue;

    const httpKey = CONVERSATION_LIST_HTTP_FIELD_MAP[key] ?? key;

    if (typeof raw === "boolean") {
      if (raw) sp.set(httpKey, "true");
    } else if (typeof raw === "number") {
      if (raw > 0) sp.set(httpKey, String(raw));
    } else {
      const normalized = normalizeFilterValue(raw);
      if (normalized) sp.set(httpKey, normalized);
    }
  }

  return sp;
}

/**
 * 构造会话详情 REST 路径。
 *
 * @param apiPath - API 基路径
 * @param conversationId - 会话 ID
 * @returns 完整路径
 */
export function buildConversationDetailPath(
  apiPath: string,
  conversationId: string,
): string {
  return `${apiPath}/${encodeURIComponent(conversationId)}`;
}

/**
 * 构造会话消息列表路径。
 *
 * @param apiPath - API 基路径
 * @param conversationId - 会话 ID
 * @returns 完整路径
 */
export function buildConversationMessagesPath(
  apiPath: string,
  conversationId: string,
): string {
  return `${apiPath}/${encodeURIComponent(conversationId)}/messages`;
}

/**
 * 构造指派路径。
 *
 * @param apiPath - API 基路径
 * @param conversationId - 会话 ID
 * @returns 完整路径
 */
export function buildConversationAssignPath(
  apiPath: string,
  conversationId: string,
): string {
  return `${apiPath}/${encodeURIComponent(conversationId)}/assign`;
}

/**
 * 构造关闭路径。
 *
 * @param apiPath - API 基路径
 * @param conversationId - 会话 ID
 * @returns 完整路径
 */
export function buildConversationClosePath(
  apiPath: string,
  conversationId: string,
): string {
  return `${apiPath}/${encodeURIComponent(conversationId)}/close`;
}

/**
 * 构造重开路径。
 *
 * @param apiPath - API 基路径
 * @param conversationId - 会话 ID
 * @returns 完整路径
 */
export function buildConversationReopenPath(
  apiPath: string,
  conversationId: string,
): string {
  return `${apiPath}/${encodeURIComponent(conversationId)}/reopen`;
}

/**
 * 构造翻译重试路径。
 *
 * @param apiPath - API 基路径
 * @param conversationId - 会话 ID
 * @param messageId - 消息 ID
 * @returns 完整路径
 */
export function buildRetryTranslationPath(
  apiPath: string,
  conversationId: string,
  messageId: string,
): string {
  return `${apiPath}/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/retry-translation`;
}

// ─── Payload builders ───────────────────────────────────────────

/**
 * 构造指派请求体。
 *
 * @param input - 指派输入
 * @returns 序列化后的请求体
 */
export function buildAssignPayload(
  input: ConversationAssignInput,
): Record<string, unknown> {
  return { ownerUserId: input.ownerUserId };
}

/**
 * 构造发送消息请求体。
 *
 * @param input - 发送消息输入
 * @returns 序列化后的请求体
 */
export function buildSendMessagePayload(
  input: ConversationSendMessageInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    content: input.content,
  };
  if (input.kind) payload.kind = input.kind;
  if (input.visibleScope) payload.visibleScope = input.visibleScope;
  if (input.forceOriginal) payload.forceOriginal = true;
  return payload;
}

/**
 * 构造翻译重试请求体（当前为空体）。
 *
 * @returns 空请求体
 */
export function buildRetryTranslationPayload(): Record<string, unknown> {
  return {};
}
