/* eslint-disable jsdoc/require-param-description, jsdoc/require-returns, jsdoc/require-description */
/**
 * 案件列表 SQL 过滤条件构建器。
 *
 * 拆分自 `cases.service.ts`，按 visibility / scope / 字段过滤展开，
 * 同时给 `list()`（无前缀）与 `listSummary()`（`cs.` 前缀 + JOIN）共用。
 */
import type {
  CaseListInput,
  CaseListScope,
  CaseRiskBucket,
  CaseVisibilityFilter,
} from "./cases.types";
import { isUuid } from "../tenancy/uuid";
import { customerNameExpr } from "../../../infra/db/customerNameExpr";
import { resolveRequestedCaseStage } from "./cases.service.write-helpers";
import { expandCaseListSearchVariants } from "./cases.case-list-search-variants";

/** {@link buildCaseListFilterPrefixed} 可选项。 */
export type CaseListFilterOptions = {
  /**
   * 调用方在外层 SQL 中已 JOIN 的 customers 表别名。
   * 设置后 `search` 子句将额外匹配关联客户的展示名（含 jp/cn/en），
   * 与列表"申请人"列展示口径一致。
   */
  customerAlias?: string;
};

/**
 * 列表过滤条件构建器（提取以降低 list 方法复杂度）。
 * @param input
 */
export function buildCaseListFilter(input: CaseListInput): {
  whereClause: string;
  params: unknown[];
} {
  return buildCaseListFilterPrefixed(input, "");
}

function hasInvalidCaseListUuidFilter(input: CaseListInput): boolean {
  return [input.ownerUserId, input.customerId, input.groupId].some(
    (value) => typeof value === "string" && value.length > 0 && !isUuid(value),
  );
}

/**
 *
 * @param input
 * @param prefix
 * @param options
 */
export function buildCaseListFilterPrefixed(
  input: CaseListInput,
  prefix: string,
  options: CaseListFilterOptions = {},
): {
  whereClause: string;
  params: unknown[];
} {
  if (hasInvalidCaseListUuidFilter(input)) {
    return { whereClause: "where 1 = 0", params: [] };
  }

  const p = prefix;
  const where: string[] = [
    `coalesce(${p}metadata->>'_status', '') is distinct from 'deleted'`,
  ];
  const params: unknown[] = [];
  const requestedStage = resolveRequestedCaseStage(input);
  const filters: [string, string | undefined][] = [
    [`coalesce(${p}stage, ${p}status)`, requestedStage],
    [`${p}result_outcome`, input.resultOutcome],
    [`${p}owner_user_id`, input.ownerUserId],
    [`${p}customer_id`, input.customerId],
    [`${p}group_id`, input.groupId],
    [`${p}priority`, input.priority],
    [`${p}risk_level`, input.riskLevel],
    [`${p}company_id`, input.companyId],
    [`${p}business_phase`, input.phase],
  ];
  for (const [col, val] of filters) {
    if (val) {
      params.push(val);
      where.push(`${col} = $${String(params.length)}`);
    }
  }

  appendRiskBucketCondition(where, input.riskBucket, prefix);

  appendSearchCondition(where, params, input.search, prefix, options);

  if (input.visibility) {
    appendVisibilityConditionPrefixed(where, params, input.visibility, prefix);
    if (input.scope) {
      appendScopeConditionPrefixed(
        where,
        params,
        input.scope,
        input.visibility,
        prefix,
      );
    }
  }

  const whereClause = where.length > 0 ? `where ${where.join(" and ")}` : "";
  return { whereClause, params };
}

/**
 * 注入与 dashboard "风险案件" 同口径的并集风险条件，
 * 与 `riskLevel` 精确匹配正交：两者同时存在时按 AND 叠加。
 *
 * 实现说明：使用相关子查询取最新一条 validation_run 的 result_status，
 * 避免破坏外层 SQL 的 JOIN/参数计数策略。子查询不接收外部参数。
 *
 * @param where 累积的 where 子句数组（就地追加）
 * @param bucket 风险并集桶；为 undefined 时不附加任何子句
 * @param prefix cases 表别名前缀（list 路径为空，listSummary 为 `cs.`）
 */
function appendRiskBucketCondition(
  where: string[],
  bucket: CaseRiskBucket | undefined,
  prefix: string,
): void {
  if (!bucket) return;
  const p = prefix;
  const latestValidationFailedExpr = `(
    select vr.result_status
    from validation_runs vr
    where vr.case_id = ${p}id and vr.org_id = ${p}org_id
    order by vr.executed_at desc, vr.created_at desc
    limit 1
  ) = 'failed'`;
  switch (bucket) {
    case "high":
      where.push(`${p}risk_level = 'high'`);
      return;
    case "billing":
      where.push(`coalesce(${p}billing_unpaid_amount_cached::numeric, 0) > 0`);
      return;
    case "validation":
      where.push(latestValidationFailedExpr);
      return;
    case "any":
      where.push(
        `(${p}risk_level = 'high' or coalesce(${p}billing_unpaid_amount_cached::numeric, 0) > 0 or ${latestValidationFailedExpr})`,
      );
  }
}

function appendSearchCondition(
  where: string[],
  params: unknown[],
  search: string | undefined,
  prefix: string,
  options: CaseListFilterOptions,
): void {
  if (!search) return;

  const expanded = expandCaseListSearchVariants(search);
  const branches: string[] = [];

  for (const term of expanded) {
    params.push(`%${term}%`);
    const idx = `$${String(params.length)}`;
    const targets = [
      `${prefix}case_name ilike ${idx}`,
      `${prefix}case_no ilike ${idx}`,
    ];
    if (options.customerAlias) {
      targets.push(`${customerNameExpr(options.customerAlias)} ilike ${idx}`);
    }
    branches.push(`(${targets.join(" or ")})`);
  }

  where.push(`(${branches.join(" or ")})`);
}

function appendVisibilityConditionPrefixed(
  where: string[],
  params: unknown[],
  v: CaseVisibilityFilter,
  prefix: string,
): void {
  if (v.roleTier === "admin") return;

  const p = prefix;
  params.push(v.userId);
  const userParam = `$${String(params.length)}`;

  if (v.roleTier === "staff") {
    const conditions = [
      `${p}owner_user_id = ${userParam}`,
      `${p}assistant_user_id = ${userParam}`,
    ];
    if (v.groupId) {
      params.push(v.groupId);
      conditions.unshift(`${p}group_id = $${String(params.length)}`);
    }
    where.push(`(${conditions.join(" or ")})`);
    return;
  }

  where.push(
    `(${p}owner_user_id = ${userParam} or ${p}assistant_user_id = ${userParam})`,
  );
}

function appendScopeConditionPrefixed(
  where: string[],
  params: unknown[],
  scope: CaseListScope,
  visibility: CaseVisibilityFilter,
  prefix: string,
): void {
  if (scope === "all") return;

  const p = prefix;
  if (scope === "group") {
    if (!visibility.groupId) {
      where.push("1 = 0");
      return;
    }
    params.push(visibility.groupId);
    where.push(`${p}group_id = $${String(params.length)}`);
    return;
  }

  params.push(visibility.userId);
  const userParam = `$${String(params.length)}`;
  where.push(
    `(${p}owner_user_id = ${userParam} or ${p}assistant_user_id = ${userParam})`,
  );
}
