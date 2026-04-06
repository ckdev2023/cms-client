import type { ConversationSummary } from "./Conversation";
import type { Message } from "./Message";

/**
 * Inbox 领域仓库接口。
 */
export type InboxRepository = {
  /**
   * 获取会话列表。
   *
   * @returns 会话摘要列表
   */
  listConversations(): Promise<ConversationSummary[]>;

  /**
   * 获取指定会话的消息列表。
   *
   * @param conversationId 会话 ID
   * @returns 消息列表
   */
  getMessages(conversationId: string): Promise<Message[]>;

  /**
   * 发送消息。
   *
   * @param conversationId 会话 ID
   * @param text 消息文本
   * @returns 发送的消息
   */
  sendMessage(conversationId: string, text: string): Promise<Message>;
};
