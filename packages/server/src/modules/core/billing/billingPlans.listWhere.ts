import type { BillingPlanStatus } from "../model/billingEntities";

/**
 * 列表筛选：与分页参数分离，供 buildWhere 与单测复用。
 */
export type BillingPlanListFilters = {
  caseId?: string;
  status?: BillingPlanStatus;
  groupId?: string;
  ownerId?: string;
  q?: string;
};

/**
 * 构造 billing plan 列表 count/list 共用 WHERE 子句与参数序列。
 *
 * @param orgId - 租户 org id
 * @param input - 筛选条件（不含 page/limit）
 * @returns SQL WHERE 片段与占位参数数组
 */
export function buildBillingPlanListWhere(
  orgId: string,
  input: BillingPlanListFilters,
): { whereClause: string; params: unknown[] } {
  const w: string[] = [];
  const p: unknown[] = [];
  const eq = (col: string, val: unknown) => {
    p.push(val);
    w.push(`${col} = $${String(p.length)}`);
  };
  eq("br.org_id", orgId);
  if (input.caseId) eq("br.case_id", input.caseId);
  if (input.status) eq("br.status", input.status);
  if (input.groupId) eq("c.group_id", input.groupId);
  if (input.ownerId) eq("c.owner_user_id", input.ownerId);
  if (input.q) {
    p.push(input.q);
    const qi = `$${String(p.length)}`;
    const like = (col: string) =>
      `lower(${col}) like '%' || lower(${qi}) || '%'`;
    w.push(
      `(${[
        like("c.case_no"),
        like("c.case_name"),
        like("cu.base_profile->>'displayName'"),
        like("br.milestone_name"),
        `lower(c.id::text) = lower(${qi})`,
      ].join(" or ")})`,
    );
  }
  return { whereClause: `where ${w.join(" and ")}`, params: p };
}
