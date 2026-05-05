/**
 *
 */
export type NotFoundReason =
  | "badRequest"
  | "forbidden"
  | "notFound"
  | "serverError"
  | null;

/**
 *
 * @param e
 */
/**
 * 从异常对象提取 HTTP 状态码（兼容 RepositoryError 等带 `status` 属性的错误）。
 *
 * @param e - 捕获的异常
 * @returns HTTP 状态码，或无法提取时返回 null
 */
export function extractErrorStatus(e: unknown): number | null {
  if (e && typeof e === "object" && "status" in e) {
    return (
      (
        e as {
          /**
           *
           */
          status?: number;
        }
      ).status ?? null
    );
  }
  return null;
}

/**
 *
 * @param loading
 * @param hasDetail
 * @param errorStatus
 */
/**
 * 根据加载状态和错误码推导"未找到"的具体原因分类。
 *
 * @param loading - 是否正在加载中
 * @param hasDetail - 是否已成功获取详情
 * @param errorStatus - 失败时的 HTTP 状态码
 * @returns 原因分类，加载中或有详情时返回 null
 */
export function deriveNotFoundReason(
  loading: boolean,
  hasDetail: boolean,
  errorStatus: number | null,
): NotFoundReason {
  if (loading || hasDetail) return null;
  if (errorStatus === 400 || errorStatus === 422) return "badRequest";
  if (errorStatus === 403) return "forbidden";
  if (errorStatus != null && errorStatus >= 500) return "serverError";
  return "notFound";
}
