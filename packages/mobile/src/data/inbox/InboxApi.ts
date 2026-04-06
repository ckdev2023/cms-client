import type { HttpClient } from "@infra/http/HttpClient";
import type { ConversationSummary } from "@domain/inbox/Conversation";
import type { Message } from "@domain/inbox/Message";

type ConversationListResponse = {
  items: ConversationSummary[];
  total: number;
};

type ServerMessage = {
  id: string;
  conversationId: string;
  senderType: string;
  senderId: string;
  originalLanguage: string;
  originalText: string;
  translatedTextJa: string | null;
  translatedTextZh: string | null;
  translatedTextEn: string | null;
  translationStatus: string;
  createdAt: string;
};

type MessageListResponse = { items: ServerMessage[]; total: number };

function pickTranslation(
  msg: ServerMessage,
  preferredLang: string,
): string | null {
  if (preferredLang === "ja") return msg.translatedTextJa;
  if (preferredLang === "zh") return msg.translatedTextZh;
  if (preferredLang === "en") return msg.translatedTextEn;
  return null;
}

function toMessage(msg: ServerMessage, preferredLang: string): Message {
  return {
    id: msg.id,
    senderType: msg.senderType as "app_user" | "staff",
    originalText: msg.originalText,
    originalLanguage: msg.originalLanguage,
    translatedText: pickTranslation(msg, preferredLang),
    translationStatus: msg.translationStatus,
    createdAt: msg.createdAt,
  };
}

/**
 * 认证 Header 生成。
 *
 * @param getToken Token 获取函数
 * @returns Header 对象
 */
async function authHeaders(
  getToken: () => Promise<string | null>,
): Promise<Record<string, string>> {
  const t = await getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/** Inbox API 依赖。 */
type InboxApiDeps = {
  httpClient: HttpClient;
  baseUrl: string;
  getToken: () => Promise<string | null>;
  getPreferredLanguage: () => Promise<string>;
};

/**
 * 获取消息列表。
 *
 * @param deps API 依赖
 * @param conversationId 会话 ID
 * @returns 消息列表
 */
async function fetchMessages(
  deps: InboxApiDeps,
  conversationId: string,
): Promise<Message[]> {
  const [h, lang] = await Promise.all([
    authHeaders(deps.getToken),
    deps.getPreferredLanguage(),
  ]);
  const res = await deps.httpClient.requestJson<MessageListResponse>({
    url: `${deps.baseUrl}/messages?conversationId=${conversationId}`,
    method: "GET",
    headers: h,
  });
  return res.data.items.map((m) => toMessage(m, lang));
}

/**
 * 发送消息。
 *
 * @param deps API 依赖
 * @param conversationId 会话 ID
 * @param text 消息文本
 * @returns 发送的消息
 */
async function postMessage(
  deps: InboxApiDeps,
  conversationId: string,
  text: string,
): Promise<Message> {
  const [h, lang] = await Promise.all([
    authHeaders(deps.getToken),
    deps.getPreferredLanguage(),
  ]);
  const body = {
    conversationId,
    senderType: "app_user",
    senderId: "self",
    originalLanguage: lang,
    originalText: text,
  };
  const res = await deps.httpClient.requestJson<ServerMessage>({
    url: `${deps.baseUrl}/messages`,
    method: "POST",
    headers: h,
    body,
  });
  return toMessage(res.data, lang);
}

/**
 * Inbox API 层。
 *
 * @param deps 依赖集合
 * @param deps.httpClient HTTP 客户端
 * @param deps.baseUrl API 基础 URL
 * @param deps.getToken Token 获取函数
 * @param deps.getPreferredLanguage 偏好语言获取函数
 * @returns Inbox API 方法集
 */
export function createInboxApi(deps: InboxApiDeps) {
  return {
    /**
     * 获取会话列表。
     *
     * @returns 会话摘要列表
     */
    async listConversations(): Promise<ConversationSummary[]> {
      const h = await authHeaders(deps.getToken);
      const res = await deps.httpClient.requestJson<ConversationListResponse>({
        url: `${deps.baseUrl}/conversations`,
        method: "GET",
        headers: h,
      });
      return res.data.items;
    },
    getMessages: (id: string) => fetchMessages(deps, id),
    sendMessage: (id: string, text: string) => postMessage(deps, id, text),
  };
}
