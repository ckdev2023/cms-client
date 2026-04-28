import type { Router, RouteLocationNormalizedLoaded } from "vue-router";

/**
 * 当路由包含新建线索弹窗入口时，打开弹窗并清理 `action=new` 标记。
 *
 * @param route - 当前路由
 * @param router - 页面路由实例
 * @param openModal - 打开新建线索弹窗的回调
 */
export function syncLeadCreateEntryFromRoute(
  route: Pick<RouteLocationNormalizedLoaded, "path" | "query">,
  router: Pick<Router, "replace">,
  openModal: () => void,
): void {
  if (route.query.action !== "new") return;
  openModal();
  void router.replace({
    path: route.path,
    query: {
      ...route.query,
      action: undefined,
    },
  });
}
