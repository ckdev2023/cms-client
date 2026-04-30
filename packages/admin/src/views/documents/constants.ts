import type {
  DocumentItemStatus,
  DocumentListFiltersState,
  DocumentProviderDef,
  DocumentProviderType,
  DocumentStatusDef,
  DocumentStatusTone,
  WaivedReasonCode,
  WaivedReasonDef,
} from "./types";

// ─── Status ──────────────────────────────────────────────────────

export const DOCUMENT_STATUSES: Record<DocumentItemStatus, DocumentStatusDef> =
  {
    pending: { labelKey: "documents.status.pending", badge: "badge-orange" },
    uploaded_reviewing: {
      labelKey: "documents.status.uploadedReviewing",
      badge: "badge-blue",
    },
    approved: {
      labelKey: "documents.status.approved",
      badge: "badge-green",
    },
    rejected: { labelKey: "documents.status.rejected", badge: "badge-red" },
    expired: { labelKey: "documents.status.expired", badge: "badge-red" },
    waived: { labelKey: "documents.status.waived", badge: "badge-gray" },
  };

export const DOCUMENT_STATUS_IDS: readonly DocumentItemStatus[] = [
  "pending",
  "uploaded_reviewing",
  "approved",
  "rejected",
  "expired",
  "waived",
] as const;

// ─── Provider ────────────────────────────────────────────────────

export const DOCUMENT_PROVIDERS: Record<
  DocumentProviderType,
  DocumentProviderDef
> = {
  main_applicant: { labelKey: "documents.providers.mainApplicant" },
  dependent_guarantor: {
    labelKey: "documents.providers.dependentGuarantor",
  },
  employer_org: { labelKey: "documents.providers.employerOrg" },
  office_internal: { labelKey: "documents.providers.officeInternal" },
};

export const DOCUMENT_PROVIDER_IDS: readonly DocumentProviderType[] = [
  "main_applicant",
  "dependent_guarantor",
  "employer_org",
  "office_internal",
] as const;

// ─── Waived Reason ───────────────────────────────────────────────

export const WAIVED_REASONS: Record<WaivedReasonCode, WaivedReasonDef> = {
  visa_type_exempt: {
    labelKey: "documents.waive.reasons.visaTypeExempt",
    requiresNote: false,
  },
  guarantor_family_exempt: {
    labelKey: "documents.waive.reasons.guarantorFamilyExempt",
    requiresNote: false,
  },
  equivalent_in_other_case: {
    labelKey: "documents.waive.reasons.equivalentInOtherCase",
    requiresNote: false,
  },
  immigration_confirmed_exempt: {
    labelKey: "documents.waive.reasons.immigrationConfirmedExempt",
    requiresNote: false,
  },
  other: { labelKey: "documents.waive.reasons.other", requiresNote: true },
};

export const WAIVED_REASON_CODES: readonly WaivedReasonCode[] = [
  "visa_type_exempt",
  "guarantor_family_exempt",
  "equivalent_in_other_case",
  "immigration_confirmed_exempt",
  "other",
] as const;

// ─── Status Transitions (P0-CONTRACT §6.2) ──────────────────────

export const STATUS_TRANSITIONS: Record<
  DocumentItemStatus,
  readonly DocumentItemStatus[]
> = {
  pending: ["uploaded_reviewing", "waived"],
  uploaded_reviewing: ["approved", "rejected", "waived"],
  approved: ["expired", "uploaded_reviewing"],
  rejected: ["uploaded_reviewing", "waived"],
  expired: ["uploaded_reviewing"],
  waived: ["pending"],
};

// ─── Case-detail legacy key → P0 status (§6.4) ─────────────────

export const LEGACY_STATUS_MAP: Record<string, DocumentItemStatus> = {
  idle: "pending",
  submitted: "uploaded_reviewing",
  reviewed: "approved",
  done: "approved",
  pending: "pending",
  uploaded_reviewing: "uploaded_reviewing",
  approved: "approved",
  rejected: "rejected",
  expired: "expired",
  waived: "waived",
};

// ─── Default Filters ─────────────────────────────────────────────

export const DEFAULT_DOCUMENT_LIST_FILTERS: DocumentListFiltersState = {
  status: "",
  caseId: "",
  provider: "",
  search: "",
};

// ─── Status → Chip tone (shared across dual entries) ────────────

export const DOCUMENT_STATUS_TONE: Record<
  DocumentItemStatus,
  DocumentStatusTone
> = {
  pending: "warning",
  uploaded_reviewing: "primary",
  approved: "success",
  rejected: "danger",
  expired: "danger",
  waived: "neutral",
};

/**
 * 将任意状态 key（含 case-detail 遗留 key）映射为 Chip 色调。
 *
 * @param rawStatus - 原始状态 key
 * @returns Chip 色调
 */
export function getStatusTone(rawStatus: string): DocumentStatusTone {
  const canonical =
    LEGACY_STATUS_MAP[rawStatus] ?? (rawStatus as DocumentItemStatus);
  return DOCUMENT_STATUS_TONE[canonical] ?? "neutral";
}

// ─── Status sort priority (§3.1) ────────────────────────────────

/**
 * 默认排序优先级：退回补正 > 过期 > 缺件 > 待审核 > 通过 > 无需提供。
 * 数值越小优先级越高。
 */
export const STATUS_SORT_PRIORITY: Record<DocumentItemStatus, number> = {
  rejected: 0,
  expired: 1,
  pending: 2,
  uploaded_reviewing: 3,
  approved: 4,
  waived: 5,
};

// ─── Label Helpers ───────────────────────────────────────────────

/**
 * 根据状态 key 获取 i18n 标签 key。
 *
 * @param status - 状态 key 或自由文本
 * @returns i18n 标签 key；未匹配时返回原始值
 */
export function getStatusLabelKey(status: DocumentItemStatus | string): string {
  return DOCUMENT_STATUSES[status as DocumentItemStatus]?.labelKey ?? status;
}

/**
 * 根据提供方 key 获取 i18n 标签 key。
 *
 * @param provider - 提供方 key 或自由文本
 * @returns i18n 标签 key；未匹配时返回原始值
 */
export function getProviderLabelKey(
  provider: DocumentProviderType | string,
): string {
  return (
    DOCUMENT_PROVIDERS[provider as DocumentProviderType]?.labelKey ?? provider
  );
}

/**
 * 根据 waived 原因码获取 i18n 标签 key。
 *
 * @param code - 原因码或自由文本
 * @returns i18n 标签 key；未匹配时返回原始值
 */
export function getWaivedReasonLabelKey(
  code: WaivedReasonCode | string,
): string {
  return WAIVED_REASONS[code as WaivedReasonCode]?.labelKey ?? code;
}
