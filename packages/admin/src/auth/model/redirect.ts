export const ADMIN_HOME_PATH = "/";
export const ADMIN_LOGIN_PATH = "/login";

/**
 * 规范化登录后的跳转目标，仅允许站内相对路径。
 *
 * @param raw 原始跳转参数
 * @returns 安全可用的后台跳转路径
 */
export function resolveAdminRedirectTarget(raw: unknown): string {
  if (typeof raw !== "string") return ADMIN_HOME_PATH;

  const normalized = raw.trim();
  if (
    normalized === "" ||
    !normalized.startsWith("/") ||
    normalized.startsWith("//") ||
    normalized === ADMIN_LOGIN_PATH
  ) {
    return ADMIN_HOME_PATH;
  }

  return normalized;
}
