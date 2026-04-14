/**
 * 线索状态（03 §3.6）。
 *
 * - `new` — 新咨询
 * - `following` — 跟进中
 * - `pending_sign` — 待签约
 * - `signed` — 已签约
 * - `converted_case` — 已创建案件（原型扩展态，仅 UI 使用）
 * - `lost` — 已流失
 */
export type LeadStatus =
  | "new"
  | "following"
  | "pending_sign"
  | "signed"
  | "converted_case"
  | "lost";

/**
 * 状态元信息，供 Badge / 行高亮复用。
 */
export interface LeadStatusMeta {
  /** */
  value: LeadStatus;
  /** */
  label: string;
  /** */
  badgeClass: string;
  /** */
  dotColor: string;
  /** */
  textClass: string;
}

export const LEAD_STATUSES: readonly LeadStatusMeta[] = [
  {
    value: "new",
    label: "新咨询",
    badgeClass: "lead-badge-new",
    dotColor: "warning",
    textClass: "text-amber-600",
  },
  {
    value: "following",
    label: "跟进中",
    badgeClass: "lead-badge-following",
    dotColor: "primary",
    textClass: "text-sky-600",
  },
  {
    value: "pending_sign",
    label: "待签约",
    badgeClass: "lead-badge-pending_sign",
    dotColor: "purple",
    textClass: "text-violet-600",
  },
  {
    value: "signed",
    label: "已签约",
    badgeClass: "lead-badge-signed",
    dotColor: "success",
    textClass: "text-emerald-600",
  },
  {
    value: "converted_case",
    label: "已创建案件",
    badgeClass: "lead-badge-signed",
    dotColor: "success",
    textClass: "text-emerald-600",
  },
  {
    value: "lost",
    label: "已流失",
    badgeClass: "lead-badge-lost",
    dotColor: "muted",
    textClass: "text-gray-400",
  },
] as const;

/**
 * 根据状态值获取中文标签。
 *
 * @param status 状态值
 * @returns 中文标签；未匹配时返回原始值
 */
export function getLeadStatusLabel(status: LeadStatus | string): string {
  const found = LEAD_STATUSES.find((s) => s.value === status);
  return found ? found.label : String(status || "—");
}

/**
 * 已签约未转化行的特殊 badge class。
 */
export const SIGNED_WARNING_BADGE_CLASS = "lead-badge-signed-warning";

/* ------------------------------------------------------------------ */
/*  可见性范围                                                         */
/* ------------------------------------------------------------------ */

/** */
export type LeadScope = "mine" | "group" | "all";

/** */
export interface ScopeOption {
  /** */
  value: LeadScope;
  /** */
  label: string;
}

export const SCOPE_OPTIONS: readonly ScopeOption[] = [
  { value: "mine", label: "我的" },
  { value: "group", label: "本组" },
  { value: "all", label: "全所（管理员）" },
] as const;

/* ------------------------------------------------------------------ */
/*  筛选                                                               */
/* ------------------------------------------------------------------ */

/** 空字符串表示"全部"（不过滤）。 */
export type LeadStatusFilter = "" | LeadStatus;
/** 空字符串表示"全部"（不过滤）。 */
export type LeadOwnerFilter = "" | string;
/** 空字符串表示"全部"（不过滤）。 */
export type LeadGroupFilter = "" | string;
/** 空字符串表示"全部"（不过滤）。 */
export type LeadBusinessTypeFilter = "" | string;

/** */
export interface LeadFiltersState {
  /** */
  scope: LeadScope;
  /** */
  search: string;
  /** */
  status: LeadStatusFilter;
  /** */
  owner: LeadOwnerFilter;
  /** */
  group: LeadGroupFilter;
  /** */
  businessType: LeadBusinessTypeFilter;
  /** */
  dateFrom: string;
  /** */
  dateTo: string;
}

/* ------------------------------------------------------------------ */
/*  通用选项                                                           */
/* ------------------------------------------------------------------ */

/** */
export interface SelectOption {
  /** */
  value: string;
  /** */
  label: string;
}

/**
 * 负责人选项，额外携带首字母缩写。
 */
export interface OwnerOption extends SelectOption {
  /** */
  initials: string;
  /** */
  avatarClass: string;
}

/* ------------------------------------------------------------------ */
/*  列表行                                                             */
/* ------------------------------------------------------------------ */

/** */
export type RowHighlight = "warning" | "dimmed" | null;

/**
 * 列表页线索摘要行。
 */
export interface LeadSummary {
  /** */
  id: string;
  /** */
  name: string;
  /** */
  phone: string;
  /** */
  email: string;
  /** */
  businessType: string;
  /** */
  businessTypeLabel: string;
  /** */
  source: string;
  /** */
  sourceLabel: string;
  /** */
  referrer: string;
  /** */
  status: LeadStatus;
  /** */
  ownerId: string;
  /** */
  groupId: string;
  /** */
  nextAction: string;
  /** */
  nextFollowUp: string;
  /** 简化显示用标签，如 "04-10"。 */
  nextFollowUpLabel: string;
  /** */
  updatedAt: string;
  /** 简化显示用标签，如 "今天 15:30"。 */
  updatedAtLabel: string;
  /** */
  convertedCustomerId: string | null;
  /** */
  convertedCaseId: string | null;
  /** 去重预置 key；非 null 时列表弹出提示。 */
  dedupHint: string | null;
  /** `warning` = 已签约未转化高亮行，`dimmed` = 已流失弱化行。 */
  rowHighlight: RowHighlight;
  /** */
  warningText?: string;
}

/* ------------------------------------------------------------------ */
/*  新建表单                                                           */
/* ------------------------------------------------------------------ */

/** */
export interface LeadCreateFormFields {
  /** */
  name: string;
  /** */
  phone: string;
  /** */
  email: string;
  /** */
  source: string;
  /** */
  referrer: string;
  /** */
  businessType: string;
  /** */
  group: string;
  /** */
  owner: string;
  /** */
  nextAction: string;
  /** */
  nextFollowUp: string;
  /** */
  language: string;
  /** */
  note: string;
}

/**
 * 线索草稿：序列化到 localStorage 的快照。
 */
export interface LeadDraft {
  /** 草稿唯一标识。 */
  id: string;
  /** 表单字段快照。 */
  fields: LeadCreateFormFields;
  /** 保存时的时间戳（ms）。 */
  savedAt: number;
}

/* ------------------------------------------------------------------ */
/*  详情页类型 re-export                                                */
/* ------------------------------------------------------------------ */

export type {
  BannerPresetKey,
  ConvertedCase,
  ConvertedCustomer,
  ConversionRecord,
  DedupMatchedCustomer,
  DedupMatchedLead,
  DedupMatchType,
  DedupPresets,
  DedupResult,
  FollowupChannel,
  FollowupChannelMeta,
  HeaderButtonPresetKey,
  HeaderButtonState,
  HeaderButtonStates,
  LeadBasicInfo,
  LeadConversionInfo,
  LeadDetail,
  LeadDetailTab,
  LeadFollowupRecord,
  LeadLogCategory,
  LeadLogCategoryMeta,
  LeadLogEntry,
  LeadLogType,
} from "./types-detail";

export {
  FOLLOWUP_CHANNELS,
  getFollowupChannelLabel,
  getLeadLogCategoryLabel,
  HEADER_BUTTON_PRESETS,
  LEAD_DETAIL_TABS,
  LOG_CATEGORIES,
} from "./types-detail";
