/**
 * 会话摘要。
 */
export type ConversationSummary = {
  /** 会话 ID。 */
  id: string;
  /** 频道。 */
  channel: string;
  /** 偏好语言。 */
  preferredLanguage: string;
  /** 状态。 */
  status: string;
  /** 创建时间。 */
  createdAt: string;
};
