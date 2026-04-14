/**
 * 沟通渠道类型。
 */
export type CommChannel = "wechat" | "phone" | "email" | "meeting" | "line";

/**
 * 沟通记录可见性范围。
 */
export type CommVisibility = "internal" | "customer";

/**
 * 沟通可见范围筛选。
 */
export type CommFilter = "all" | "internal" | "customer";

/**
 * 客户沟通记录。
 */
export interface CustomerComm {
  /**
   *
   */
  id: string;
  /**
   *
   */
  type: CommChannel;
  /**
   *
   */
  visibility: CommVisibility;
  /**
   *
   */
  occurredAt: string;
  /**
   *
   */
  actor: string;
  /**
   *
   */
  summary: string;
  /**
   *
   */
  detail: string;
  /**
   *
   */
  nextAction: string;
}

export const COMM_CHANNEL_OPTIONS: readonly {
  /**
   *
   */
  value: CommChannel;
  /**
   *
   */
  label: string;
}[] = [
  { value: "wechat", label: "WeChat" },
  { value: "phone", label: "电话" },
  { value: "email", label: "邮件" },
  { value: "meeting", label: "面谈" },
  { value: "line", label: "LINE" },
] as const;

/**
 * 根据渠道值获取中文标签。
 *
 * @param type 渠道类型值或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getCommChannelLabel(type: CommChannel | string): string {
  const found = COMM_CHANNEL_OPTIONS.find((opt) => opt.value === type);
  return found ? found.label : String(type || "—");
}

/**
 * 操作日志类型。
 */
export type LogType = "info" | "relation" | "case" | "comm";

/**
 * 操作日志筛选。
 */
export type LogFilter = "all" | LogType;

/**
 * 客户操作日志条目。
 */
export interface CustomerLog {
  /**
   *
   */
  id: string;
  /**
   *
   */
  type: LogType;
  /**
   *
   */
  actor: string;
  /**
   *
   */
  at: string;
  /**
   *
   */
  message: string;
}

export const LOG_TYPE_OPTIONS: readonly {
  /**
   *
   */
  value: LogFilter;
  /**
   *
   */
  label: string;
}[] = [
  { value: "all", label: "全部" },
  { value: "info", label: "信息变更" },
  { value: "relation", label: "关系变更" },
  { value: "case", label: "案件" },
  { value: "comm", label: "沟通" },
] as const;

/**
 * 根据日志类型值获取中文标签。
 *
 * @param type 日志类型值或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getLogTypeLabel(type: LogType | string): string {
  const found = LOG_TYPE_OPTIONS.find((opt) => opt.value === type);
  return found ? found.label : String(type || "—");
}
