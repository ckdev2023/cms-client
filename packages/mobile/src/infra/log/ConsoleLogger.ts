import type { Logger } from "./Logger";

/**
 * 基于 console 的 Logger 实现。
 *
 * 说明：
 * - 作为默认实现用于开发态
 * - 线上可替换为更强的日志/监控实现（保持接口不变）
 */
export class ConsoleLogger implements Logger {
  /**
   * 输出 info 日志。
   *
   * @param message 日志消息
   * @param extra 附加字段
   */
  info(message: string, extra?: Record<string, unknown>) {
    if (extra == null) {
      console.log(message);
      return;
    }
    console.log(message, extra);
  }

  /**
   * 输出 warn 日志。
   *
   * @param message 日志消息
   * @param extra 附加字段
   */
  warn(message: string, extra?: Record<string, unknown>) {
    if (extra == null) {
      console.warn(message);
      return;
    }
    console.warn(message, extra);
  }

  /**
   * 输出 error 日志。
   *
   * @param message 日志消息
   * @param extra 附加字段
   */
  error(message: string, extra?: Record<string, unknown>) {
    if (extra == null) {
      console.error(message);
      return;
    }
    console.error(message, extra);
  }
}
