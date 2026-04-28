// ─── Boundary (frozen by p0-fe-010-01, p0-fe-011-01) ────────────
// 案件新建页 URL query 解析、序列化与跨模块链接构造。
//
// Exports:
//   - CaseCreateQueryParams / CASE_CREATE_QUERY_PARAM_KEYS → 冻结键集
//   - parseCaseCreateQuery  → route.query + hash → CaseCreateSourceContext
//   - buildCaseCreateQuery  → CaseCreateQueryParams → URL query object
//   - buildCaseCreateRoute  → CaseCreateQueryParams → Vue Router location
//   - buildCaseCreateHref   → CaseCreateQueryParams → hash href string
//   - FAMILY_BULK_ENTRY_CONTRACT       → 家族批量入口最小字段集契约 (p0-fe-011-01)
//   - SELECTED_RELATION_REQUIRED_FIELDS → 关联人必填字段集 (p0-fe-011-01)
//
// Consumer flow:
//   CustomerDetailView / CustomerContactsTab
//     → buildCaseCreateRoute({ customerId }, familyBulk?)
//     → router.push(...)
//     → CaseCreateView.parseCaseCreateQuery(route.query, route.hash)
//     → useCreateCaseModel({ sourceContext })

import type { LocationQuery } from "vue-router";
import type {
  CaseCreateSelectedRelation,
  CaseCreateSourceContext,
  CaseTemplateId,
} from "./types";

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
  const kind = parseRecordString(record, "kind");
  if (!id || !name || !relationType) return null;
  return {
    id,
    name,
    relationType,
    kind: kind === "contact_person" ? "contact_person" : "customer",
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

const VALID_TEMPLATE_IDS: readonly string[] = [
  "family",
  "work",
  "bmv",
  "biz_mgmt_cert_4m",
  "biz_mgmt_cert_1y",
  "biz_mgmt_renewal",
  "eng_humanities_intl_cert",
  "eng_humanities_intl_renewal",
  "intra_company_transfer",
  "company_setup",
];

function isCaseTemplateId(value: string): value is CaseTemplateId {
  return VALID_TEMPLATE_IDS.includes(value);
}

function optionalString(query: LocationQuery, key: string): string | undefined {
  return firstString(query[key]) || undefined;
}

function optionalTemplateId(raw: string): CaseTemplateId | undefined {
  return raw && isCaseTemplateId(raw) ? raw : undefined;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value || undefined;
}

// ─── Create Query Params ────────────────────────────────────────

/**
 * 案件新建页 URL query 参数（不含 hash 中的 `#family-bulk`）。
 *
 * 字段归属：
 *  - `customerId`：从客户详情页"一键建案"入口传入
 *  - `sourceLeadId`：从 Lead 转化入口传入
 *  - `relationIds`：从客户关联人 Tab 批量建案入口传入（逗号分隔 ID）
 *  - `selectedRelations`：从客户关联人 Tab 批量建案入口传入（JSON 序列化关联人上下文）
 *  - `templateId`：单建案时显式指定的模板来源（例如 BMV 客户直达经营管理模板）
 *  - `customerName` / `customerKana` / `customerGroup` / `customerGroupLabel` / `customerContact`：
 *    客户详情页透传的客户默认值（p0-fe-010-02），确保 create form 在客户不在
 *    create customer list 中时仍可继承 group、标题派生与主申请人预选。
 *  - `bmvQuestionnaireStatus` / `bmvQuoteStatus` / `bmvSignStatus` / `bmvIntakeStatus`：
 *    BMV 客户详情页透传的四前提状态；当客户不在 create customer list 中时，
 *    仍可正确初始化 pre-sign gate（BUG-039）。
 *
 * `familyBulkMode` 由 `route.hash === "#family-bulk"` 决定，不序列化到 query。
 */
export interface CaseCreateQueryParams {
  /** 来源客户 ID——客户详情页"一键建案"入口传入。 */
  customerId?: string;
  /** 来源 Lead ID——Lead 转化入口传入。 */
  sourceLeadId?: string;
  /** 关联人 ID 列表（逗号分隔字符串）——批量建案入口传入。 */
  relationIds?: string;
  /** 关联人上下文（JSON 序列化字符串）——批量建案入口传入。 */
  selectedRelations?: string;
  /** 单建案时显式指定的模板 ID。 */
  templateId?: CaseTemplateId;
  /** BMV 等跨模块入口锁定的模板 code（readonly，不允许员工切换）。 */
  templateCode?: CaseTemplateId;
  /** 来源 Lead 的担当 ID——BMV 转案件时从 bmvProfile.leadOwnerUserId 透传，用于预填 owner。 */
  ownerUserId?: string;
  /** 客户显示名（p0-fe-010-02）。 */
  customerName?: string;
  /** 客户假名（p0-fe-010-02）。 */
  customerKana?: string;
  /** 客户所属分组 ID（p0-fe-010-02）。 */
  customerGroup?: string;
  /** 客户所属分组标签（p0-fe-010-02）。 */
  customerGroupLabel?: string;
  /** 客户联系方式（p0-fe-010-02）。 */
  customerContact?: string;
  /** BMV 问卷回收状态（bug-039）。 */
  bmvQuestionnaireStatus?: string;
  /** BMV 报价确认状态（bug-039）。 */
  bmvQuoteStatus?: string;
  /** BMV 签约状态（bug-039）。 */
  bmvSignStatus?: string;
  /** BMV 承接就绪状态（bug-039）。 */
  bmvIntakeStatus?: string;
}

/**
 * `CaseCreateQueryParams` 冻结键集——用于 contract tests 检测非协调变更。
 */
export const CASE_CREATE_QUERY_PARAM_KEYS = [
  "customerId",
  "sourceLeadId",
  "relationIds",
  "selectedRelations",
  "templateId",
  "templateCode",
  "ownerUserId",
  "customerName",
  "customerKana",
  "customerGroup",
  "customerGroupLabel",
  "customerContact",
  "bmvQuestionnaireStatus",
  "bmvQuoteStatus",
  "bmvSignStatus",
  "bmvIntakeStatus",
] as const;

type _CreateQueryParamKey = (typeof CASE_CREATE_QUERY_PARAM_KEYS)[number];
type _NoExtraCreateKeys = Exclude<
  keyof CaseCreateQueryParams,
  _CreateQueryParamKey
>;
type _NoMissingCreateKeys = Exclude<
  _CreateQueryParamKey,
  keyof CaseCreateQueryParams
>;
type _AssertCreateKeySetMatch = [
  _NoExtraCreateKeys,
  _NoMissingCreateKeys,
] extends [never, never]
  ? true
  : "CaseCreateQueryParams keys do not match CASE_CREATE_QUERY_PARAM_KEYS";
/** @internal 编译期断言——字段集不一致时编译失败 */
export const _ASSERT_CREATE_QUERY_FROZEN_KEYS: _AssertCreateKeySetMatch = true;

// ─── Parse / Serialize / Build ──────────────────────────────────

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
    sourceLeadId: optionalString(query, "sourceLeadId"),
    customerId: optionalString(query, "customerId"),
    relationIds: parseQueryList(query.relationIds),
    selectedRelations: parseSelectedRelationsQuery(query.selectedRelations),
    familyBulkMode: hash === "#family-bulk",
    templateId: optionalTemplateId(firstString(query.templateId)),
    templateCode: optionalTemplateId(firstString(query.templateCode)),
    ownerUserId: optionalString(query, "ownerUserId"),
    customerName: optionalString(query, "customerName"),
    customerKana: optionalString(query, "customerKana"),
    customerGroup: optionalString(query, "customerGroup"),
    customerGroupLabel: optionalString(query, "customerGroupLabel"),
    customerContact: optionalString(query, "customerContact"),
    bmvQuestionnaireStatus: optionalString(query, "bmvQuestionnaireStatus"),
    bmvQuoteStatus: optionalString(query, "bmvQuoteStatus"),
    bmvSignStatus: optionalString(query, "bmvSignStatus"),
    bmvIntakeStatus: optionalString(query, "bmvIntakeStatus"),
  };
}

/**
 * 将新建页来源上下文序列化为 URL query 对象；省略空字段以保持 URL 简洁。
 *
 * @param params - 新建页 query 参数
 * @returns 可直接传入 `router.push({ query })` 的对象
 */
export function buildCaseCreateQuery(
  params: CaseCreateQueryParams,
): Record<string, string | undefined> {
  return {
    customerId: emptyToUndefined(params.customerId),
    sourceLeadId: emptyToUndefined(params.sourceLeadId),
    relationIds: emptyToUndefined(params.relationIds),
    selectedRelations: emptyToUndefined(params.selectedRelations),
    templateId: emptyToUndefined(params.templateId),
    templateCode: emptyToUndefined(params.templateCode),
    ownerUserId: emptyToUndefined(params.ownerUserId),
    customerName: emptyToUndefined(params.customerName),
    customerKana: emptyToUndefined(params.customerKana),
    customerGroup: emptyToUndefined(params.customerGroup),
    customerGroupLabel: emptyToUndefined(params.customerGroupLabel),
    customerContact: emptyToUndefined(params.customerContact),
    bmvQuestionnaireStatus: emptyToUndefined(params.bmvQuestionnaireStatus),
    bmvQuoteStatus: emptyToUndefined(params.bmvQuoteStatus),
    bmvSignStatus: emptyToUndefined(params.bmvSignStatus),
    bmvIntakeStatus: emptyToUndefined(params.bmvIntakeStatus),
  };
}

/**
 * 构造案件新建页的 Vue Router location 对象。
 *
 * @param params - 新建页 query 参数
 * @param familyBulkMode - 是否为家族批量建案模式（序列化为 `#family-bulk` hash）
 * @returns 可直接传入 `router.push()` 的 location
 */
export function buildCaseCreateRoute(
  params: CaseCreateQueryParams,
  familyBulkMode?: boolean,
): {
  name: string;
  query?: Record<string, string | undefined>;
  hash?: string;
} {
  const query = buildCaseCreateQuery(params);
  const hasQuery = Object.values(query).some(Boolean);
  return {
    name: "case-create",
    ...(hasQuery ? { query } : {}),
    ...(familyBulkMode ? { hash: "#family-bulk" } : {}),
  };
}

/**
 * 构造案件新建页的 hash href。
 *
 * 与 `createWebHashHistory` 对齐：
 *   `#/cases/create?customerId=xxx#family-bulk`
 *
 * @param params - 新建页 query 参数
 * @param familyBulkMode - 是否为家族批量建案模式
 * @returns 可直接用于 `<a href>` 的 hash 路径
 */
export function buildCaseCreateHref(
  params: CaseCreateQueryParams,
  familyBulkMode?: boolean,
): string {
  const base = "#/cases/create";
  const query = buildCaseCreateQuery(params);
  const entries = Object.entries(query).filter(
    (pair): pair is [string, string] => !!pair[1],
  );
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
  const path = qs ? `${base}?${qs}` : base;
  return familyBulkMode ? `${path}#family-bulk` : path;
}

// ─── Family Bulk Entry Contract (p0-fe-011-01) ──────────────────
// 家族批量建案入口的 query/source context 契约。
//
// 必须字段：
//   - familyBulkMode: true（由 hash `#family-bulk` 激活）
//   - customerId：扶養者/保证人客户 ID（作为主客户继承 group 并成为 supporter）
//
// 推荐字段：
//   - customerName / customerGroup / customerGroupLabel：确保 create form
//     在客户不在 create customer list 中时仍可继承 group 与标题
//   - selectedRelations：预选的家族成员，省略时回退到 FAMILY_SCENARIO.defaultDraftParties
//
// 可选字段：
//   - relationIds：关联人 ID 列表（与 selectedRelations 冗余但保持兼容）
//   - customerKana / customerContact：完善合成客户信息
//
// 变更时须同步更新：
//   - query.tab-schema.test.ts（FAMILY_BULK_ENTRY_CONTRACT 冻结断言）
//   - CustomerCreateCaseEntryContract.test.ts（customer 侧 round-trip）
//   - CustomerCreateCaseEntryRegression.test.ts（customer → case create 回归）

/**
 * 家族批量建案入口的最小字段集——用于 contract tests 校验入口完整性。
 *
 * `requiredFields`：缺少时家族批量功能无法正常初始化。
 * `recommendedFields`：缺少时功能可降级但体验受损（group 回退默认、标题缺名字等）。
 * `optionalFields`：增强信息，省略不影响核心流程。
 */
export const FAMILY_BULK_ENTRY_CONTRACT = {
  /** 激活家族批量模式的 hash 标识。 */
  activationHash: "#family-bulk",
  /** 缺少时家族批量无法正常初始化的字段。 */
  requiredFields: ["customerId"] as readonly string[],
  /** 缺少时体验降级但核心流程仍可运行的字段。 */
  recommendedFields: [
    "customerName",
    "customerGroup",
    "customerGroupLabel",
    "selectedRelations",
  ] as readonly string[],
  /** 增强信息，省略不影响核心流程。 */
  optionalFields: [
    "relationIds",
    "customerKana",
    "customerContact",
    "sourceLeadId",
  ] as readonly string[],
  /** 家族批量模式强制选择的模板 ID。 */
  defaultTemplateId: "family" as const,
  /** 各缺失场景的降级行为描述。 */
  fallbackBehavior: {
    noSelectedRelations: "FAMILY_SCENARIO.defaultDraftParties",
    noCustomerName: "synthesizeCustomerFromSourceContext returns null",
    noCustomerGroup: "falls back to deps.defaultGroup",
  } as const,
} as const;

/**
 * CaseCreateSelectedRelation 的最小必填字段集（p0-fe-011-01）。
 * 每条关联人至少需要 `id`、`name`、`relationType` 三个字段才能被 parse 接受。
 */
export const SELECTED_RELATION_REQUIRED_FIELDS = [
  "id",
  "name",
  "relationType",
] as const;

// ─── BMV Entry Contract (G0) ────────────────────────────────────
// BMV 跨模块入口（Customer BMV 承接 → 案件新建）的 query/source context 契约。
//
// 必须字段：
//   - templateCode: 'bmv'（锁定模板，员工不可切换）
//   - customerId：BMV 客户 ID
//
// 推荐字段：
//   - sourceLeadId：来源 Lead（便于追溯与审计）
//   - customerName / customerGroup / customerGroupLabel：确保 create form
//     在客户不在 create customer list 中时仍可继承 group 与标题
//
// 可选字段：
//   - templateId：允许同时传入但 templateCode 优先级更高
//   - customerKana / customerContact：完善合成客户信息
//   - bmvQuestionnaireStatus / bmvQuoteStatus / bmvSignStatus /
//     bmvIntakeStatus：确保未知客户路径下 pre-sign gate 仍能读取真实状态
//
// 变更时须同步更新：
//   - query.bmv-entry-contract.test.ts（BMV_ENTRY_CONTRACT 冻结断言）

/**
 * BMV 跨模块入口的最小字段集——用于 contract tests 校验入口完整性。
 *
 * `requiredFields`：缺少时 BMV 入口无法正常初始化。
 * `recommendedFields`：缺少时功能可降级但体验受损。
 * `optionalFields`：增强信息，省略不影响核心流程。
 */
export const BMV_ENTRY_CONTRACT = {
  /** 锁定模板 code 值。 */
  lockedTemplateCode: "bmv" as const,
  /** 缺少时 BMV 入口无法正常初始化的字段。 */
  requiredFields: ["templateCode", "customerId"] as readonly string[],
  /** 缺少时体验降级但核心流程仍可运行的字段。 */
  recommendedFields: [
    "sourceLeadId",
    "ownerUserId",
    "customerName",
    "customerGroup",
    "customerGroupLabel",
  ] as readonly string[],
  /** 增强信息，省略不影响核心流程。 */
  optionalFields: [
    "templateId",
    "customerKana",
    "customerContact",
    "bmvQuestionnaireStatus",
    "bmvQuoteStatus",
    "bmvSignStatus",
    "bmvIntakeStatus",
  ] as readonly string[],
  /** templateCode 锁定时的 UI 行为。 */
  templateLockBehavior: {
    templateSelectorReadonly: true,
    lockedIndicatorVisible: true,
  } as const,
} as const;
