/**
 * 消息实体（含多语翻译信息）。
 */
export type Message = {
  /** 消息 ID。 */
  id: string;
  /** 发送者类型。 */
  senderType: "app_user" | "staff";
  /** 原文。 */
  originalText: string;
  /** 原文语言。 */
  originalLanguage: string;
  /** 翻译文本（按用户偏好语言选择对应译文，如无则 null）。 */
  translatedText: string | null;
  /** 翻译状态。 */
  translationStatus: string;
  /** 创建时间。 */
  createdAt: string;
};

/**
 * 根据用户偏好语言选择展示文本。
 *
 * @param message 消息
 * @param preferredLang 偏好语言
 * @returns 展示文本
 */
export function getDisplayText(
  message: Message,
  preferredLang: string,
): string {
  if (message.originalLanguage === preferredLang) return message.originalText;
  return message.translatedText ?? message.originalText;
}
