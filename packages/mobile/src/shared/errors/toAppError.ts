import { HttpError } from "@shared/http/HttpError";

import { AppError } from "./AppError";

/**
 * 将未知异常转换为 AppError。
 *
 * 规则：
 * - 已是 AppError：原样返回
 * - HttpError：按 reason/status 映射为应用错误码
 * - 其他 Error/unknown：统一归类为 UNKNOWN
 *
 * @param e 原始异常
 * @returns 应用统一错误
 */
export function toAppError(e: unknown): AppError {
  if (e instanceof AppError) return e;
  if (e instanceof HttpError) return toAppErrorFromHttpError(e);
  if (e instanceof Error)
    return new AppError({ code: "UNKNOWN", message: e.message, cause: e });
  return new AppError({ code: "UNKNOWN", message: "Unknown error", cause: e });
}

/**
 * 将 HttpError 映射为 AppError。
 *
 * 设计要点：
 * - 将 infra 层错误收敛为应用统一错误码，便于 UI 展示与埋点归因
 *
 * @param e HTTP 错误
 * @returns 应用统一错误
 */
function toAppErrorFromHttpError(e: HttpError): AppError {
  if (e.reason === "NETWORK")
    return new AppError({ code: "NETWORK", message: e.message, cause: e });
  if (e.reason === "TIMEOUT")
    return new AppError({ code: "TIMEOUT", message: e.message, cause: e });
  if (e.reason === "BAD_STATUS") return toAppErrorFromStatus(e, e.status ?? 0);
  return new AppError({ code: "UNKNOWN", message: e.message, cause: e });
}

/**
 * 将 HTTP 状态码映射为业务可理解的错误码。
 *
 * @param e HTTP 错误
 * @param status 状态码
 * @returns 应用统一错误
 */
function toAppErrorFromStatus(e: HttpError, status: number): AppError {
  if (status === 400)
    return new AppError({ code: "BAD_REQUEST", message: e.message, cause: e });
  if (status === 401)
    return new AppError({ code: "UNAUTHORIZED", message: e.message, cause: e });
  if (status === 403)
    return new AppError({ code: "FORBIDDEN", message: e.message, cause: e });
  if (status === 404)
    return new AppError({ code: "NOT_FOUND", message: e.message, cause: e });
  if (status >= 500)
    return new AppError({ code: "SERVER", message: e.message, cause: e });
  return new AppError({ code: "UNKNOWN", message: e.message, cause: e });
}
