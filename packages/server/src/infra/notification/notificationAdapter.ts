/**
 * 通知发送适配器 — 统一抽象接口。
 *
 * 初始实现：所有 channel 均使用 console.info 占位，
 * 后续可替换为 SES / SendGrid / FCM / APNs / DB+WebSocket 等。
 */

/* ------------------------------------------------------------------ */
/*  类型定义                                                           */
/* ------------------------------------------------------------------ */

/** 通知渠道类型。 */
export type NotificationChannel = "email" | "push" | "in_app";

/** 通知载荷。 */
export type NotificationPayload = {
  channel: NotificationChannel;
  /** email 地址 / userId / deviceToken */
  to: string;
  /** email 用 */
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
};

/** 通知适配器接口。 */
export type NotificationAdapter = {
  send(payload: NotificationPayload): Promise<void>;
};

/** 通知配置。 */
export type NotificationConfig = {
  /** 默认 "console"；后续可扩展 "smtp" 等 */
  provider: "console";
};

/* ------------------------------------------------------------------ */
/*  Console 占位实现                                                    */
/* ------------------------------------------------------------------ */

function formatPayload(payload: NotificationPayload): string {
  const parts: string[] = [
    `[Notification] channel=${payload.channel}`,
    `to=${payload.to}`,
  ];
  if (payload.subject) {
    parts.push(`subject=${payload.subject}`);
  }
  parts.push(`body=${payload.body}`);
  if (payload.metadata && Object.keys(payload.metadata).length > 0) {
    parts.push(`metadata=${JSON.stringify(payload.metadata)}`);
  }
  return parts.join(" | ");
}

function createConsoleAdapter(): NotificationAdapter {
  return {
    send(payload) {
      // eslint-disable-next-line no-console
      console.info(formatPayload(payload));
      return Promise.resolve();
    },
  };
}

/* ------------------------------------------------------------------ */
/*  工厂                                                               */
/* ------------------------------------------------------------------ */

/**
 * 根据配置创建通知适配器实例。
 *
 * @param config 通知配置
 * @returns 通知适配器
 */
export function createNotificationAdapter(
  config: NotificationConfig,
): NotificationAdapter {
  const provider: string = config.provider;
  switch (provider) {
    case "console":
      return createConsoleAdapter();
    default:
      throw new Error(`Unknown notification provider: ${provider}`);
  }
}
