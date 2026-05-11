import { ref, watch, type ComputedRef, type Ref } from "vue";
import type { LocationQuery } from "vue-router";
import { LEAD_DETAIL_TABS, type LeadDetailTab } from "../types";

/**
 * 从 Vue Router query 中解析线索详情 Tab 键名。
 *
 * @param query - 当前路由 query；可能为 undefined
 * @returns Tab 字符串；非字符串或未设置时返回空串
 */
function tabStrFromQuery(query: LocationQuery | undefined): string {
  const raw = query?.tab;
  return typeof raw === "string" ? raw : "";
}

/**
 * 与 URL `tab` 查询同步的线索详情 Tab 状态。
 *
 * @param routeQuery - 路由 query 响应式对象；缺省时固定为「基础信息」
 * @returns 当前激活 Tab 的 ref
 */
export function createLeadDetailActiveTab(
  routeQuery?: Ref<LocationQuery> | ComputedRef<LocationQuery>,
): Ref<LeadDetailTab> {
  const initial = tabStrFromQuery(routeQuery?.value);
  const activeTab = ref<LeadDetailTab>(
    (LEAD_DETAIL_TABS as readonly string[]).includes(initial)
      ? (initial as LeadDetailTab)
      : "info",
  );

  watch(
    () => tabStrFromQuery(routeQuery?.value),
    (tabStr) => {
      if ((LEAD_DETAIL_TABS as readonly string[]).includes(tabStr)) {
        activeTab.value = tabStr as LeadDetailTab;
      }
    },
  );

  return activeTab;
}
