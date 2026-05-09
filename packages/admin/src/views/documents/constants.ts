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
  pending: ["uploaded_reviewing"],
  uploaded_reviewing: ["approved", "rejected"],
  approved: ["expired", "uploaded_reviewing"],
  rejected: ["uploaded_reviewing"],
  expired: ["uploaded_reviewing"],
  waived: [],
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

// ─── Follow-up (催办) eligibility ────────────────────────────────

/**
 * 服务端 `documentItems.followUp` 允许的资料项后端原始状态白名单。
 *
 * 与 `packages/server/src/modules/core/document-items/documentItems.service.ts`
 * `followUp` 的 `allowedStatuses` 必须保持一致，否则前端会渲染出
 * 必然 400 的"催办"按钮。
 */
const FOLLOW_UP_ALLOWED_BACKEND_STATUSES: ReadonlySet<string> = new Set([
  "waiting_upload",
  "revision_required",
]);

/**
 * 判断"催办"按钮是否应可见。
 *
 * 等价于服务端 `followUp(...)` 守卫：
 * - 后端状态属于 {waiting_upload, revision_required} 一律允许。
 * - 后端状态为 `pending` 时，仅当资料项为 `category === "questionnaire"`
 *   时允许（问卷类资料的初始 pending 即为"等待客户填写"）。
 *
 * @param backendStatus - 后端原始 `document_items.status`
 * @param category - 资料项类别（`"standard"` / `"questionnaire"` / 等）
 * @returns 是否允许催办
 */
export function isFollowUpAllowed(
  backendStatus: string,
  category?: string | null,
): boolean {
  if (FOLLOW_UP_ALLOWED_BACKEND_STATUSES.has(backendStatus)) return true;
  if (backendStatus === "pending" && category === "questionnaire") return true;
  return false;
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
