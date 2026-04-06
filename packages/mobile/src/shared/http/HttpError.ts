/**
 * HTTP 错误原因枚举。
 */
export type HttpErrorReason =
  | "NETWORK"
  | "TIMEOUT"
  | "BAD_STATUS"
  | "INVALID_JSON"
  | "UNKNOWN";

/**
 * HTTP 统一错误类型。
 *
 * 说明：
 * - infra 层 HttpClient 抛出该错误
 * - shared 层负责在不同层之间传递统一错误形态
 */
export class HttpError extends Error {
  /**
   * 错误原因。
   */
  readonly reason: HttpErrorReason;
  /**
   * HTTP 状态码（可选）。
   */
  readonly status?: number;
  /**
   * 请求 URL（可选）。
   */
  readonly url?: string;

  /**
   * 创建 HttpError。
   *
   * @param params 参数
   * @param params.reason 错误原因
   * @param params.message 错误描述
   * @param params.status 状态码
   * @param params.url 请求 URL
   */
  constructor(params: {
    reason: HttpErrorReason;
    message: string;
    status?: number;
    url?: string;
  }) {
    super(params.message);
    this.name = "HttpError";
    this.reason = params.reason;
    this.status = params.status;
    this.url = params.url;
  }
}
