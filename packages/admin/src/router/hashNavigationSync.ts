/**
 * 用于对照 Hash history 与浏览器 `location.hash` 的小工具。
 */

/**
 * 去掉 `#` 后的片段，可与 Vue Router `fullPath` 比较；空则视为 `/`。
 *
 * @param loc - 浏览器地址栏片段（至少含 `hash`）。
 * @returns 与 `fullPath` 同形的字符串（含 query）。
 */
export function hashRouterFullPathFromLocation(
  loc: Pick<Location, "hash">,
): string {
  const raw = `${loc.hash}`.replace(/^#/, "");
  return raw === "" ? "/" : raw;
}

/**
 * 当地址栏 hash 与路由器当前 `fullPath` 不一致时返回 `true`（常见于懒加载 chunk 失败）。
 *
 * @param loc - 浏览器地址栏片段（至少含 `hash`）。
 * @param routerFullPath - Vue Router 当前记录的完整路径（等价于 `currentRoute.fullPath`，含 query）。
 * @returns 不一致时返回 `true`。
 */
export function hashNavigationDesyncedFromRouter(
  loc: Pick<Location, "hash">,
  routerFullPath: string,
): boolean {
  return hashRouterFullPathFromLocation(loc) !== routerFullPath;
}
