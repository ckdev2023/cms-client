import { watch } from "vue";
import type { Router, RouteLocationNormalizedLoaded } from "vue-router";
import { i18n } from "./i18n";

const APP_TITLE = "Gyosei OS";

/**
 * 根据路由 meta 中的 titleKey 或 title 设置 document.title。
 *
 * @param route 当前路由对象，需包含 meta 信息
 */
export function applyDocumentTitle(
  route: Pick<RouteLocationNormalizedLoaded, "meta">,
): void {
  const titleKey =
    typeof route.meta.titleKey === "string" ? route.meta.titleKey : undefined;
  const translatedTitle = titleKey ? i18n.global.t(titleKey) : "";
  const routeTitle =
    typeof route.meta.title === "string"
      ? route.meta.title
      : translatedTitle && translatedTitle !== titleKey
        ? translatedTitle
        : "";

  document.title = routeTitle ? `${routeTitle} - ${APP_TITLE}` : APP_TITLE;
}

/**
 * 注册路由 afterEach 与 i18n locale watcher，使 document.title 在切换语言或导航时自动更新。
 *
 * @param router 应用路由实例
 */
export function setupTitleSync(router: Router): void {
  router.afterEach((to) => applyDocumentTitle(to));

  watch(
    () => i18n.global.locale.value,
    () => applyDocumentTitle(router.currentRoute.value),
  );
}
