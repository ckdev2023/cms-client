import type {
  NavigationGuardReturn,
  RouteLocationNormalized,
} from "vue-router";
import { resolveAdminRedirectTarget } from "../auth/model/redirect";

/**
 * 根据目标路由和当前登录态，决定是否放行或重定向。
 *
 * @param to 目标路由快照
 * @param isAuthenticated 当前是否已登录
 * @param isAdmin 当前用户是否为管理员（仅在 `requiresAdmin` 路由上生效）
 * @returns 路由守卫结果
 */
export function resolveAdminAuthGuard(
  to: Pick<RouteLocationNormalized, "fullPath" | "meta" | "query">,
  isAuthenticated: boolean,
  isAdmin = false,
): NavigationGuardReturn {
  if (to.meta.requiresAuth && !isAuthenticated) {
    return {
      name: "login",
      query: { redirect: to.fullPath },
    };
  }

  if (to.meta.publicOnly && isAuthenticated) {
    return resolveAdminRedirectTarget(to.query.redirect);
  }

  if (to.meta.requiresAdmin && !isAdmin) {
    return { name: "dashboard" };
  }

  return true;
}
