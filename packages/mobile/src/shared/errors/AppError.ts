/**
 * 应用统一错误码。
 *
 * 说明：
 * - 用于在 UI 层展示、埋点归因与统一错误处理
 */
export type AppErrorCode =
  | "NETWORK"
  | "TIMEOUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "BAD_REQUEST"
  | "SERVER"
  | "UNKNOWN";

/**
 * 应用统一错误类型。
 *
 * 设计要点：
 * - code 用于可控分类（便于 UI/埋点处理）
 * - cause 保留原始异常，便于排查
 */
export class AppError extends Error {
  /**
   * 错误码。
   */
  readonly code: AppErrorCode;
  /**
   * 原始异常（可选）。
   */
  readonly cause?: unknown;

  /**
   * 创建 AppError。
   *
   * @param params 参数
   * @param params.code 错误码
   * @param params.message 错误描述
   * @param params.cause 原始异常
   */
  constructor(params: {
    code: AppErrorCode;
    message: string;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = "AppError";
    this.code = params.code;
    this.cause = params.cause;
  }
}
