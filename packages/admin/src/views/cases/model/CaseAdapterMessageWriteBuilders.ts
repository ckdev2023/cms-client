/**
 * 沟通记录写入请求体构造器 — UI 消息类型 → server channelType + visibleToClient 映射。
 *
 * UI 4 种选项对应 server `channelType`（phone/email/meeting/line/wechat/other）
 * 和 `visibleToClient` 的组合。后续若产品扩展 line/wechat/email 仅需在此处追加。
 */

/**
 *
 */
export type MessageChannelChoice =
  | "internal"
  | "client_visible"
  | "phone"
  | "meeting";

/**
 *
 */
export interface CommunicationLogCreateInput {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  channelChoice: MessageChannelChoice;
  /**
   *
   */
  content: string;
}

interface CommunicationLogPayload {
  caseId: string;
  channelType: string;
  visibleToClient: boolean;
  direction: string;
  contentSummary: string;
}

const CHANNEL_MAP: Record<
  MessageChannelChoice,
  { channelType: string; visibleToClient: boolean }
> = {
  internal: { channelType: "other", visibleToClient: false },
  client_visible: { channelType: "other", visibleToClient: true },
  phone: { channelType: "phone", visibleToClient: false },
  meeting: { channelType: "meeting", visibleToClient: false },
};

/**
 * 将 UI 层消息发布输入转换为 server `POST /communication-logs` 请求体。
 *
 * @param input - UI 层收集的发布参数
 * @returns 符合 server CreateCommunicationLogBody 的请求体
 */
export function buildCreateCommunicationLogPayload(
  input: CommunicationLogCreateInput,
): CommunicationLogPayload {
  const mapping = CHANNEL_MAP[input.channelChoice];
  return {
    caseId: input.caseId,
    channelType: mapping.channelType,
    visibleToClient: mapping.visibleToClient,
    direction: "outbound",
    contentSummary: input.content,
  };
}

/**
 * 构建 communication-logs POST URL。
 *
 * @param casesApiPath - cases API 基路径（如 `/api/cases`）
 * @returns POST URL，如 `/api/communication-logs`
 */
export function buildCommunicationLogsPostUrl(casesApiPath: string): string {
  return casesApiPath.replace(/\/cases\/?$/, "") + "/communication-logs";
}
