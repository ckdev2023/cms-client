import type { CaseListItem, CaseSummaryCardData } from "../types";
export {
  type CaseDetailAggregate,
  type CaseDetailTabCounts,
  AGGREGATE_SLICE_KEYS,
  CASE_DETAIL_DEEP_LINK_FIELDS,
  CASE_DETAIL_NAV_PROTOCOL,
  CASE_DETAIL_TAB_COUNTS_KEYS,
  CASE_DETAIL_HEADER_FIELDS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS,
  CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS,
  BILLING_SLICE_CONSUMED_FIELDS,
  LATEST_VALIDATION_SLICE_CONSUMED_FIELDS,
  PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS,
} from "./CaseAdapterDetailContracts";

// ─── Boundary (frozen by p0-fe-002b-01) ─────────────────────────
// CaseListParams = 序列化到 URLSearchParams 的 HTTP 查询参数子集。
// 与 CaseListFiltersState（UI 全集）的差异：
//   - `validation` 仅客户端过滤，不在此接口中（服务端无此参数）。
//   - `scope` / `search` 当前序列化到 HTTP，服务端可选用。
//   - `view` 固定为 "summary"，由 buildCaseListSearchParams 硬编码。
// 字段名映射见 CASE_LIST_HTTP_FIELD_MAP 与 CaseAdapterReaders.buildCaseListSearchParams。

/**
 * 案件列表 HTTP 查询参数（不含 `validation` 等客户端专属过滤字段）。
 */
export interface CaseListParams {
  /** 可见范围（mine / group / all），序列化为 `scope`。 */
  scope?: string;
  /** 关键字搜索，序列化为 `search`。 */
  search?: string;
  /** 阶段过滤（S1-S9），序列化为 `stage`。 */
  stage?: string;
  /** 负责人过滤，序列化为 `ownerUserId`。 */
  owner?: string;
  /** 分组过滤，序列化为 `groupId`。 */
  group?: string;
  /** 风险等级过滤，序列化为 `riskLevel`。 */
  risk?: string;
  /** 客户 ID 过滤，列表页与 customer 下游共用。 */
  customerId?: string;
  /** 分页页码。 */
  page?: number;
  /** 每页条数。 */
  limit?: number;
}

// ─── Frozen Key Sets (p0-fe-002b-01) ────────────────────────────
// Any addition or removal from these sets requires coordinated updates
// across: query.ts, CaseAdapterReaders, CaseAdapterTypes, and
// downstream consumers (CustomerRepository.listRelatedCases).

/**
 * `CaseListParams` 的全部合法字段名——用于 contract tests 检测非协调变更。
 */
export const CASE_LIST_PARAM_KEYS = [
  "scope",
  "search",
  "stage",
  "owner",
  "group",
  "risk",
  "customerId",
  "page",
  "limit",
] as const;

/**
 * admin 参数名 → 服务端 HTTP query 参数名映射。
 *
 * `buildCaseListSearchParams` 必须严格按此映射序列化。
 * `view=summary` 为硬编码，不在此映射表中。
 */
export const CASE_LIST_HTTP_FIELD_MAP: Record<
  (typeof CASE_LIST_PARAM_KEYS)[number],
  string
> = {
  scope: "scope",
  search: "search",
  stage: "stage",
  owner: "ownerUserId",
  group: "groupId",
  risk: "riskLevel",
  customerId: "customerId",
  page: "page",
  limit: "limit",
} as const;

type _FrozenKey = (typeof CASE_LIST_PARAM_KEYS)[number];
type _NoExtraKeys = Exclude<keyof CaseListParams, _FrozenKey>;
type _NoMissingKeys = Exclude<_FrozenKey, keyof CaseListParams>;
type _AssertKeySetMatch = [_NoExtraKeys, _NoMissingKeys] extends [never, never]
  ? true
  : "CaseListParams keys do not match CASE_LIST_PARAM_KEYS — update both";
/** @internal 编译期断言——字段集不一致时编译失败 */
export const _ASSERT_FROZEN_KEYS: _AssertKeySetMatch = true;

/**
 * 案件列表接口返回结果（分页）。
 */
export interface CaseListResult {
  /** 当前页案件列表。 */
  items: CaseListItem[];
  /** 符合条件的总数。 */
  total: number;
  /** 当前页码。 */
  page: number;
  /** 每页条数。 */
  limit: number;
}

/**
 * 案件汇总视图结果：列表 + 汇总卡片。
 */
export interface CaseSummaryResult {
  /** 案件列表。 */
  items: CaseListItem[];
  /** 符合条件的总数。 */
  total: number;
  /** 汇总卡片（进行中 / 校验失败 / 即将到期 / 未收金额）。 */
  cards: CaseSummaryCardData[];
}

// ─── Customer Downstream Reuse Contract (frozen by p0-fe-002b-01 / -03 / -07) ─
// customer 模块通过 `/api/cases?customerId=` 查询关联案件时，
// 依赖以下最小字段集。cases 列表接口 / adapter 演进时不得移除这些字段，
// 否则需同步校准 CustomerAdapterMappers.adaptCustomerCaseDto。
//
// 复用路径（3 层）：
//   CustomerRepository.listRelatedCases
//     → GET /api/cases?customerId=<id>
//     → CustomerAdapterMappers.adaptCustomerCaseListResult
//   cases 侧 buildCaseListSearchParams({ customerId }) 生成同等查询，
//   两侧共用同一服务端接口，响应 DTO 结构一致。
//
// HTTP 参数名 contract（p0-fe-002b-03 冻结）：
//   - "customerId" 必须在 cases 侧 CASE_LIST_HTTP_FIELD_MAP.customerId
//     与 customer 侧 CustomerRepository.listRelatedCases 中一致。
//   - "view=summary" 由 buildCaseListSearchParams 硬编码。
//   - "page" / "limit" 为可选分页参数，两侧共享语义。
//
// 最小字段集：id, caseName | caseNo, caseTypeCode, stage, ownerUserId,
//   customerId, createdAt, updatedAt
// 可选扩展字段：groupId, riskLevel, dueAt, billingUnpaidAmountCached

/**
 * customer 下游复用依赖的案件 DTO 最小字段集——用于回归测试断言。
 *
 * 变更时须同步更新 `CUSTOMER_DOWNSTREAM_FIELD_MAP`、
 * `CustomerAdapterMappers.CUSTOMER_CASE_UPSTREAM_CONTRACT`、
 * `CaseListSummaryDownstream.test.ts` 与 `CaseAdapterReaders.customer-summary-page.test.ts`。
 */
// prettier-ignore
export const CUSTOMER_DOWNSTREAM_MINIMUM_FIELDS = ["id","customerId","caseName","caseTypeCode","stage","ownerUserId","createdAt","updatedAt"] as const;

/** 服务端案件 DTO 字段 → 下游 `CustomerCase` 属性名映射（`customerId` 仅标识不映射）。 */
export const CUSTOMER_DOWNSTREAM_FIELD_MAP = {
  id: "id",
  caseName: "name",
  caseTypeCode: "type",
  stage: "stage",
  ownerUserId: "owner",
  createdAt: "createdAt",
  updatedAt: "updatedAt",
} as const;

// ─── Base Field Mapping Contract (frozen by p0-fe-002b-04) ───────
// list DTO → CaseListItem 基础字段映射。
// 键 = 服务端 DTO 字段名，值 = CaseListItem 属性名。
// 变更此映射需同步更新 CaseAdapterMappers.adaptCaseListItemDto 与
// CaseAdapterMappers.test.ts 的 contract freeze 断言。
//
// summary/wrapped 格式时，customerName / groupName 在 wrapper 层；
// flat 格式时全部字段在同一层。映射方向见 adaptCaseListItemDto 注释。

/**
 * 案件列表 DTO 基础字段 → CaseListItem 属性名映射。
 *
 * 仅覆盖 p0-fe-002b-04 定义的 7 组基础字段：
 * id / name / type / customer / group / owner / stage。
 * 派生状态字段（validation / risk / due / unpaid / updatedAt）由 002b-05 冻结。
 */
export const CASE_LIST_BASE_FIELD_MAP = {
  id: "id",
  caseName: "name",
  caseNo: "name",
  caseTypeCode: "type",
  customerName: "applicant",
  customerId: "customerId",
  groupId: "groupId",
  groupName: "groupLabel",
  ownerUserId: "ownerId",
  stage: "stageId",
} as const;

/**
 * 基础字段在 CaseListItem 上的属性名集合——用于 contract tests 检测映射完整性。
 */
export const CASE_LIST_BASE_TARGET_KEYS = [
  "id",
  "name",
  "type",
  "applicant",
  "customerId",
  "groupId",
  "groupLabel",
  "stageId",
  "stageLabel",
  "ownerId",
] as const;

// ─── Derived Status Field Mapping Contract (frozen by p0-fe-002b-05) ─
// list DTO → CaseListItem 派生状态字段映射。
// 键 = 服务端 DTO 字段名，值 = 该字段产生的 CaseListItem 属性名数组。
// 与基础字段不同，派生字段涉及类型转换（resolveValidationStatus、
// resolveRiskStatus、formatDate、readNumber），一个 DTO 字段可产生多个 UI 属性。
//
// 变更此映射需同步更新 CaseAdapterMappers.adaptCaseListItemDto 与
// CaseAdapterMappers.derived-status.test.ts 的 contract freeze 断言。
//
// 特殊读取层级：
//   - latestValidation：summary 格式从 wrapper 层读取，flat 格式从 record 层读取。
//   - 其余字段均从 caseRecord 层读取。

/**
 * 案件列表 DTO 派生状态字段 → CaseListItem 属性名映射。
 *
 * 覆盖 p0-fe-002b-05 定义的 5 组派生状态：
 * latestValidation / riskLevel / dueAt / billingUnpaidAmountCached / updatedAt。
 */
export const CASE_LIST_DERIVED_FIELD_MAP = {
  latestValidation: ["validationStatus", "validationLabel"],
  riskLevel: ["riskStatus", "riskLabel"],
  dueAt: ["dueDate", "dueDateLabel"],
  billingUnpaidAmountCached: ["unpaidAmount"],
  updatedAt: ["updatedAtLabel"],
} as const;

/**
 * 派生状态字段在 CaseListItem 上的属性名集合——用于 contract tests 检测映射完整性。
 */
export const CASE_LIST_DERIVED_TARGET_KEYS = [
  "validationStatus",
  "validationLabel",
  "riskStatus",
  "riskLabel",
  "dueDate",
  "dueDateLabel",
  "unpaidAmount",
  "updatedAtLabel",
] as const;

// ─── Summary Card Aggregation Contract (frozen by p0-fe-002b-06) ──
// 汇总卡片从已适配的 CaseListItem[] 聚合，聚合口径与列表模型字段一致。
// 变更此映射需同步更新 CaseAdapterMappers.adaptCaseSummaryCards 与
// CaseAdapterMappers.summary-cards.test.ts 的 contract freeze 断言。

/**
 * 4 张汇总卡片的键名——用于 contract tests 与 UI 渲染标识。
 */
export const CASE_SUMMARY_CARD_KEYS = [
  "activeCases",
  "failedValidations",
  "dueSoon",
  "unpaidTotal",
] as const;

/**
 * 每张卡片使用的 CaseListItem 字段与聚合规则说明。
 *
 * - `field`：聚合所依赖的 CaseListItem 属性名。
 * - `scope`：聚合范围（`active` = 非 S9，`all` = 全量）。
 * - `aggregation`：聚合类型（`count` = 计数，`sum` = 求和）。
 */
export const CASE_SUMMARY_CARD_FIELD_USAGE = {
  activeCases: { field: "stageId", scope: "all", aggregation: "count" },
  failedValidations: {
    field: "validationStatus",
    scope: "all",
    aggregation: "count",
  },
  dueSoon: { field: "dueDate", scope: "active", aggregation: "count" },
  unpaidTotal: { field: "unpaidAmount", scope: "active", aggregation: "sum" },
} as const;

/**
 * 汇总卡片预定义的 variant 映射——用于 UI 渲染时的颜色/主题。
 */
export const CASE_SUMMARY_CARD_VARIANTS = {
  activeCases: "primary",
  failedValidations: "info",
  dueSoon: "warning",
  unpaidTotal: "neutral",
} as const;

// ─── Write Input Types (p0-fe-002d frozen) ──────────────────────
// 与 server cases.types.ts 的写接口 DTO 对齐。
// `undefined` = 不发送（省略），`null` = 清除字段。
// builders 负责空字符串 → null 归一化，此处仅定义类型。

/** 创建案件表单输入。 */
export interface CaseCreateInput {
  /**
   *
   */
  customerId: string;
  /**
   *
   */
  caseTypeCode: string;
  /**
   *
   */
  ownerUserId: string;
  /**
   *
   */
  groupId?: string | null;
  /**
   *
   */
  stage?: string;
  /**
   *
   */
  dueAt?: string | null;
  /**
   *
   */
  caseName?: string | null;
  /**
   *
   */
  caseSubtype?: string | null;
  /**
   *
   */
  applicationType?: string | null;
  /**
   *
   */
  priority?: string;
  /**
   *
   */
  riskLevel?: string;
  /**
   *
   */
  assistantUserId?: string | null;
  /**
   *
   */
  sourceChannel?: string | null;
  /**
   *
   */
  signedAt?: string | null;
  /**
   *
   */
  quotePrice?: number | null;
  /**
   *
   */
  crossGroupReason?: string | null;
}

/** 更新案件表单输入（patch 语义：仅发送需变更字段）。 */
export interface CaseUpdateInput {
  /**
   *
   */
  caseTypeCode?: string;
  /**
   *
   */
  ownerUserId?: string;
  /**
   *
   */
  dueAt?: string | null;
  /**
   *
   */
  caseName?: string | null;
  /**
   *
   */
  caseSubtype?: string | null;
  /**
   *
   */
  applicationType?: string | null;
  /**
   *
   */
  priority?: string;
  /**
   *
   */
  riskLevel?: string;
  /**
   *
   */
  assistantUserId?: string | null;
  /**
   *
   */
  sourceChannel?: string | null;
  /**
   *
   */
  signedAt?: string | null;
  /**
   *
   */
  acceptedAt?: string | null;
  /**
   *
   */
  submissionDate?: string | null;
  /**
   *
   */
  resultDate?: string | null;
  /**
   *
   */
  residenceExpiryDate?: string | null;
  /**
   *
   */
  archivedAt?: string | null;
  /**
   *
   */
  resultOutcome?: string | null;
  /**
   *
   */
  quotePrice?: number | null;
  /**
   *
   */
  groupId?: string | null;
  /**
   *
   */
  groupTransferReason?: string | null;
}

/** 阶段流转输入。 */
export interface CaseTransitionInput {
  /**
   *
   */
  toStage: string;
  /**
   *
   */
  closeReason?: string | null;
}

/** 欠款风险确认输入。 */
export interface CaseBillingRiskAckInput {
  /**
   *
   */
  reasonCode: string;
  /**
   *
   */
  reasonNote?: string;
  /**
   *
   */
  evidenceUrl?: string;
}

/** 下签后阶段变更输入。 */
export interface CasePostApprovalInput {
  /**
   *
   */
  stage: string;
}

/** 写入操作统一返回结构。 */
export interface CaseMutationResult {
  /**
   *
   */
  id: string;
}
