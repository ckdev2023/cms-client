import type { Router } from "vue-router";
import {
  hashNavigationDesyncedFromRouter,
  hashRouterFullPathFromLocation,
} from "./hashNavigationSync";

const INSTALL_FLAG = "__cmsAdminHashHistorySync" as const;

/**
 * 安装 hash 路由与地址栏的补偿同步：当 `history.pushState`/`replaceState` 改变 hash 但未触发
 * `hashchange` 时，用 `location` 驱动一次 `router.replace`。
 *
 * 典型场景：Chrome DevTools MCP 的 `navigate_page` 会直接改 hash；Vue Router（`createWebHashHistory`）
 * 仅依赖 hashchange/popstate，会导致路由记录与 DOM 滞留旧页面。
 *
 * @param router - 已 `createRouter` 的后台路由器实例
 */
export function installHashHistoryBrowserSync(router: Router): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, unknown>;
  if (win[INSTALL_FLAG]) return;
  win[INSTALL_FLAG] = true;

  let syncing = false;

  function syncFromLocation(): void {
    if (syncing) return;
    if (
      !hashNavigationDesyncedFromRouter(
        window.location,
        router.currentRoute.value.fullPath,
      )
    ) {
      return;
    }
    const target = hashRouterFullPathFromLocation(window.location);
    syncing = true;
    void router.replace(target).finally(() => {
      syncing = false;
    });
  }

  window.addEventListener("hashchange", () => {
    queueMicrotask(syncFromLocation);
  });

  const patch = <K extends "pushState" | "replaceState">(method: K) => {
    const original = history[method].bind(history) as History[K];
    history[method] = ((...args: Parameters<History[K]>) => {
      (original as (...a: Parameters<History[K]>) => void)(...args);
      queueMicrotask(syncFromLocation);
    }) as History[K];
  };

  patch("pushState");
  patch("replaceState");
}
