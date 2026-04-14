import type { LocationQuery } from "vue-router";
import type {
  CaseCreateSourceContext,
  CaseListFiltersState,
  CaseRiskStatus,
  CaseScope,
  CaseStageId,
  CaseValidationStatus,
} from "./types";
import {
  CASE_RISK_STATUSES,
  CASE_SCOPES,
  CASE_STAGE_IDS,
  CASE_VALIDATION_STATUSES,
  DEFAULT_CASE_LIST_FILTERS,
} from "./constants";

// ─── Internal Helpers ───────────────────────────────────────────

function firstString(value: LocationQuery[string]): string {
  return typeof value === "string" ? value : "";
}

function isValidScope(v: string): v is CaseScope {
  return (CASE_SCOPES as readonly string[]).includes(v);
}

function isValidStageId(v: string): v is CaseStageId {
  return (CASE_STAGE_IDS as readonly string[]).includes(v);
}

function isValidRisk(v: string): v is CaseRiskStatus {
  return (CASE_RISK_STATUSES as readonly string[]).includes(v);
}

function isValidValidation(v: string): v is CaseValidationStatus {
  return (CASE_VALIDATION_STATUSES as readonly string[]).includes(v);
}

// ─── List Query ─────────────────────────────────────────────────

/**
 *
 */
export interface CaseListQueryParams extends CaseListFiltersState {
  /** 从客户页深链传入的客户 ID，用于预过滤。 */
  customerId?: string;
}

/**
 * 从 `route.query` 解析列表页筛选参数，对非法值回退到默认值。
 *
 * @param query - Vue Router 的 `route.query` 对象
 * @returns 类型安全的筛选参数
 */
export function parseCaseListQuery(query: LocationQuery): CaseListQueryParams {
  const scope = firstString(query.scope);
  const stage = firstString(query.stage);
  const risk = firstString(query.risk);
  const validation = firstString(query.validation);

  return {
    scope: isValidScope(scope) ? scope : DEFAULT_CASE_LIST_FILTERS.scope,
    search: firstString(query.search),
    stage: isValidStageId(stage) ? stage : "",
    owner: firstString(query.owner),
    group: firstString(query.group),
    risk: isValidRisk(risk) ? risk : "",
    validation: isValidValidation(validation) ? validation : "",
    customerId: firstString(query.customerId) || undefined,
  };
}

/**
 * 将筛选状态序列化为 URL query 对象；省略与默认值相同的字段以保持 URL 简洁。
 *
 * @param params - 当前筛选状态
 * @returns 可直接传入 `router.push({ query })` 的对象
 */
export function buildCaseListQuery(
  params: CaseListQueryParams,
): Record<string, string | undefined> {
  return {
    scope:
      params.scope === DEFAULT_CASE_LIST_FILTERS.scope
        ? undefined
        : params.scope,
    search: params.search || undefined,
    stage: params.stage || undefined,
    owner: params.owner || undefined,
    group: params.group || undefined,
    risk: params.risk || undefined,
    validation: params.validation || undefined,
    customerId: params.customerId || undefined,
  };
}

// ─── Create Query ───────────────────────────────────────────────

/**
 * 从 `route.query` 与 `route.hash` 解析新建页来源上下文参数。
 *
 * @param query - Vue Router 的 `route.query` 对象
 * @param hash - Vue Router 的 `route.hash`（如 `#family-bulk`）
 * @returns 来源上下文参数
 */
export function parseCaseCreateQuery(
  query: LocationQuery,
  hash: string,
): CaseCreateSourceContext {
  return {
    sourceLeadId: firstString(query.sourceLeadId) || undefined,
    customerId: firstString(query.customerId) || undefined,
    familyBulkMode: hash === "#family-bulk",
  };
}
