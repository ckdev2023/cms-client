// ─── Boundary (frozen by p0-fe-002a-03, p0-fe-002b-01, p0-fe-002c-03, p0-fe-010-01) ──
// This file owns Vue Router URL query parsing, serialization, and
// cross-module deep-link construction for list / detail pages:
//   - parseCaseListQuery / buildCaseListQuery    → list page URL ↔ filter state
//   - parseCaseDetailQuery / buildCaseDetailQuery → detail page URL ↔ tab state
//   - buildCaseDetailHref / buildCaseDetailRoute  → cross-module → case detail link
//   - buildCustomerDetailHref                     → case detail → customer back-link
//
// Create query functions live in query-create.ts (extracted by p0-fe-010-01)
// and are re-exported here for backward compatibility:
//   - parseCaseCreateQuery / buildCaseCreateQuery / buildCaseCreateRoute / buildCaseCreateHref
//
// It does NOT own:
//   - HTTP URLSearchParams construction → CaseAdapterReaders.buildCaseListSearchParams
//   - REST path construction            → CaseAdapterReaders.buildCaseDetailPath
//   - HTTP request body construction    → CaseAdapterWriteBuilders.buildXxxPayload
//
// Consumer flow:
//   route.query → query.ts → model composable → CaseRepository → CaseAdapterReaders / WriteBuilders → fetch

import type { LocationQuery } from "vue-router";
import type {
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

export type { CaseCreateQueryParams } from "./query-create";
export {
  CASE_CREATE_QUERY_PARAM_KEYS,
  _ASSERT_CREATE_QUERY_FROZEN_KEYS,
  FAMILY_BULK_ENTRY_CONTRACT,
  BMV_ENTRY_CONTRACT,
  SELECTED_RELATION_REQUIRED_FIELDS,
  parseCaseCreateQuery,
  buildCaseCreateQuery,
  buildCaseCreateRoute,
  buildCaseCreateHref,
} from "./query-create";

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

/**
 * 默认 tab——`parseCaseDetailQuery` 返回 `undefined` 时，
 * 消费方（`resolveDetailTab` / `useCaseDetailModel`）统一回退到此值。
 *
 * 与 `CASE_DETAIL_NAV_PROTOCOL.defaultTab` 保持一致；
 * 变更时须同步更新 `CaseAdapterDetailContracts` 与 contract tests。
 */
export const DEFAULT_CASE_DETAIL_TAB: CaseDetailTab = "overview";

/**
 * 判断字符串是否为合法的 `CaseDetailTab` 值。
 *
 * @param v - 待校验字符串
 * @returns 是否属于 `CASE_DETAIL_TAB_KEYS`
 */
export function isValidDetailTab(v: string): v is CaseDetailTab {
  return (CASE_DETAIL_TAB_KEYS as readonly string[]).includes(v);
}

/**
 * 将任意外部输入解析为合法 `CaseDetailTab`，非法值回退到 `DEFAULT_CASE_DETAIL_TAB`。
 *
 * 回退规则（按优先级）：
 *   1. `raw` 为 `string` 且属于 `CASE_DETAIL_TAB_KEYS` → 原值返回
 *   2. 其他情况（`null` / `undefined` / 空串 / 非法值）→ `DEFAULT_CASE_DETAIL_TAB`
 *
 * @param raw - 来自 `route.query.tab`、URL hash 或 model deps 的原始值
 * @returns 类型安全的 tab 键名
 */
export function resolveDetailTab(
  raw: string | null | undefined,
): CaseDetailTab {
  if (typeof raw === "string" && isValidDetailTab(raw)) return raw;
  return DEFAULT_CASE_DETAIL_TAB;
}

/**
 * 从 `route.query` 解析详情页 tab 参数。
 *
 * 非法 tab 值回退到 `undefined`（调用方应使用 `resolveDetailTab` 或默认为 `overview`）。
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
 * 将详情页 tab 参数序列化为 URL query 对象；
 * 省略默认 tab (`DEFAULT_CASE_DETAIL_TAB`) 以保持 URL 简洁。
 *
 * @param params - 当前详情页查询参数
 * @returns 可直接传入 `router.push({ query })` 的对象
 */
export function buildCaseDetailQuery(
  params: CaseDetailQueryParams,
): Record<string, string | undefined> {
  return {
    tab:
      params.tab && params.tab !== DEFAULT_CASE_DETAIL_TAB
        ? params.tab
        : undefined,
  };
}

// ─── Cross-Module Deep-Link Builders (frozen by p0-fe-002c-03, p0-fe-012-01) ──
// 供 documents / customers / dashboard / shared panels 构造指向
// `/cases/:id?tab=xxx` 与 `/cases?customerId=xxx` 的统一链接。
// 使用 hash-based 路径（与 createWebHashHistory 对齐）。
//
// 变更规则（p0-fe-012-01）：
//   - 新增 builder 须同步更新 CASE_CROSS_MODULE_LINK_CONTRACT
//   - 新增跨模块调用点须登记到 contract.consumers 对应条目
//   - 变更 route name / path / query key 须同步更新全部 consumers 与 contract tests

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
 * 构造案件列表页的 hash href（跨模块入口：customer → case list）。
 *
 * @param params - 可选的列表页过滤参数（通常只传 `customerId`）
 * @returns 可直接用于 `<a href>` 的 hash 路径
 */
export function buildCaseListHref(
  params?: Pick<CaseListQueryParams, "customerId">,
): string {
  const base = "#/cases";
  if (params?.customerId) {
    return `${base}?customerId=${encodeURIComponent(params.customerId)}`;
  }
  return base;
}

/**
 * 构造案件列表页的 Vue Router location 对象。
 *
 * @param params - 可选的列表页过滤参数
 * @returns 可直接传入 `router.push()` 的 location
 */
export function buildCaseListRoute(
  params?: Pick<CaseListQueryParams, "customerId">,
): { name: string; query?: Record<string, string> } {
  const route: { name: string; query?: Record<string, string> } = {
    name: "cases",
  };
  if (params?.customerId) {
    route.query = { customerId: params.customerId };
  }
  return route;
}

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

// ─── Cross-Module Link Contract (frozen by p0-fe-012-01) ─────────
// 冻结 customers / documents / dashboard / shared panels 指向
// cases 的链接生成规则。
//
// 每个 consumer 条目说明：
//   - builder：应当使用的 link builder 函数名
//   - scenario：使用场景（href / router.push / API-driven）
//   - tab：固定 tab 值（若适用）
//
// 变更此 contract 需同步更新：
//   - query.cross-module-link-contract.test.ts
//   - 对应 consumer .vue / .ts 文件中的 builder 调用

export const CASE_CROSS_MODULE_LINK_CONTRACT = {
  routeNames: {
    caseList: "cases",
    caseDetail: "case-detail",
    caseCreate: "case-create",
  },
  pathPatterns: {
    caseList: "/cases",
    caseDetail: "/cases/:id",
    caseCreate: "/cases/create",
  },
  tabQueryKey: "tab",
  defaultTab: "overview",
  consumers: {
    documentTableRow: {
      builder: "buildCaseDetailHref",
      scenario: "href",
      tab: "documents" as CaseDetailTab,
      description: "资料表格行 → 案件详情 documents tab",
    },
    sharedExpiryRiskPanel: {
      builder: "buildCaseDetailHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "共享过期风险面板 → 案件详情 overview（默认 tab）",
    },
    customerCasesTab: {
      builder: "buildCaseDetailRoute",
      scenario: "router.push",
      tab: undefined as CaseDetailTab | undefined,
      description: "客户关联案件 Tab → 案件详情 overview",
    },
    customerTableRow: {
      builder: "buildCaseListHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "客户表格行 → 案件列表（customerId 预过滤）",
    },
    customerTableRowCreate: {
      builder: "buildCaseCreateHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "客户表格行 → 案件新建（customerId 预填）",
    },
    caseCreateSuccessRedirect: {
      builder: "buildCaseDetailRoute",
      scenario: "router.push",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件创建成功 → 案件详情 overview",
    },
    caseCreateListNavigation: {
      builder: "buildCaseListRoute",
      scenario: "router.push",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件新建页 → 返回案件列表（可带 customerId）",
    },
    caseTableRow: {
      builder: "buildCaseDetailHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件列表行 → 案件详情 overview",
    },
    caseListCreateButton: {
      builder: "buildCaseCreateRoute",
      scenario: "router.push",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件列表页新建按钮 → 案件新建",
    },
    caseDetailBreadcrumb: {
      builder: "buildCaseListHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件详情页面包屑 → 案件列表",
    },
    caseDetailNotFoundBackLink: {
      builder: "buildCaseListHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件详情 404 回链 → 案件列表",
    },
    caseCreateBreadcrumb: {
      builder: "buildCaseListHref",
      scenario: "href",
      tab: undefined as CaseDetailTab | undefined,
      description: "案件新建页面包屑 → 案件列表",
    },
    dashboardWorkPanel: {
      builder: "API-driven",
      scenario: "item.route",
      tab: undefined as CaseDetailTab | undefined,
      description: "仪表盘工作面板由 API 返回 route，不硬编码",
    },
    dashboardQuickActionCreateCase: {
      builder: "CASE_CROSS_MODULE_LINK_CONTRACT.pathPatterns.caseCreate",
      scenario: "router.push",
      tab: undefined as CaseDetailTab | undefined,
      description: "仪表盘快捷操作 → 案件新建页",
    },
  },
} as const;
