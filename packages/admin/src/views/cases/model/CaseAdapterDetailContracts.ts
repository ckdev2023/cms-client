/* eslint-disable max-lines */
// ─── Detail Aggregate Contracts (p0-fe-002c) ─────────────────────
import type { CaseDetail, CustomerLocalizedNames } from "../types";

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
  "failureCloseoutCheck",
  "currentResidencePeriod",
  "successCloseoutCheck",
] as const;

// ─── Detail Deep-Link Fields Contract (frozen by p0-fe-002c-03) ──
// CaseDetailAggregate 顶层展平的 deep-link 字段。
// header / overview / info 直读 + customer 回链。
// 变更时须同步更新 buildDeepLinkFields 与 contract tests。

export const CASE_DETAIL_DEEP_LINK_FIELDS = [
  "customerId",
  "customerName",
  "customerLocalizedNames",
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
  /** P1: questionnaire 类资料项总数（含在 documentItemsTotal 内）。 */
  questionnaireItemsTotal: number;
  /** P1: questionnaire 类已完成资料项数（含在 documentItemsDone 内）。 */
  questionnaireItemsDone: number;
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
  "questionnaireItemsTotal",
  "questionnaireItemsDone",
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
  "titleFallbackParts",
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
  "priority",
  "riskLevel",
  "ownerUserId",
  "assistantUserId",
  "jurisdictionAuthority",
  "remark",
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
  "finalPaymentMilestoneMatched",
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

// ─── Overview Tab Consumed Fields (frozen by p0-fe-006a-01) ──────
// overview tab + sidebar 从 CaseDetail 读取的字段集合。
// 变更时须同步更新 CaseOverviewTab.vue、CaseOverviewSidebar.vue
// 与 overview tab contract tests。

/**
 * overview tab 主区域消费的 CaseDetail 字段。
 *
 * 4 张 summary card + provider progress + next action + timeline。
 */
export const OVERVIEW_TAB_MAIN_CONSUMED_FIELDS = [
  "stage",
  "stageMeta",
  "deadline",
  "deadlineDanger",
  "deadlineMeta",
  "progressPercent",
  "progressCount",
  "billingAmount",
  "billingMeta",
  "providerProgress",
  "nextAction",
  "overviewActions",
  "timeline",
] as const;

/**
 * overview sidebar 消费的 CaseDetail 字段。
 *
 * risk summary + team + validation hint。
 */
export const OVERVIEW_TAB_SIDEBAR_CONSUMED_FIELDS = [
  "risk",
  "deadlineDanger",
  "team",
  "validationHint",
] as const;

/**
 * overview tab + header 的 customerId 回链所需字段。
 *
 * 由 CaseDetailView header 和 CaseOverviewTab 客户信息行共用。
 */
export const OVERVIEW_TAB_CUSTOMER_BACK_LINK_FIELDS = [
  "customerId",
  "client",
  "groupId",
  "groupName",
] as const;

/**
 * 4 张 summary card 定义——字段来源与展示口径。
 *
 * 每张卡片 `id` 对应 UI 的 data-testid / i18n key 后缀。
 * `fields` 列举该卡片从 CaseDetail 读取的属性。
 * `source` 标注聚合 DTO 来源 slice。
 */
export const OVERVIEW_SUMMARY_CARD_DEFS = [
  {
    id: "stage",
    fields: ["stage", "stageMeta"],
    source: "caseRecord",
  },
  {
    id: "deadline",
    fields: ["deadline", "deadlineDanger", "deadlineMeta"],
    source: "caseRecord",
  },
  {
    id: "progress",
    fields: ["progressPercent", "progressCount"],
    source: "counts",
  },
  {
    id: "billing",
    fields: ["billingAmount", "billingMeta"],
    source: "billing",
  },
] as const;

// ─── Info Tab Consumed Fields (frozen by p0-fe-006a-02) ──────────
// info tab 从 CaseDetail 读取的字段集合。
// 变更时须同步更新 CaseInfoTab.vue 与 info tab contract tests。

/**
 * info tab 案件属性卡消费的 CaseDetail 字段。
 *
 * 来源均为 adapter `buildDetailHeader` 产出；
 * `agency` 与 info tab「管辖机构」展示一致，取自 case `jurisdictionAuthority`。
 */
export const INFO_TAB_CASE_ATTRIBUTES_FIELDS = [
  "id",
  "caseType",
  "applicationType",
  "acceptedDate",
  "targetDate",
  "agency",
] as const;

/**
 * info tab 关联主体卡消费的 CaseDetail 字段。
 *
 * `relatedParties` 当前为 EMPTY_LISTS 占位，
 * 后续由 case-parties adapter 填充。
 */
export const INFO_TAB_RELATED_PARTIES_FIELDS = ["relatedParties"] as const;

/**
 * info tab read-only 规则。
 *
 * - `alwaysReadonly`：系统生成或当前无编辑入口的字段，无论 case stage 都展示为 disabled。
 * - P0 阶段所有 info tab 字段均为 display-only（edit 功能尚未实现），
 *   因此 `readonly` prop 仅控制全局 S9 归档横幅，不影响字段内部样式。
 */
export const INFO_TAB_READONLY_RULES = {
  alwaysReadonly: [
    "id",
    "caseType",
    "applicationType",
    "acceptedDate",
    "targetDate",
    "agency",
  ],
} as const;

// ─── P1 BMV Detail Consumed Fields (frozen by p1-fe-001-01) ──────
// BMV 经营管理签案件从 case record 读取的专属字段。
// 非 BMV 案件上这些字段为 null / 0 / 空字符串（降级运行）。
// 变更时须同步更新 CaseAdapterDetailAggregate.buildBmvFields
// 与对应 contract tests。

/**
 * case record 上 BMV 专属字段 — adapter 从 caseRecord 读取。
 */
export const BMV_CASE_RECORD_CONSUMED_FIELDS = [
  "currentWorkflowStepCode",
  "visaPlan",
  "supplementCount",
  "resultOutcome",
  "postApprovalStage",
  "coeIssuedAt",
  "coeExpiryDate",
  "coeSentAt",
  "overseasVisaStartAt",
  "entryConfirmedAt",
  "caseTypeCode",
] as const;

/**
 * CaseDetail 上 BMV 专属字段属性名 — 用于 contract tests 断言覆盖完整性。
 */
export const BMV_DETAIL_TARGET_KEYS = [
  "workflowStep",
  "failureCloseout",
  "visaPlan",
  "supplementCount",
  "resultOutcome",
  "postApprovalStage",
  "coeIssuedDate",
  "coeExpiryDate",
  "overseasVisaStartDate",
  "entryConfirmedDate",
  "residencePeriod",
  "reminderSchedule",
  "successCloseout",
] as const;

// ─── P1 Failure Closeout Consumed Fields (frozen by p1-fe-001-01) ─
// failureCloseoutCheck slice 消费的字段。
// 变更时须同步更新 CaseAdapterDetailAggregate.buildFailureCloseoutInfo。

/**
 * failureCloseoutCheck slice 消费的字段。
 */
export const FAILURE_CLOSEOUT_CONSUMED_FIELDS = [
  "isFailurePath",
  "attribution",
] as const;

/**
 * attribution 子对象消费的字段。
 */
export const FAILURE_CLOSEOUT_ATTRIBUTION_CONSUMED_FIELDS = [
  "reasonCode",
  "reasonLabel",
  "canDirectClose",
  "closeReasonRequired",
] as const;

// ─── P1 Residence Period / Success Closeout Consumed Fields (p1-fe-004-02) ─

/** currentResidencePeriod slice 消费字段。 */
export const RESIDENCE_PERIOD_CONSUMED_FIELDS = [
  "id",
  "visaType",
  "statusOfResidence",
  "periodYears",
  "periodLabel",
  "validFrom",
  "validUntil",
  "cardNumber",
  "entryDate",
  "reminderCreated",
] as const;

/** successCloseoutCheck slice 消费字段。 */
export const SUCCESS_CLOSEOUT_CONSUMED_FIELDS = [
  "allSatisfied",
  "preconditions",
] as const;

/** preconditions 子对象消费字段。 */
export const SUCCESS_CLOSEOUT_PRECONDITION_CONSUMED_FIELDS = [
  "code",
  "label",
  "satisfied",
] as const;

// ─── CaseDetailAggregate (p0-fe-002c) ────────────────────────────

/** 案件详情页查询聚合结果。 */
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
  /** 顾客多语言名称（R27-S）。 */
  customerLocalizedNames: CustomerLocalizedNames;
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
