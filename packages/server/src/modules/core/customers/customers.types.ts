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
  owner_name?: unknown;
};

/** 客户所在地枚举。 */
export const CUSTOMER_LOCATIONS = ["OVERSEAS", "JAPAN"] as const;

/**
 *
 */
export type CustomerLocation = (typeof CUSTOMER_LOCATIONS)[number];

/** 客户来源渠道枚举。 */
export const CUSTOMER_SOURCE_TYPES = ["REFERRAL", "WEB", "ADS"] as const;

/**
 *
 */
export type CustomerSourceType = (typeof CUSTOMER_SOURCE_TYPES)[number];

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

/**
 * 经营管理签承接档案。
 *
 * **冻结决策（D2）**：数据持久化于 `customers.base_profile` JSONB 的
 * `bmvProfile` 键（写入路径见 `customers.bmv.ts`）。不新增 `customers`
 * 顶层列。读路径统一通过 `CustomerSummaryDto.bmvProfile` /
 * `CustomerDetailDto.bmvProfile` / `CustomerBmvView` DTO view 暴露给
 * admin/前端，消费方不应直接解析 `base_profile` JSONB。
 *
 * @see {@link CustomerBmvView} — 聚合端点使用的顶层 DTO view
 */
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
  sourceLeadId: string | null;
  currentQuoteFormId: string | null;
  visaPlan: string | null;
  quoteAmount: number | null;
};

/**
 * 经营管理签顶层 DTO view — 聚合端点的读路径契约。
 *
 * **冻结决策（D2）**：BMV 承接数据的唯一持久化点为
 * `customers.base_profile.bmvProfile`（JSONB 嵌套），不新增 `customers`
 * 顶层列。本类型作为 `GET /admin/customers/:id/bmv` 聚合端点的响应骨架，
 * 将 `bmvProfile` 提升至顶层，消费方无需关心底层存储路径，避免双源。
 *
 * D3 阶段将在此基础上扩展 `quoteHistory`、`caseStageSummary`、
 * `remindersSummary` 等聚合字段。
 */
export type CustomerBmvView = {
  customerId: string;
  bmvProfile: CustomerBmvProfile;
  quoteHistory: BmvQuoteHistoryItem[];
  currentCase: BmvCaseSummary | null;
  reminders: BmvReminderSummaryItem[];
};

/** 报价历史条目。 */
export type BmvQuoteHistoryItem = {
  id: string;
  formData: Record<string, unknown>;
  status: string;
  createdAt: string;
};

/** BMV 关联案件摘要。 */
export type BmvCaseSummary = {
  id: string;
  stage: string | null;
  postApprovalStage: string | null;
  coeIssuedAt: string | null;
  coeExpiryDate: string | null;
  coeSentAt: string | null;
  status: string;
};

/** BMV 提醒摘要条目。 */
export type BmvReminderSummaryItem = {
  id: string;
  remindAt: string;
  sendStatus: string;
  channel: string;
};

/** save-survey 请求参数。 */
export type SaveBmvSurveyInput = {
  intakeFormId: string;
  formData: Record<string, unknown>;
  surveyData?: Record<string, unknown>;
};

/** quote/modify 请求参数。 */
export type ModifyBmvQuoteInput = {
  appUserId: string;
  formData: Record<string, unknown>;
  amount?: number | null;
  visaPlan?: string | null;
};

/** transition-to-case 可选覆写参数。 */
export type TransitionBmvToCaseInput = {
  ownerUserId?: string;
  groupId?: string | null;
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
  /**
   * 客户类型（`"individual"` | `"corporation"`）。
   *
   * **BUG-183 修复（R18）**：顶层 DTO 必须 expose 此字段，否则 admin 列表/详情
   * 无法在视觉上区分个人 vs 法人客户。来源为 `customers.type` 列，与
   * `mapCustomerToCreateResponseDto.type` 字段对齐——CREATE/GET 响应在该字段
   * 上保持同名同义。
   */
  type: string;
  displayName: string;
  legalName: string;
  localizedNames: CustomerLocalizedNames;
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
  /**
   * 经营管理签承接档案的顶层 DTO 投影。
   * 存储于 `base_profile.bmvProfile`，由 `resolveCustomerBmvProfile()` 解析。
   * 空缺时下发 `intakeStatus: "not_started"` 默认值，始终非 null。
   *
   * @see {@link CustomerBmvView} — 独立聚合端点的 DTO view
   */
  bmvProfile: CustomerBmvProfile;
};

/** 客户详情 DTO。 */
export type CustomerDetailDto = CustomerSummaryDto & {
  nationality: string;
  gender: string;
  birthDate: string;
  avatar: string;
  note: string;
  location: CustomerLocation | null;
  sourceType: CustomerSourceType | null;
  /**
   * 统一签证类型计算字段。
   * BMV 客户取 `bmvProfile.visaPlan`，非 BMV 客户取 `baseProfile.visaType`。
   */
  visaType: string | null;
  referrerName: string | null;
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
 * 客户多语言名称（三语 + 默认语言标识）。
 *
 * 字段与 `baseProfile` 中 `name_cn`/`name_jp`/`name_en` 双向同步；
 * 当 Migration 044 落地后，将优先从独立列读取。
 */
export type CustomerLocalizedNames = {
  zh?: string | null;
  ja?: string | null;
  en?: string | null;
  defaultLocale?: "zh" | "ja" | "en" | null;
};

/**
 * 创建客户请求参数。
 */
export type CustomerCreateInput = {
  type: string;
  baseProfile?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
  localizedNames?: CustomerLocalizedNames;
};

/**
 * 更新客户请求参数。
 */
export type CustomerUpdateInput = {
  type?: string;
  baseProfile?: Record<string, unknown>;
  contacts?: Record<string, unknown>[];
  localizedNames?: CustomerLocalizedNames;
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
