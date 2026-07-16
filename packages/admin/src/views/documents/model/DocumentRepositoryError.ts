/**
 * 资料中心仓储错误 —— 错误码与错误类。
 *
 * 自 `DocumentRepositoryTypes.ts` 拆出：该文件名为 Types 却混着运行时代码
 * （本错误类与 4 个 DTO parser），是它超 max-lines 的实因。错误码与错误类
 * 内聚，故整体成文件；parser 归入既有的 `DocumentRepositoryDtos.ts`。
 */

/**
 * 资料中心仓储错误码。
 */
export type DocumentRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "CONFLICT"
  | "S9_READONLY"
  | "VALIDATION";

/**
 * 资料中心仓储错误。
 */
export class DocumentRepositoryError extends Error {
  /**
   *
   */
  readonly code: DocumentRepositoryErrorCode;
  /**
   *
   */
  readonly status?: number;
  /**
   *
   */
  readonly serverCode?: string;

  /**
   * 构造一个资料中心仓储错误。
   *
   * @param input - 错误描述
   * @param input.code - 业务错误码
   * @param input.message - 可读错误消息
   * @param input.status - HTTP 状态码（如有）
   * @param input.cause - 原始异常（如有）
   * @param input.serverCode - 后端错误码（如有）
   */
  constructor(input: {
    code: DocumentRepositoryErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
    serverCode?: string;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "DocumentRepositoryError";
    this.code = input.code;
    this.status = input.status;
    this.serverCode = input.serverCode;
  }
}
