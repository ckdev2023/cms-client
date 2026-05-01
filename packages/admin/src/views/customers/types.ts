import type { CustomerBmvProfile } from "./types-bmv";
import type { CustomerCreateFormFields } from "./types-customer-fields";

/**
 *
 */
export type CustomerScope = "mine" | "group" | "all";

/**
 * 空字符串表示"全部"（不过滤）。
 */
export type CustomerGroupFilter = "" | string;
/**
 * 空字符串表示"全部"（不过滤）。
 */
export type CustomerOwnerFilter = "" | string;
/**
 * 空字符串表示"全部"；"yes"/"no" 按有无活跃案件筛选。
 */
export type CustomerActiveCasesFilter = "" | "yes" | "no";

/**
 *
 */
export interface CustomerFiltersState {
  /**
   *
   */
  scope: CustomerScope;
  /**
   *
   */
  search: string;
  /**
   *
   */
  group: CustomerGroupFilter;
  /**
   *
   */
  owner: CustomerOwnerFilter;
  /**
   *
   */
  activeCases: CustomerActiveCasesFilter;
}

/**
 * 当前列表查看人的可见范围上下文。
 */
export interface CustomerViewerContext {
  /**
   * 当前查看人的负责人姓名。
   */
  ownerName: string;
  /**
   * 当前查看人的所属分组。
   */
  group: string;
}

/**
 *
 */
export interface CustomerSummary {
  /**
   *
   */
  id: string;
  /**
   *
   */
  displayName: string;
  /**
   *
   */
  legalName: string;
  /**
   *
   */
  furigana: string;
  /**
   *
   */
  customerNumber: string;
  /**
   *
   */
  phone: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  totalCases: number;
  /**
   *
   */
  activeCases: number;
  /**
   *
   */
  lastContactDate: string | null;
  /**
   *
   */
  lastContactChannel: string | null;
  /**
   *
   */
  owner: {
    /**
     *
     */
    initials: string; /**
     *
     */
    name: string;
  };
  /**
   *
   */
  referralSource: string;
  /**
   *
   */
  group: string;
  /**
   * P1 经营管理签承接档案；P0 统一先以 nullable 契约冻结。
   */
  bmvProfile: CustomerBmvProfile | null;
}

/**
 *
 */
export type SummaryCardVariant = "primary" | "info" | "warning" | "neutral";

/**
 *
 */
export interface SummaryCardData {
  /**
   *
   */
  key: string;
  /**
   *
   */
  variant: SummaryCardVariant;
  /**
   *
   */
  value: number;
}

/**
 *
 */
export interface SelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 * 客户草稿：序列化到 localStorage 的快照。
 */
export interface CustomerDraft {
  /**
   * 草稿唯一标识。
   */
  id: string;
  /**
   * 表单字段快照。
   */
  fields: CustomerCreateFormFields;
  /**
   * 保存时的时间戳（ms）。
   */
  savedAt: number;
}

/**
 *
 */
export type DetailTab = "basic" | "cases" | "contacts" | "comms" | "log";

export const DETAIL_TABS: readonly DetailTab[] = [
  "basic",
  "cases",
  "contacts",
  "comms",
  "log",
] as const;

/** 客户详情页默认 tab。 */
export const DEFAULT_CUSTOMER_DETAIL_TAB: DetailTab = "basic";

/**
 * 判断字符串是否为合法的客户详情 tab。
 *
 * @param v - 待校验字符串
 * @returns 是否属于 DETAIL_TABS
 */
export function isValidCustomerDetailTab(v: string): v is DetailTab {
  return (DETAIL_TABS as readonly string[]).includes(v);
}

/**
 * 将任意外部输入解析为合法 DetailTab，非法值回退到 DEFAULT_CUSTOMER_DETAIL_TAB。
 *
 * @param raw - 来自 URL query 或 model deps 的原始值
 * @returns 类型安全的 tab 键名
 */
export function resolveCustomerDetailTab(
  raw: string | null | undefined,
): DetailTab {
  if (typeof raw === "string" && isValidCustomerDetailTab(raw)) return raw;
  return DEFAULT_CUSTOMER_DETAIL_TAB;
}

/**
 * 关联案件状态。
 */
export type CaseStatus = "active" | "archived";

/**
 * 案件筛选条件。
 */
export type CaseFilter = "all" | "active" | "archived";

/**
 * 客户关联案件。
 */
export interface CustomerCase {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  type: string;
  /**
   *
   */
  stage: string;
  /**
   *
   */
  status: CaseStatus;
  /**
   * 兜底显示用 owner 字段：优先取后端 `ownerName`/`ownerDisplayName`，
   * 缺失时回落到 `ownerUserId`（可能是 UUID）。新代码请优先消费
   * `ownerDisplayName` + `ownerId`，避免直接渲染本字段导致 UUID 外泄。
   */
  owner: string;
  /** 后端稳定的负责人 id，用于 catalog/Local Admin 解析（可能为 UUID）。 */
  ownerId?: string;
  /** 后端下发的负责人显示名（如 Local Admin / 担当太郎）；缺失时回落 catalog。 */
  ownerDisplayName?: string;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  updatedAt: string;
}

/**
 * 关联人关系类型。
 */
export type RelationType = "spouse" | "parent" | "child" | "agent" | "other";

/**
 * 客户关联人。
 */
export interface CustomerRelation {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  kana: string;
  /**
   *
   */
  relationType: RelationType;
  /**
   *
   */
  phone: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  tags: string[];
  /**
   *
   */
  note: string;
}

/**
 * 关联人新增/编辑表单字段。
 */
export interface CustomerRelationFormFields {
  /**
   * 姓名。
   */
  name: string;
  /**
   * 关系类型。
   */
  relationType: RelationType;
  /**
   * 角色/标签。
   */
  roleTitle: string;
  /**
   * 电话。
   */
  phone: string;
  /**
   * 邮箱。
   */
  email: string;
}

export type {
  BmvIntakeStatus,
  BmvLinkedCaseSummary,
  BmvQuestionnaireStatus,
  BmvQuoteStatus,
  BmvQuoteVersion,
  BmvReminderSummary,
  BmvSignStatus,
  BmvSurveyDataSummary,
  CustomerBmvAggregate,
  CustomerBmvProfile,
} from "./types-bmv";
export type {
  CommChannel,
  CommVisibility,
  CommFilter,
  CustomerComm,
  LogType,
  LogFilter,
  CustomerLog,
} from "./types-comms-logs";
export {
  getRelationTypeLabel,
  getRelationTypeOptions,
  RELATION_TYPE_OPTIONS,
} from "./relationTypes";
export { resolveBmvIntakeStatus } from "./types-bmv";
export {
  COMM_CHANNEL_OPTIONS,
  getCommChannelLabel,
  LOG_TYPE_OPTIONS,
  getLogTypeLabel,
} from "./types-comms-logs";
export {
  CUSTOMER_LOCATIONS,
  CUSTOMER_SOURCE_TYPES,
  CUSTOMER_VISA_TYPES,
  type CustomerCreateFormFields,
  type CustomerLocation,
  type CustomerSourceType,
  type CustomerVisaType,
} from "./types-customer-fields";

/**
 * 客户详情完整数据，在 CustomerSummary 基础上扩展编辑与案件摘要字段。
 */
export interface CustomerDetail extends CustomerSummary {
  /**
   *
   */
  nationality: string;
  /**
   *
   */
  gender: string;
  /**
   *
   */
  birthDate: string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  note: string;
  /**
   *
   */
  location: string;
  /**
   *
   */
  sourceType: string;
  /** BMV 客户取 `bmvProfile.visaPlan`，非 BMV 客户取 `baseProfile.visaType`。 */
  visaType: string;
  /**
   *
   */
  referrerName: string;
  /**
   *
   */
  archivedCases: number;
  /**
   * 关联案件名称列表，用于摘要条的案件名显示与 popover。
   */
  caseNames: string[];
  /**
   *
   */
  lastCaseCreatedDate: string | null;
}
