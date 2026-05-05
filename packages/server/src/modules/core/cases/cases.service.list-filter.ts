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
  CaseVisibilityFilter,
} from "./cases.types";
import { isUuid } from "../tenancy/uuid";
import { resolveRequestedCaseStage } from "./cases.service.write-helpers";

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
 */
export function buildCaseListFilterPrefixed(
  input: CaseListInput,
  prefix: string,
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

  if (input.search) {
    params.push(`%${input.search}%`);
    const idx = `$${String(params.length)}`;
    where.push(`(${p}case_name ilike ${idx} or ${p}case_no ilike ${idx})`);
  }

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
