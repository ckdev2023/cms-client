// ─── Boundary (frozen by p0-fe-002a-03, p0-fe-002b-01, p0-fe-002c-03) ──
// This file owns Vue Router URL query parsing, serialization, and
// cross-module deep-link construction:
//   - parseCaseListQuery / buildCaseListQuery    → list page URL ↔ filter state
//   - parseCaseCreateQuery                       → create page URL → source context
//   - parseCaseDetailQuery / buildCaseDetailQuery → detail page URL ↔ tab state
//   - buildCaseDetailHref / buildCaseDetailRoute  → cross-module → case detail link
//   - buildCustomerDetailHref                     → case detail → customer back-link
//
// It does NOT own:
//   - HTTP URLSearchParams construction → CaseAdapterReaders.buildCaseListSearchParams
//   - REST path construction            → CaseAdapterReaders.buildCaseDetailPath
//   - HTTP request body construction    → CaseAdapterWriteBuilders.buildXxxPayload
//
// 与 CaseListParams 的关系：
//   CaseListQueryParams ⊇ CaseListFiltersState（含 `validation`、`customerId`）
//   CaseListParams ⊂ CaseListFiltersState（仅序列化到 HTTP 的字段，不含 `validation`）
//   parseCaseListQuery → 全部 UI 字段 → model composable
//   model composable → 剔除 validation → CaseListParams → HTTP
//
// Consumer flow:
//   route.query → query.ts → model composable → CaseRepository → CaseAdapterReaders / WriteBuilders → fetch

import type { LocationQuery } from "vue-router";
import type {
  CaseCreateSelectedRelation,
  CaseCreateSourceContext,
  CaseDetailTab,
  CaseListFiltersState,
  CaseRiskStatus,
  CaseScope,
  CaseStageId,
  CaseValidationStatus,
} from "./types";
import {
  CASE_DETAIL_TAB_KEYS,
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

function parseQueryList(value: LocationQuery[string]): string[] | undefined {
  const raw = firstString(value).trim();
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!items.length) return undefined;
  return Array.from(new Set(items));
}

function parseRecordString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  return normalized || undefined;
}

function parseRecordStringList(
  record: Record<string, unknown>,
  key: string,
): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function parseSelectedRelation(
  value: unknown,
): CaseCreateSelectedRelation | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const id = parseRecordString(record, "id");
  const name = parseRecordString(record, "name");
  const relationType = parseRecordString(record, "relationType");

  if (!id || !name || !relationType) return null;

  return {
    id,
    name,
    relationType,
    roleTitle: parseRecordString(record, "roleTitle"),
    phone: parseRecordString(record, "phone"),
    email: parseRecordString(record, "email"),
    tags: parseRecordStringList(record, "tags"),
    note: parseRecordString(record, "note"),
  };
}

function parseSelectedRelationsQuery(
  value: LocationQuery[string],
): CaseCreateSelectedRelation[] | undefined {
  const raw = firstString(value).trim();
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return undefined;
    const relations = parsed
      .map((item) => parseSelectedRelation(item))
      .filter((item): item is CaseCreateSelectedRelation => item !== null);
    return relations.length ? relations : undefined;
  } catch {
    return undefined;
  }
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
 * CaseListQueryParams = CaseListFiltersState + customerId。
 *
 * 所有 URL query 字段都会被 `parseCaseListQuery` 解析，
 * model composable 负责将 `validation` 保留为客户端过滤、
 * 其余字段经由 `CaseListParams` 流向 `buildCaseListSearchParams` 序列化到 HTTP。
 *
 * 字段归属：
 *  - 来自 CaseListFiltersState：scope, search, stage, owner, group, risk, validation
 *  - 扩展字段：customerId（customer 深链传入）
 */
export interface CaseListQueryParams extends CaseListFiltersState {
  /** 从客户页深链传入的客户 ID，用于预过滤。 */
  customerId?: string;
}

/**
 * Frozen key set for `CaseListQueryParams`。
 * 用于 contract tests 校验 URL query 字段集与下游 `CaseListParams` 的覆盖关系。
 */
export const CASE_LIST_QUERY_PARAM_KEYS = [
  "scope",
  "search",
  "stage",
  "owner",
  "group",
  "risk",
  "validation",
  "customerId",
] as const;

type _QueryParamKey = (typeof CASE_LIST_QUERY_PARAM_KEYS)[number];
type _NoExtraQueryKeys = Exclude<keyof CaseListQueryParams, _QueryParamKey>;
type _NoMissingQueryKeys = Exclude<_QueryParamKey, keyof CaseListQueryParams>;
type _AssertQueryKeySetMatch = [
  _NoExtraQueryKeys,
  _NoMissingQueryKeys,
] extends [never, never]
  ? true
  : "CaseListQueryParams keys do not match CASE_LIST_QUERY_PARAM_KEYS";
/** @internal 编译期断言——字段集不一致时编译失败 */
export const _ASSERT_QUERY_FROZEN_KEYS: _AssertQueryKeySetMatch = true;

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
    relationIds: parseQueryList(query.relationIds),
    selectedRelations: parseSelectedRelationsQuery(query.selectedRelations),
    familyBulkMode: hash === "#family-bulk",
  };
}

// ─── Detail Query (frozen by p0-fe-002c-03) ─────────────────────
// Detail 页的 URL query 只包含 `tab`。
// 当前阶段只稳定 tab 深链协议，不提前承诺 tabs 的最终字段全集。

/**
 * 案件详情页 URL query 参数。
 *
 * 当前只含 `tab`（可选），默认回退到 `overview`。
 * 后续如需 detail-level 过滤参数（如 log 筛选），在此接口扩展并同步更新冻结键集。
 */
export interface CaseDetailQueryParams {
  /** 激活的 tab 键名，来自 `CaseDetailTab`。 */
  tab?: CaseDetailTab;
}

/**
 * `CaseDetailQueryParams` 冻结键集——用于 contract tests 检测非协调变更。
 */
export const CASE_DETAIL_QUERY_PARAM_KEYS = ["tab"] as const;

type _DetailQueryParamKey = (typeof CASE_DETAIL_QUERY_PARAM_KEYS)[number];
type _NoExtraDetailKeys = Exclude<
  keyof CaseDetailQueryParams,
  _DetailQueryParamKey
>;
type _NoMissingDetailKeys = Exclude<
  _DetailQueryParamKey,
  keyof CaseDetailQueryParams
>;
type _AssertDetailKeySetMatch = [
  _NoExtraDetailKeys,
  _NoMissingDetailKeys,
] extends [never, never]
  ? true
  : "CaseDetailQueryParams keys do not match CASE_DETAIL_QUERY_PARAM_KEYS";
/** @internal 编译期断言——字段集不一致时编译失败 */
export const _ASSERT_DETAIL_QUERY_FROZEN_KEYS: _AssertDetailKeySetMatch = true;

function isValidDetailTab(v: string): v is CaseDetailTab {
  return (CASE_DETAIL_TAB_KEYS as readonly string[]).includes(v);
}

/**
 * 从 `route.query` 解析详情页 tab 参数。
 *
 * 非法 tab 值回退到 `undefined`（调用方应默认为 `overview`）。
 *
 * @param query - Vue Router 的 `route.query` 对象
 * @returns 类型安全的详情页查询参数
 */
export function parseCaseDetailQuery(
  query: LocationQuery,
): CaseDetailQueryParams {
  const tab = firstString(query.tab);
  return {
    tab: isValidDetailTab(tab) ? tab : undefined,
  };
}

/**
 * 将详情页 tab 参数序列化为 URL query 对象；省略默认 tab (overview) 以保持 URL 简洁。
 *
 * @param params - 当前详情页查询参数
 * @returns 可直接传入 `router.push({ query })` 的对象
 */
export function buildCaseDetailQuery(
  params: CaseDetailQueryParams,
): Record<string, string | undefined> {
  return {
    tab: params.tab && params.tab !== "overview" ? params.tab : undefined,
  };
}

// ─── Cross-Module Deep-Link Builders (frozen by p0-fe-002c-03) ──
// 供 documents / customers / dashboard / shared panels 构造指向
// `/cases/:id?tab=xxx` 的统一链接。
// 使用 hash-based 路径（与 createWebHashHistory 对齐）。

/**
 * 构造案件详情页的 hash href。
 *
 * @param caseId - 案件 ID
 * @param tab - 可选的目标 tab，省略或 `overview` 时不附加 query
 * @returns 可直接用于 `<a href>` 的 hash 路径
 */
export function buildCaseDetailHref(
  caseId: string,
  tab?: CaseDetailTab,
): string {
  const base = `#/cases/${encodeURIComponent(caseId)}`;
  if (tab && tab !== "overview") {
    return `${base}?tab=${tab}`;
  }
  return base;
}

/**
 * 构造案件详情页的 Vue Router location 对象。
 *
 * @param caseId - 案件 ID
 * @param tab - 可选的目标 tab
 * @returns 可直接传入 `router.push()` 的 location
 */
export function buildCaseDetailRoute(
  caseId: string,
  tab?: CaseDetailTab,
): { name: string; params: { id: string }; query?: Record<string, string> } {
  const route: {
    name: string;
    params: { id: string };
    query?: Record<string, string>;
  } = {
    name: "case-detail",
    params: { id: caseId },
  };
  if (tab && tab !== "overview") {
    route.query = { tab };
  }
  return route;
}

/**
 * 构造客户详情页的 hash href（案件详情 → 客户回链）。
 *
 * @param customerId - 客户 ID
 * @returns 可直接用于 `<a href>` 的 hash 路径；空 ID 返回客户列表
 */
export function buildCustomerDetailHref(customerId: string): string {
  if (!customerId) return "#/customers";
  return `#/customers/${encodeURIComponent(customerId)}`;
}
