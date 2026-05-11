/**
 * `createWebHashHistory` で動かすとき、開発サーバー等の SPA フォールバックにより
 * `pathname` が `/login` や `/cases` のように「ルート本体の外側」へ残り、真のページは `#` にだけある状態になる。
 * アドレスバー／自動化検査のために、`pathname` が Vite `BASE_URL` と整合しないときは正規形へそろえる。
 *
 * `./` のような埋め込み相対ベースでは pathname モデルが揺れるため変更しない。
 *
 * @param loc - `window.location` 互換オブジェクト。
 * @param viteBaseUrl - `import.meta.env.BASE_URL`
 * @returns 代替 `href`、正規化不要なら `null`
 */
export function resolveDetachedHashBasenameHref(
  loc: Pick<Location, "origin" | "pathname" | "hash" | "search">,
  viteBaseUrl: string,
): string | null {
  const hash = loc.hash;
  if (!hash.startsWith("#/")) {
    return null;
  }

  const rawBase = `${viteBaseUrl}`.trim();
  if (rawBase.startsWith(".")) {
    return null;
  }

  const stripEdges = rawBase.replace(/^\/+|\/+$/g, "");
  const logicalBasePathname =
    stripEdges === ""
      ? "/"
      : `/${stripEdges.split("/").filter(Boolean).join("/")}/`;

  const expected = new Set<string>();
  if (logicalBasePathname === "/") {
    expected.add("/");
    expected.add("");
  } else {
    const noTrail = logicalBasePathname.replace(/\/+$/, "");
    expected.add(logicalBasePathname);
    expected.add(noTrail);
  }

  const pathname = loc.pathname;
  if (expected.has(pathname)) {
    return null;
  }

  const currentHref = `${loc.origin}${pathname}${loc.search}${hash}`;
  const u = new URL(currentHref);
  u.pathname = logicalBasePathname === "/" ? "/" : logicalBasePathname;
  u.hash = hash;
  u.search = loc.search;
  return u.toString();
}
