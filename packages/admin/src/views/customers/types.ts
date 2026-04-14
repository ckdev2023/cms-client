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
 *
 */
export interface CustomerCreateFormFields {
  /**
   *
   */
  displayName: string;
  /**
   *
   */
  group: string;
  /**
   *
   */
  legalName: string;
  /**
   *
   */
  kana: string;
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
  nationality: string;
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
  referrer: string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  note: string;
}

/**
 *
 */
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
   *
   */
  owner: string;
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

export const RELATION_TYPE_OPTIONS: readonly {
  /**
   *
   */
  value: RelationType;
  /**
   *
   */
  label: string;
}[] = [
  { value: "spouse", label: "配偶" },
  { value: "parent", label: "父母" },
  { value: "child", label: "子女" },
  { value: "agent", label: "代理 / 顾问" },
  { value: "other", label: "其他" },
] as const;

/**
 * 根据关系类型值获取中文标签。
 *
 * @param type 关系类型值或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getRelationTypeLabel(type: RelationType | string): string {
  const found = RELATION_TYPE_OPTIONS.find((opt) => opt.value === type);
  return found ? found.label : String(type || "—");
}

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
  COMM_CHANNEL_OPTIONS,
  getCommChannelLabel,
  LOG_TYPE_OPTIONS,
  getLogTypeLabel,
} from "./types-comms-logs";

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
