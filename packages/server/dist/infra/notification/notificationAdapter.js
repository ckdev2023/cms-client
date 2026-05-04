/**
 * 通知发送适配器 — 统一抽象接口。
 *
 * 初始实现：所有 channel 均使用 console.info 占位，
 * 后续可替换为 SES / SendGrid / FCM / APNs / DB+WebSocket 等。
 */
/* ------------------------------------------------------------------ */
/*  Console 占位实现                                                    */
/* ------------------------------------------------------------------ */
function formatPayload(payload) {
  const parts = [
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
function createConsoleAdapter() {
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
export function createNotificationAdapter(config) {
  const provider = config.provider;
  switch (provider) {
    case "console":
      return createConsoleAdapter();
    default:
      throw new Error(`Unknown notification provider: ${provider}`);
  }
}
//# sourceMappingURL=notificationAdapter.js.map
