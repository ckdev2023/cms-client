import type { LeadStatus } from "./types";

/* ------------------------------------------------------------------ */
/*  详情页 tabs                                                        */
/* ------------------------------------------------------------------ */

/** */
export type LeadDetailTab = "info" | "followups" | "conversion" | "log";

export const LEAD_DETAIL_TABS: readonly LeadDetailTab[] = [
  "info",
  "followups",
  "conversion",
  "log",
] as const;

/* ------------------------------------------------------------------ */
/*  跟进记录                                                           */
/* ------------------------------------------------------------------ */

/** */
export type FollowupChannel = "phone" | "email" | "meeting" | "im";

/** */
export interface FollowupChannelMeta {
  /** */
  value: FollowupChannel;
  /** */
  label: string;
  /** */
  chipClass: string;
}

export const FOLLOWUP_CHANNELS: readonly FollowupChannelMeta[] = [
  { value: "phone", label: "电话", chipClass: "bg-sky-100 text-sky-700" },
  {
    value: "email",
    label: "邮件",
    chipClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "meeting",
    label: "面谈",
    chipClass: "bg-violet-100 text-violet-700",
  },
  { value: "im", label: "IM", chipClass: "bg-amber-100 text-amber-700" },
] as const;

/**
 * 根据跟进渠道值获取中文标签。
 *
 * @param channel 渠道值或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getFollowupChannelLabel(
  channel: FollowupChannel | string,
): string {
  const found = FOLLOWUP_CHANNELS.find((c) => c.value === channel);
  return found ? found.label : String(channel || "—");
}

/** */
export interface LeadFollowupRecord {
  /** */
  channel: FollowupChannel;
  /** */
  channelLabel: string;
  /** */
  summary: string;
  /** */
  conclusion: string;
  /** */
  nextAction: string;
  /** */
  nextFollowUp: string;
  /** */
  time: string;
  /** */
  operator: string;
}

/* ------------------------------------------------------------------ */
/*  去重                                                               */
/* ------------------------------------------------------------------ */

/** */
export type DedupMatchType = "lead" | "customer";

/** */
export interface DedupMatchedLead {
  /** */
  id: string;
  /** */
  name: string;
  /** */
  phone: string;
  /** */
  group: string;
  /** */
  status: string;
  /** */
  statusLabel: string;
}

/** */
export interface DedupMatchedCustomer {
  /** */
  id: string;
  /** */
  name: string;
  /** */
  email: string;
  /** */
  group: string;
  /** */
  summary: string;
}

/** */
export interface DedupResult {
  /** */
  type: DedupMatchType;
  /** */
  matchField: string;
  /** */
  matchValue: string;
  /** */
  matchedRecord: DedupMatchedLead | DedupMatchedCustomer;
  /** */
  message: string;
  /** 用户对去重提示的处理结果（如 `confirmed_create`）。 */
  userAction?: string;
}

/**
 * 去重预置场景集合。
 */
export interface DedupPresets {
  /** */
  phoneMatchLead: DedupResult;
  /** */
  emailMatchCustomer: DedupResult;
}

/* ------------------------------------------------------------------ */
/*  转化信息                                                           */
/* ------------------------------------------------------------------ */

/** */
export interface ConvertedCustomer {
  /** */
  id: string;
  /** */
  name: string;
  /** */
  group: string;
  /** */
  convertedAt: string;
  /** */
  convertedBy: string;
}

/** */
export interface ConvertedCase {
  /** */
  id: string;
  /** */
  title: string;
  /** */
  type: string;
  /** */
  group: string;
  /** */
  convertedAt: string;
  /** */
  convertedBy: string;
}

/** */
export interface ConversionRecord {
  /** */
  type: "customer" | "case";
  /** */
  id: string;
  /** */
  label: string;
  /** */
  time: string;
  /** */
  operator: string;
}

/** */
export interface LeadConversionInfo {
  /** */
  dedupResult: DedupResult | null;
  /** */
  convertedCustomer: ConvertedCustomer | null;
  /** */
  convertedCase: ConvertedCase | null;
  /** */
  conversions: ConversionRecord[];
}

/* ------------------------------------------------------------------ */
/*  日志                                                               */
/* ------------------------------------------------------------------ */

/** */
export type LeadLogType = "status" | "owner" | "group";

/** */
export type LeadLogCategory = "all" | LeadLogType;

/** */
export interface LeadLogCategoryMeta {
  /** */
  key: LeadLogCategory;
  /** */
  label: string;
}

export const LOG_CATEGORIES: readonly LeadLogCategoryMeta[] = [
  { key: "all", label: "全部" },
  { key: "status", label: "状态变更" },
  { key: "owner", label: "人员变更" },
  { key: "group", label: "所属组变更" },
] as const;

/**
 * 根据日志分类 key 获取中文标签。
 *
 * @param key 分类 key 或自由文本
 * @returns 中文标签；未匹配时返回原始值
 */
export function getLeadLogCategoryLabel(key: LeadLogCategory | string): string {
  const found = LOG_CATEGORIES.find((c) => c.key === key);
  return found ? found.label : String(key || "—");
}

/** */
export interface LeadLogEntry {
  /** */
  type: LeadLogType;
  /** */
  operator: string;
  /** */
  time: string;
  /** */
  fromValue: string;
  /** */
  toValue: string;
  /** */
  chipClass: string;
}

/* ------------------------------------------------------------------ */
/*  详情页基础信息 Tab                                                  */
/* ------------------------------------------------------------------ */

/** */
export interface LeadBasicInfo {
  /** */
  id: string;
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
  language: string;
  /** */
  note: string;
}

/* ------------------------------------------------------------------ */
/*  Banner / Header 按钮状态                                            */
/* ------------------------------------------------------------------ */

/** */
export type BannerPresetKey = "lost" | "signedNotConverted" | null;

/** */
export type HeaderButtonState =
  | "enabled"
  | "highlighted"
  | "hidden"
  | "disabled"
  | "view-customer"
  | "view-case";

/** */
export interface HeaderButtonStates {
  /** */
  convertCustomer: HeaderButtonState;
  /** */
  convertCase: HeaderButtonState;
  /** */
  markLost: HeaderButtonState;
  /** */
  editInfo: HeaderButtonState;
  /** */
  changeStatus: HeaderButtonState;
}

/** */
export type HeaderButtonPresetKey =
  | "normal"
  | "signedNotConverted"
  | "convertedCustomer"
  | "convertedCase"
  | "lost";

export const HEADER_BUTTON_PRESETS: Record<
  HeaderButtonPresetKey,
  HeaderButtonStates
> = {
  normal: {
    convertCustomer: "enabled",
    convertCase: "enabled",
    markLost: "enabled",
    editInfo: "enabled",
    changeStatus: "enabled",
  },
  signedNotConverted: {
    convertCustomer: "highlighted",
    convertCase: "highlighted",
    markLost: "enabled",
    editInfo: "enabled",
    changeStatus: "enabled",
  },
  convertedCustomer: {
    convertCustomer: "view-customer",
    convertCase: "enabled",
    markLost: "hidden",
    editInfo: "enabled",
    changeStatus: "hidden",
  },
  convertedCase: {
    convertCustomer: "view-customer",
    convertCase: "view-case",
    markLost: "hidden",
    editInfo: "enabled",
    changeStatus: "hidden",
  },
  lost: {
    convertCustomer: "disabled",
    convertCase: "disabled",
    markLost: "hidden",
    editInfo: "disabled",
    changeStatus: "hidden",
  },
} as const;

/* ------------------------------------------------------------------ */
/*  详情页完整数据                                                      */
/* ------------------------------------------------------------------ */

/** */
export interface LeadDetail {
  /** */
  id: string;
  /** */
  name: string;
  /** */
  status: LeadStatus;
  /** */
  ownerId: string;
  /** */
  ownerLabel: string;
  /** */
  ownerInitials: string;
  /** */
  ownerAvatarClass: string;
  /** */
  groupId: string;
  /** */
  groupLabel: string;
  /** */
  banner: BannerPresetKey;
  /** 对应 `HEADER_BUTTON_PRESETS` 中的 key。 */
  buttons: HeaderButtonPresetKey;
  /** 流失态时为 true，全页只读。 */
  readonly: boolean;
  /** */
  info: LeadBasicInfo;
  /** */
  followups: LeadFollowupRecord[];
  /** */
  conversion: LeadConversionInfo;
  /** */
  log: LeadLogEntry[];
}
