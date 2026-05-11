import { watch, type ComputedRef, type Ref } from "vue";
import type { LocationQuery } from "vue-router";
import { LEAD_DETAIL_TABS } from "../types";

function tabStrFromQuery(query: LocationQuery | undefined): string {
  const raw = query?.tab;
  return typeof raw === "string" ? raw : "";
}

function isResumeConvertFlagActive(query: LocationQuery | undefined): boolean {
  const raw = query?.resumeConvert;
  if (raw === "1") return true;
  return Array.isArray(raw) && raw.includes("1");
}

/**
 * 将 URL 中不在白名单内的 `tab` 与当前展示面板对齐：`info` 对应移除 query；
 * 若存在 `resumeConvert=1`，则规范为 `tab=conversion` 以便恢复转案件弹窗。
 *
 * @param routeQuery - 线索详情路由 query
 * @param replaceQuery - 与 `LeadDetailView.replaceLeadDetailQuery` 同契合并入
 */
export function watchLeadDetailInvalidTabQuery(
  routeQuery: Ref<LocationQuery> | ComputedRef<LocationQuery> | undefined,
  replaceQuery?: (patch: Record<string, string | undefined>) => void,
): void {
  watch(
    () => routeQuery?.value,
    (query) => {
      if (!query) return;
      const tabStr = tabStrFromQuery(query);
      if (!tabStr || (LEAD_DETAIL_TABS as readonly string[]).includes(tabStr)) {
        return;
      }
      if (isResumeConvertFlagActive(query)) {
        replaceQuery?.({ tab: "conversion" });
      } else {
        replaceQuery?.({ tab: undefined });
      }
    },
    { flush: "post", deep: true, immediate: true },
  );
}
