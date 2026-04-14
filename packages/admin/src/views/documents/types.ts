/**
 * 资料中心共享契约层 — 纯 TS 类型。
 *
 * 权威来源：P0-CONTRACT.md §6（状态机）、§7（核心区块）、§8（关键动作）。
 */

// ─── Status ──────────────────────────────────────────────────────

/**
 *
 */
export type DocumentItemStatus =
  | "pending"
  | "uploaded_reviewing"
  | "approved"
  | "rejected"
  | "expired"
  | "waived";

/**
 *
 */
export interface DocumentStatusDef {
  /**
   *
   */
  label: string;
  /**
   *
   */
  badge: string;
}

/** Chip 色调（与 `ChipTone` 对齐），供双入口共享状态 badge 使用。 */
export type DocumentStatusTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger";

// ─── Provider ────────────────────────────────────────────────────

/**
 *
 */
export type DocumentProviderType =
  | "main_applicant"
  | "dependent_guarantor"
  | "employer_org"
  | "office_internal";

/**
 *
 */
export interface DocumentProviderDef {
  /**
   *
   */
  label: string;
}

// ─── Waived ──────────────────────────────────────────────────────

/**
 *
 */
export type WaivedReasonCode =
  | "visa_type_exempt"
  | "guarantor_family_exempt"
  | "equivalent_in_other_case"
  | "immigration_confirmed_exempt"
  | "other";

/**
 *
 */
export interface WaivedReasonDef {
  /**
   *
   */
  label: string;
  /**
   *
   */
  requiresNote: boolean;
}

// ─── Filters ─────────────────────────────────────────────────────

/** 空字符串表示"全部"；`"missing"` 为复合值，匹配 pending + rejected。 */
export type DocumentStatusFilter = "" | DocumentItemStatus | "missing";
/** 空字符串表示"全部"（不过滤）。 */
export type DocumentProviderFilter = "" | DocumentProviderType;

/**
 *
 */
export interface DocumentListFiltersState {
  /**
   *
   */
  status: DocumentStatusFilter;
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  provider: DocumentProviderFilter;
  /**
   *
   */
  search: string;
}

// ─── Summary Card ────────────────────────────────────────────────

/**
 *
 */
export type DocumentSummaryCardKey =
  | "pendingReview"
  | "missing"
  | "expired"
  | "sharedExpiryRisk";

/**
 *
 */
export interface DocumentSummaryCardData {
  /**
   *
   */
  key: DocumentSummaryCardKey;
  /**
   *
   */
  variant: "info" | "warning" | "danger" | "neutral";
  /**
   *
   */
  value: number;
  /**
   *
   */
  label: string;
}

// ─── List Item (cross-case list) ─────────────────────────────────

/**
 * 跨案件资料列表行数据（次级入口 7 列 + 排序/选择辅助字段）。
 */
export interface DocumentListItem {
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
  caseId: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  provider: DocumentProviderType;
  /**
   *
   */
  status: DocumentItemStatus;
  /** ISO 日期或 `null`（无截止日）。 */
  dueDate: string | null;
  /**
   *
   */
  dueDateLabel: string;
  /** ISO 日期时间或 `null`。 */
  lastReminderAt: string | null;
  /**
   *
   */
  lastReminderAtLabel: string;
  /** 本地归档相对路径；`null` 表示"未登记"。 */
  relativePath: string | null;
  /** 共享版本过期风险标记（被多案件引用且已过期/即将过期）。 */
  sharedExpiryRisk: boolean;
  /** 引用该版本的案件数（> 1 时显示多案件引用提示）。 */
  referenceCount: number;
}

// ─── Review & Actions ────────────────────────────────────────────

/**
 *
 */
export interface ReferenceCandidate {
  /**
   *
   */
  id: string;
  /**
   *
   */
  sourceCaseId: string;
  /**
   *
   */
  sourceCaseName: string;
  /**
   *
   */
  sourceDocName: string;
  /**
   *
   */
  version: number;
  /**
   *
   */
  reviewedAt: string;
  /**
   *
   */
  expiryDate: string | null;
}

/**
 *
 */
export interface RiskAffectedCase {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  docName: string;
}

/**
 *
 */
export interface SharedExpiryRiskData {
  /**
   *
   */
  versionInfo: string;
  /**
   *
   */
  affectedCases: RiskAffectedCase[];
  /**
   *
   */
  suggestedAction: string;
}

// ─── Completion Rate ─────────────────────────────────────────────

/**
 *
 */
export interface CompletionRate {
  /**
   *
   */
  collected: number;
  /**
   *
   */
  total: number;
  /**
   *
   */
  percent: number;
  /**
   *
   */
  label: string;
}
