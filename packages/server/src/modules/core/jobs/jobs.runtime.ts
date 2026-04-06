/**
 * 计算下次重试延迟（毫秒）。
 *
 * @param attempt 当前执行次数（从 1 开始）
 * @returns 延迟毫秒数
 */
export function computeRetryDelayMs(attempt: number): number {
  const a = Math.max(1, Math.floor(attempt));
  if (a <= 1) return 1_000;
  if (a === 2) return 5_000;
  if (a === 3) return 15_000;
  if (a === 4) return 60_000;
  return 5 * 60_000;
}

/**
 * 判断是否还能重试。
 *
 * @param attempts 已执行次数（从 1 开始）
 * @param maxRetries 允许重试次数（不含首跑）
 * @returns 是否还能重试
 */
export function shouldRetry(attempts: number, maxRetries: number): boolean {
  const maxAttempts = Math.max(1, Math.floor(maxRetries) + 1);
  return Math.floor(attempts) < maxAttempts;
}

/**
 * 将未知异常序列化为可存储对象。
 *
 * @param e 异常
 * @returns 错误对象
 */
export function toJobError(e: unknown): Record<string, unknown> {
  if (e instanceof Error) {
    return {
      name: e.name,
      message: e.message,
      stack: e.stack ?? "",
    };
  }
  if (typeof e === "string") {
    return { name: "Error", message: e, stack: "" };
  }
  return { name: "Error", message: "Unknown error", stack: "" };
}
