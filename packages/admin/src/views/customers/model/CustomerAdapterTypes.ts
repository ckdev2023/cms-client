import type {
  CustomerRelationFormFields,
  CustomerScope,
  CustomerSummary,
} from "../types";

/** 去重接口允许返回的命中字段键。 */
export const DUPLICATE_MATCH_FIELDS = ["name", "phone", "email"] as const;

/** 去重候选命中的字段类型。 */
export type CustomerDuplicateMatchField =
  (typeof DUPLICATE_MATCH_FIELDS)[number];

/** 客户列表查询参数。 */
export interface CustomerListParams {
  /** 数据权限范围。 */
  scope?: CustomerScope;
  /** 关键字搜索。 */
  search?: string;
  /** 分组筛选值。 */
  group?: string;
  /** 负责人筛选值。 */
  owner?: string;
  /** 是否仅显示有活跃案件的客户。 */
  activeCases?: "" | "yes" | "no";
  /** 当前页码。 */
  page?: number;
  /** 单页条数。 */
  limit?: number;
}

/** 客户列表接口返回结果。 */
export interface CustomerListResult {
  /** 当前页客户摘要。 */
  items: CustomerSummary[];
  /** 满足条件的总记录数。 */
  total: number;
}

/** 客户去重检查入参。 */
export interface CustomerDuplicateCheckInput {
  /** 待检查的姓名。 */
  name?: string;
  /** 待检查的手机号。 */
  phone?: string;
  /** 待检查的邮箱。 */
  email?: string;
  /** 需要从候选中排除的客户 ID。 */
  excludeCustomerId?: string;
}

/** 去重候选项。 */
export interface CustomerDuplicateCandidate {
  /** 客户 ID。 */
  id: string;
  /** 展示名。 */
  displayName: string;
  /** 法定姓名。 */
  legalName: string;
  /** 假名/ふりがな。 */
  furigana: string;
  /** 电话。 */
  phone: string;
  /** 邮箱。 */
  email: string;
  /** 所属分组。 */
  group: string;
  /** 命中的字段列表。 */
  matchedFields: CustomerDuplicateMatchField[];
}

/** 基础信息保存入参。 */
export interface CustomerBasicInfoUpdateInput {
  /** 展示名。 */
  displayName: string;
  /** 法定姓名。 */
  legalName: string;
  /** 假名读音。 */
  furigana: string;
  /** 国籍。 */
  nationality: string;
  /** 性别。 */
  gender: string;
  /** 出生日期。 */
  birthDate: string;
  /** 电话。 */
  phone: string;
  /** 邮箱。 */
  email: string;
  /** 分组。 */
  group: string;
  /** 负责人 ID。 */
  ownerId?: string;
  /** 来源/介绍人。 */
  referralSource: string;
  /** 所在地。 */
  location: string;
  /** 来源渠道。 */
  sourceType: string;
  /** 签证类型（非 BMV 客户）。 */
  visaType: string;
  /** 介绍人姓名。 */
  referrerName: string;
  /** 头像 URL。 */
  avatar: string;
  /** 备注。 */
  note: string;
}

/** 关联人新增/编辑入参。 */
export interface CustomerRelationMutationInput extends CustomerRelationFormFields {
  /** 所属客户 ID。 */
  customerId: string;
}

// ─── Customer → Cases Downstream Query Contract (p0-fe-009-01) ────
// CustomerRepository.listRelatedCases 查询 `/api/cases` 的 HTTP 参数契约。
// 与 cases 侧 CASE_LIST_HTTP_FIELD_MAP / buildCaseListSearchParams 共用同一
// 服务端接口，两侧参数名必须保持一致。变更时须同步更新
// CaseAdapterReaders.customer-summary-page.test.ts 与
// useCustomerCasesModel.query-contract.test.ts。

/**
 * customer 下游查询 cases API 使用的 HTTP 参数名。
 *
 * - `customerId`：过滤指定客户的关联案件。
 * - `view`：固定为 `"summary"`，请求 summary/wrapped 格式。
 *
 * 与 cases 侧 `CASE_LIST_HTTP_FIELD_MAP.customerId` 保持一致。
 */
export const CUSTOMER_CASES_QUERY_HTTP_CONTRACT = {
  customerId: "customerId",
  view: "summary",
} as const;

/**
 * customer 下游查询 cases API 使用的端点路径。
 */
export const CUSTOMER_CASES_API_PATH = "/api/cases" as const;

// ─── Customer → Case Create Entry Contract (p0-fe-010-01, p0-fe-010-02) ─
// CustomerDetailView 与 CustomerContactsTab 跳转到案件新建页的 query 字段契约。
// 与 cases 侧 CASE_CREATE_QUERY_PARAM_KEYS / parseCaseCreateQuery 共用同一
// URL query 结构，两侧字段名必须保持一致。变更时须同步更新
// useCustomerCasesModel.query-contract.test.ts 与
// CustomerCasesQueryContract.test.ts。

/**
 * customer → case create 入口使用的 query 字段名。
 *
 * - `customerIdKey`：传递当前客户 ID。
 * - `relationIdsKey`：批量建案时传递关联人 ID 列表（逗号分隔）。
 * - `selectedRelationsKey`：批量建案时传递关联人上下文（JSON 字符串）。
 * - `familyBulkHash`：家族批量建案标识，通过 hash 而非 query 传递。
 * - `customerDefaultKeys`：客户默认值字段名（p0-fe-010-02），确保 create form
 *   在客户不在 create customer list 中时仍可继承 group、标题等。
 *
 * 与 cases 侧 `CASE_CREATE_QUERY_PARAM_KEYS` 保持一致。
 */
export const CUSTOMER_CREATE_CASE_ENTRY_CONTRACT = {
  customerIdKey: "customerId",
  relationIdsKey: "relationIds",
  selectedRelationsKey: "selectedRelations",
  familyBulkHash: "#family-bulk",
  routeName: "case-create",
  customerDefaultKeys: [
    "customerName",
    "customerKana",
    "customerGroup",
    "customerGroupLabel",
    "customerContact",
  ] as readonly string[],
} as const;

// ─── Family Bulk Entry Contract (p0-fe-011-01) ─────────────────
// customer 侧家族批量建案入口最小字段集——与 cases 侧
// FAMILY_BULK_ENTRY_CONTRACT 保持对齐。
// 变更时须同步更新 useCreateCaseModel.family-bulk-submit.test.ts
// 与 useCreateCaseModel.customer-defaults.test.ts。

/**
 * customer → case create 家族批量入口的最小字段集。
 *
 * - `requiredQueryKeys`：customer 侧构造 route 时必须传递的 query 字段。
 * - `activationHash`：与 cases 侧 `#family-bulk` hash 保持一致。
 * - `recommendedQueryKeys`：确保 create form 在客户不在 list 中时仍可正常初始化。
 */
export const CUSTOMER_FAMILY_BULK_ENTRY_CONTRACT = {
  requiredQueryKeys: ["customerId"] as readonly string[],
  activationHash: "#family-bulk",
  recommendedQueryKeys: [
    "customerName",
    "customerGroup",
    "customerGroupLabel",
    "selectedRelations",
  ] as readonly string[],
  optionalQueryKeys: [
    "relationIds",
    "customerKana",
    "customerContact",
  ] as readonly string[],
} as const;
