/**
 * 日志接口。
 *
 * 约束：
 * - 业务侧只依赖接口，不依赖具体实现
 * - 具体实现可在 infra 层替换为埋点/远程日志等
 */
export type Logger = {
  /**
   * 信息日志。
   *
   * @param message 日志消息
   * @param extra 附加字段
   */
  info(message: string, extra?: Record<string, unknown>): void;
  /**
   * 警告日志。
   *
   * @param message 日志消息
   * @param extra 附加字段
   */
  warn(message: string, extra?: Record<string, unknown>): void;
  /**
   * 错误日志。
   *
   * @param message 日志消息
   * @param extra 附加字段
   */
  error(message: string, extra?: Record<string, unknown>): void;
};
