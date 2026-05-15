/**
 * 构造客户详情页的 hash href（案件详情 → 客户回链）。
 *
 * @param customerId - 客户 ID
 * @param tab - 可选的目标 tab（如 `"cases"`），省略或 `"basic"` 时不附加 query
 * @returns 可直接用于 `<a href>` 的 hash 路径；空 ID 返回客户列表
 */
export function buildCustomerDetailHref(
  customerId: string,
  tab?: string,
): string {
  if (!customerId) return "#/customers";
  const base = `#/customers/${encodeURIComponent(customerId)}`;
  if (tab && tab !== "basic") {
    return `${base}?tab=${tab}`;
  }
  return base;
}

/**
 * 案件详情上下文下的客户详情 href：屏蔽「deepLink.customerId 误写成案件 UUID」时的假回链，
 * 避免 `#/customers/:caseId` → `GET /api/customers/:caseId` 400。
 *
 * @param customerId — 后端 deepLink.customerId（或等价字段）
 * @param caseEntityId — 当前案件聚合里的案件主键 `detail.id`
 * @param tab — 可选目标客户详情 tab（与 {@link buildCustomerDetailHref} 相同语义）
 * @returns 安全 href；误链时回退到客户列表
 */
export function buildCustomerDetailHrefFromCase(
  customerId: string,
  caseEntityId: string,
  tab?: string,
): string {
  const cid = customerId.trim();
  const casePk = caseEntityId.trim();
  if (!cid || (casePk && cid === casePk)) {
    return buildCustomerDetailHref("", tab);
  }
  return buildCustomerDetailHref(cid, tab);
}
