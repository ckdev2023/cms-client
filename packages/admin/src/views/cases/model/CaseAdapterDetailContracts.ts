// ─── Detail Aggregate Contracts (p0-fe-002c) ─────────────────────
// 从 CaseAdapterTypes 拆出以遵守 max-lines 约束。
// 包含 detail aggregate adapter 的冻结契约常量与类型。

import type { CaseDetail } from "../types";

// ─── Aggregate Slice Contract (frozen by p0-fe-002c-01) ─────────
// Server CaseDetailAggregateDto 的顶层键名。
// admin adapter 的 parseAggregateSlices 必须按此集合解析聚合 DTO。
// 变更时须同步更新 CaseAdapterDetailAggregate.parseAggregateSlices
// 与 CaseAdapterDetailAggregate.test.ts 的 contract 断言。

export const AGGREGATE_SLICE_KEYS = [
  "case",
  "counts",
  "latestValidation",
  "latestSubmission",
  "latestReview",
  "documentProgressByProvider",
  "billing",
  "deepLink",
] as const;

// ─── Detail Deep-Link Fields Contract (frozen by p0-fe-002c-03) ──
// CaseDetailAggregate 顶层展平的 deep-link 字段。
// header / overview / info 直读 + customer 回链。
// 变更时须同步更新 buildDeepLinkFields 与 contract tests。

export const CASE_DETAIL_DEEP_LINK_FIELDS = [
  "customerId",
  "customerName",
  "groupId",
  "groupName",
  "ownerUserId",
  "ownerDisplayName",
  "assistantUserId",
  "assistantDisplayName",
] as const;

// ─── Detail Deep-Link Navigation Protocol (frozen by p0-fe-002c-03) ──
// case detail URL 的深链协议，供 cross-module link builders 对齐。
// `tabQueryKey` = URL query 中承载 tab 值的参数名。
// `defaultTab` = 省略 query 时的默认 tab。
// 变更时须同步更新 query.ts 中 parseCaseDetailQuery / buildCaseDetailQuery
// 与全部跨模块深链调用点。

export const CASE_DETAIL_NAV_PROTOCOL = {
  tabQueryKey: "tab",
  defaultTab: "overview",
} as const;

// ─── Detail Tab Counts (frozen by p0-fe-002c-02) ─────────────────
// 来自 server CaseDetailCounts，用于 tab badge 展示。
// 当前阶段只负责从 aggregate DTO 中读出 counts 子集，
// 不提前承诺 10 个 tabs 的最终字段全集。

/**
 *
 */
export interface CaseDetailTabCounts {
  /**
   *
   */
  documentItemsTotal: number;
  /**
   *
   */
  documentItemsDone: number;
  /**
   *
   */
  caseParties: number;
  /**
   *
   */
  tasks: number;
  /**
   *
   */
  tasksPending: number;
  /**
   *
   */
  communicationLogs: number;
  /**
   *
   */
  submissionPackages: number;
  /**
   *
   */
  generatedDocuments: number;
  /**
   *
   */
  validationRuns: number;
  /**
   *
   */
  reviewRecords: number;
  /**
   *
   */
  billingRecords: number;
  /**
   *
   */
  paymentRecords: number;
}

export const CASE_DETAIL_TAB_COUNTS_KEYS = [
  "documentItemsTotal",
  "documentItemsDone",
  "caseParties",
  "tasks",
  "tasksPending",
  "communicationLogs",
  "submissionPackages",
  "generatedDocuments",
  "validationRuns",
  "reviewRecords",
  "billingRecords",
  "paymentRecords",
] as const;

// ─── Detail Header Fields Contract (frozen by p0-fe-002c-02) ─────
// CaseDetail header / overview / info 区域使用的主链字段集合。
// 不含 tabs 内部字段（documents / forms / tasks 等由各自 adapter 管理）。

export const CASE_DETAIL_HEADER_FIELDS = [
  "id",
  "title",
  "client",
  "owner",
  "agency",
  "stage",
  "stageCode",
  "stageMeta",
  "statusBadge",
  "deadline",
  "deadlineMeta",
  "deadlineDanger",
  "progressPercent",
  "progressCount",
  "billingAmount",
  "billingMeta",
  "billingStatusKey",
  "docsCounter",
  "readonly",
  "customerId",
  "groupId",
  "groupName",
  "caseType",
  "applicationType",
  "acceptedDate",
  "targetDate",
] as const;

// ─── Header / Overview / Info Main-Chain Field Groups ──────────────
// (frozen by p0-fe-002c-02)
// 7 个主链字段组及其来源 slice / 产出属性映射。
// 用于 contract tests 确认 adapter 对 header / overview / info / read-only
// 场景的字段覆盖完整性。变更时须同步更新 buildDetailHeader、
// CaseAdapterDetailAggregate.test.ts 的 main-chain 断言。

/**
 * detail header / overview / info 7 个主链字段组的来源与产出映射。
 *
 * - `source`：字段值的 aggregate DTO 来源 slice。
 * - `detailFields`：映射到 CaseDetail 上的属性名集合。
 */
export const CASE_DETAIL_HEADER_MAIN_CHAIN_GROUPS = {
  customerId: { source: "deepLink", detailFields: ["customerId", "client"] },
  customerName: { source: "deepLink", detailFields: ["client"] },
  owner: { source: "deepLink", detailFields: ["owner"] },
  group: { source: "deepLink", detailFields: ["groupId", "groupName"] },
  deadline: {
    source: "caseRecord",
    detailFields: ["deadline", "deadlineMeta", "deadlineDanger", "targetDate"],
  },
  progress: {
    source: "counts",
    detailFields: ["progressPercent", "progressCount", "docsCounter"],
  },
  billing: {
    source: "billing",
    detailFields: ["billingAmount", "billingMeta", "billingStatusKey"],
  },
} as const;

/**
 * 主链字段组键名——用于 contract tests 遍历。
 */
export const CASE_DETAIL_HEADER_MAIN_CHAIN_GROUP_KEYS = [
  "customerId",
  "customerName",
  "owner",
  "group",
  "deadline",
  "progress",
  "billing",
] as const;

// ─── Slice Field Consumption Contracts (frozen by p0-fe-002c-01) ──
// 各 slice consumer 从 server DTO 读取的字段名。
// 变更时须同步更新 CaseAdapterDetailAggregate 中对应消费函数与 slices tests。

/**
 * billing slice 消费的 `CaseBillingSummary` 字段——
 * 对齐 server `cases.types-billing.ts#CaseBillingSummary`。
 */
export const BILLING_SLICE_CONSUMED_FIELDS = [
  "quotePrice",
  "unpaidAmount",
  "depositPaid",
  "finalPaymentPaid",
  "billingRiskAcknowledged",
  "billingRiskAcknowledgedAt",
  "billingRiskAckReasonCode",
] as const;

/**
 * latestValidation slice 消费的 `CaseLatestValidationSummary` 字段。
 */
export const LATEST_VALIDATION_SLICE_CONSUMED_FIELDS = [
  "status",
  "executedAt",
  "blockingCount",
  "warningCount",
] as const;

/**
 * documentProgressByProvider 每条记录消费的字段。
 */
export const PROVIDER_PROGRESS_ENTRY_CONSUMED_FIELDS = [
  "providerRole",
  "total",
  "done",
] as const;

// ─── CaseDetailAggregate (p0-fe-002c) ────────────────────────────

/**
 *
 */
export interface CaseDetailAggregate {
  /**
   *
   */
  detail: CaseDetail;
  /**
   *
   */
  tabCounts: CaseDetailTabCounts;
  /**
   *
   */
  customerId: string;
  /**
   *
   */
  customerName: string;
  /**
   *
   */
  groupId: string | null;
  /**
   *
   */
  groupName: string | null;
  /**
   *
   */
  ownerUserId: string;
  /**
   *
   */
  ownerDisplayName: string;
  /**
   *
   */
  assistantUserId: string | null;
  /**
   *
   */
  assistantDisplayName: string | null;
}
