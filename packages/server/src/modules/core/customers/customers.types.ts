import type { ContactPerson, Customer } from "../model/coreEntities";

/**
 * 数据库查询返回的客户行类型。
 */
export type CustomerQueryRow = {
  id: string;
  org_id: string;
  type: string;
  base_profile: unknown;
  contacts: unknown;
  created_at: unknown;
  updated_at: unknown;
  total_cases?: unknown;
  active_cases?: unknown;
  archived_cases?: unknown;
  case_names?: unknown;
  last_case_created_date?: unknown;
};

/**
 * 客户关系类型（P0 冻结口径）。
 */
export const CUSTOMER_RELATION_TYPES = [
  "spouse",
  "parent",
  "child",
  "agent",
  "other",
] as const;

/**
 *
 */
export type CustomerRelationType = (typeof CUSTOMER_RELATION_TYPES)[number];

/** 经营管理签承接问卷状态。 */
export const CUSTOMER_BMV_QUESTIONNAIRE_STATUSES = [
  "not_started",
  "sent",
  "returned",
] as const;

/**
 *
 */
export type CustomerBmvQuestionnaireStatus =
  (typeof CUSTOMER_BMV_QUESTIONNAIRE_STATUSES)[number];

/** 经营管理签报价状态。 */
export const CUSTOMER_BMV_QUOTE_STATUSES = [
  "not_started",
  "generated",
  "confirmed",
] as const;

/**
 *
 */
export type CustomerBmvQuoteStatus =
  (typeof CUSTOMER_BMV_QUOTE_STATUSES)[number];

/** 经营管理签签约状态。 */
export const CUSTOMER_BMV_SIGN_STATUSES = [
  "not_started",
  "pending",
  "signed",
] as const;

/**
 *
 */
export type CustomerBmvSignStatus = (typeof CUSTOMER_BMV_SIGN_STATUSES)[number];

/** 经营管理签整体承接状态。 */
export const CUSTOMER_BMV_INTAKE_STATUSES = [
  "not_started",
  "questionnaire_pending",
  "quote_pending",
  "sign_pending",
  "ready_for_case_creation",
] as const;

/**
 *
 */
export type CustomerBmvIntakeStatus =
  (typeof CUSTOMER_BMV_INTAKE_STATUSES)[number];

/** 客户负责人摘要。 */
export type CustomerOwnerSummary = {
  initials: string;
  name: string;
};

/** 经营管理签承接档案。 */
export type CustomerBmvProfile = {
  questionnaireStatus: CustomerBmvQuestionnaireStatus;
  quoteStatus: CustomerBmvQuoteStatus;
  signStatus: CustomerBmvSignStatus;
  intakeStatus: CustomerBmvIntakeStatus;
  questionnaireSentAt: string | null;
  questionnaireReturnedAt: string | null;
  quoteGeneratedAt: string | null;
  quoteConfirmedAt: string | null;
  signedAt: string | null;
  note: string | null;
};

/**
 * 客户关联人展示 DTO。
 *
 * P0 先以 `contact_persons` 为事实来源输出给管理端，后续若落专门的
 * `CustomerRelation` 实体，可继续复用该响应契约。
 */
export type CustomerRelationDto = {
  id: string;
  name: string;
  kana: string;
  relationType: CustomerRelationType;
  phone: string;
  email: string;
  tags: string[];
  note: string;
};

/** 客户列表 DTO。 */
export type CustomerSummaryDto = {
  id: string;
  displayName: string;
  legalName: string;
  furigana: string;
  customerNumber: string;
  phone: string;
  email: string;
  totalCases: number;
  activeCases: number;
  lastContactDate: string | null;
  lastContactChannel: string | null;
  owner: CustomerOwnerSummary;
  referralSource: string;
  group: string;
  bmvProfile: CustomerBmvProfile | null;
};

/** 客户详情 DTO。 */
export type CustomerDetailDto = CustomerSummaryDto & {
  nationality: string;
  gender: string;
  birthDate: string;
  avatar: string;
  note: string;
  archivedCases: number;
  caseNames: string[];
  lastCaseCreatedDate: string | null;
};

/** 客户列表/详情映射时使用的聚合数据。 */
export type CustomerDtoAggregates = {
  totalCases?: number;
  activeCases?: number;
  archivedCases?: number;
  lastContactDate?: string | null;
  lastContactChannel?: string | null;
  ownerName?: string | null;
  ownerInitials?: string | null;
  referralSource?: string | null;
  groupName?: string | null;
  caseNames?: string[];
  lastCaseCreatedDate?: string | null;
};

/** P0 关系 Tab 的源数据。 */
export type CustomerRelationSource = ContactPerson;

/**
 * 创建客户请求参数。
 */
export type CustomerCreateInput = {
  type: string;
  baseProfile?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
};

/**
 * 更新客户请求参数。
 */
export type CustomerUpdateInput = {
  type?: string;
  baseProfile?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
};

/**
 * 客户列表数据可见范围。
 */
export type CustomerListScope = "mine" | "group" | "all";

/**
 * 客户是否存在活跃案件的筛选项。
 */
export type CustomerActiveCasesFilter = "yes" | "no";

/**
 * 去重命中的客户字段。
 */
export type CustomerDuplicateField = "name" | "phone" | "email";

/**
 * 客户去重检查请求参数。
 */
export type CustomerDuplicateCheckInput = {
  name?: string;
  phone?: string;
  email?: string;
  excludeCustomerId?: string;
};

/**
 * 客户去重检查结果。
 */
export type CustomerDuplicateCheckResult = {
  customer: Customer;
  matchedFields: CustomerDuplicateField[];
};

/**
 * 查询客户列表请求参数。
 */
export type CustomerListInput = {
  page?: number;
  limit?: number;
  keyword?: string;
  phone?: string;
  email?: string;
  group?: string;
  owner?: string;
  activeCases?: CustomerActiveCasesFilter;
  scope?: CustomerListScope;
};
