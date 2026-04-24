import type { Case } from "../model/coreEntities";
import type { CaseRoleTier } from "../auth/permissions.service";
import type { CaseBillingSummary as _CaseBillingSummary } from "./cases.types-billing";

// ────────────────────────────────────────────────────────────────
// 写接口错误码 — 冻结契约
//
// 每个 write endpoint 可能抛出的语义错误由此枚举集中定义，
// admin adapter 映射为 i18n key，不依赖 message 文本。
// ────────────────────────────────────────────────────────────────

export const CASE_WRITE_ERROR_CODES = {
  S9_READONLY: "CASE_S9_READONLY",
  TRANSITION_NOT_ALLOWED: "CASE_TRANSITION_NOT_ALLOWED",
  TRANSITION_CONFLICT: "CASE_TRANSITION_CONFLICT",
  GATE_A_MISSING_PRIMARY_PARTY: "CASE_GATE_A_MISSING_PRIMARY_PARTY",
  GATE_B_INCOMPLETE_REQUIRED_ITEMS: "CASE_GATE_B_INCOMPLETE_REQUIRED_ITEMS",
  GATE_VALIDATION_RUN_MISSING: "CASE_GATE_VALIDATION_RUN_MISSING",
  GATE_VALIDATION_RUN_NOT_PASSED: "CASE_GATE_VALIDATION_RUN_NOT_PASSED",
  GATE_VALIDATION_RUN_STALE: "CASE_GATE_VALIDATION_RUN_STALE",
  GATE_REVIEW_NOT_APPROVED: "CASE_GATE_REVIEW_NOT_APPROVED",
  GATE_C_BILLING_RISK_UNACKNOWLEDGED: "CASE_GATE_C_BILLING_RISK_UNACKNOWLEDGED",
  BILLING_RISK_ACK_FAILED: "CASE_BILLING_RISK_ACK_FAILED",
  POST_APPROVAL_STAGE_INVALID: "CASE_POST_APPROVAL_STAGE_INVALID",
  POST_APPROVAL_BILLING_BLOCKED: "CASE_POST_APPROVAL_BILLING_BLOCKED",
  POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED:
    "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED",
  CROSS_GROUP_REASON_REQUIRED: "CASE_CROSS_GROUP_REASON_REQUIRED",
  GROUP_TRANSFER_REASON_REQUIRED: "CASE_GROUP_TRANSFER_REASON_REQUIRED",
  INVALID_ENUM: "CASE_INVALID_ENUM",
  NOT_FOUND: "CASE_NOT_FOUND",
  REF_NOT_FOUND: "CASE_REF_NOT_FOUND",

  PARTY_PARENT_NOT_FOUND: "CASE_PARTY_PARENT_NOT_FOUND",
  PARTY_NOT_FOUND: "CASE_PARTY_NOT_FOUND",
  PARTY_INVALID_TYPE: "CASE_PARTY_INVALID_TYPE",
} as const;

// ────────────────────────────────────────────────────────────────
// validation-runs / review-records / submission-packages 错误码
//
// 从 case 视角统一定义，admin adapter 映射为 i18n key。
// ────────────────────────────────────────────────────────────────

export const VALIDATION_SUBMISSION_ERROR_CODES = {
  VR_CASE_NOT_FOUND: "VR_CASE_NOT_FOUND",
  VR_CASE_S9_READONLY: "VR_CASE_S9_READONLY",
  VR_NOT_FOUND: "VR_NOT_FOUND",

  RR_CASE_NOT_FOUND: "RR_CASE_NOT_FOUND",
  RR_CASE_S9_READONLY: "RR_CASE_S9_READONLY",
  RR_NOT_FOUND: "RR_NOT_FOUND",
  RR_INVALID_DECISION: "RR_INVALID_DECISION",
  RR_VALIDATION_RUN_NOT_LATEST: "RR_VALIDATION_RUN_NOT_LATEST",

  SP_CASE_NOT_FOUND: "SP_CASE_NOT_FOUND",
  SP_NOT_FOUND: "SP_NOT_FOUND",
  SP_CASE_STAGE_INVALID: "SP_CASE_STAGE_INVALID",
  SP_SUPPLEMENT_REQUIRES_RELATED: "SP_SUPPLEMENT_REQUIRES_RELATED",
  SP_INITIAL_NO_RELATED: "SP_INITIAL_NO_RELATED",
  SP_RELATED_NOT_FOUND: "SP_RELATED_NOT_FOUND",
  SP_INVALID_SUBMISSION_KIND: "SP_INVALID_SUBMISSION_KIND",
  SP_INVALID_ITEM_TYPE: "SP_INVALID_ITEM_TYPE",
  SP_DUPLICATE_ITEM: "SP_DUPLICATE_ITEM",
  SP_MISSING_MINIMUM_FIELDS: "SP_MISSING_MINIMUM_FIELDS",
} as const;

/**
 *
 */
export type ValidationSubmissionErrorCode =
  (typeof VALIDATION_SUBMISSION_ERROR_CODES)[keyof typeof VALIDATION_SUBMISSION_ERROR_CODES];

/**
 *
 */
export type CaseWriteErrorCode =
  (typeof CASE_WRITE_ERROR_CODES)[keyof typeof CASE_WRITE_ERROR_CODES];

// ────────────────────────────────────────────────────────────────
// 写接口请求参数 — 冻结契约
//
// 以下类型是 admin adapter 和 controller 之间的唯一接口约定。
// P1 扩展通过追加可选字段方式叠加，不删除/改名现有属性。
// ────────────────────────────────────────────────────────────────

/** 创建案件请求参数。 */
export type CaseCreateInput = {
  customerId: string;
  caseTypeCode: string;
  ownerUserId: string;
  groupId?: string | null;
  stage?: string;
  status?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
  caseNo?: string | null;
  caseName?: string | null;
  caseSubtype?: string | null;
  applicationType?: string | null;
  /** @deprecated P0 不使用 Company 实体。 */
  companyId?: string | null;
  priority?: string;
  riskLevel?: string;
  assistantUserId?: string | null;
  sourceChannel?: string | null;
  signedAt?: string | null;
  acceptedAt?: string | null;
  submissionDate?: string | null;
  resultDate?: string | null;
  residenceExpiryDate?: string | null;
  resultOutcome?: string | null;
  quotePrice?: number | null;
  /**
   * 跨组建案原因 — 当指定 groupId 与客户默认 group 不同时必填。
   * 对齐 P0 权威基线 §3.2：跨组建案必须留痕（操作人、时间、原因）。
   */
  crossGroupReason?: string | null;
};

/** 更新案件请求参数。 */
export type CaseUpdateInput = {
  caseTypeCode?: string;
  ownerUserId?: string;
  dueAt?: string | null;
  metadata?: Record<string, unknown>;
  caseNo?: string | null;
  caseName?: string | null;
  caseSubtype?: string | null;
  applicationType?: string | null;
  /** @deprecated P0 不使用 Company 实体。 */
  companyId?: string | null;
  priority?: string;
  riskLevel?: string;
  assistantUserId?: string | null;
  sourceChannel?: string | null;
  signedAt?: string | null;
  acceptedAt?: string | null;
  submissionDate?: string | null;
  resultDate?: string | null;
  residenceExpiryDate?: string | null;
  archivedAt?: string | null;
  resultOutcome?: string | null;
  quotePrice?: number | null;
  overseasVisaStartAt?: string | null;
  entryConfirmedAt?: string | null;
  /**
   * 变更案件归属组 — 变更时必须提供 groupTransferReason。
   * 对齐 P0 权威基线 §3.2：转组必须留痕。
   */
  groupId?: string | null;
  /** 转组原因 — 当 groupId 变更时必填。 */
  groupTransferReason?: string | null;
};

/**
 * 状态变更请求参数。
 *
 * `toStage` 与 `toStatus` 语义相同（兼容期），优先取 `toStage`。
 */
export type CaseTransitionInput = {
  toStage?: string;
  toStatus?: string;
  /** 进入 S9 时的结案原因（非 S9 目标时可省略）。 */
  closeReason?: string | null;
};

export type { CaseBillingRiskAckInput } from "./cases.types-billing";

/**
 * 下签后子阶段变更请求参数。
 *
 * 合法值：waiting_final_payment | coe_sent | overseas_visa_applying | entry_success
 */
export type PostApprovalStageInput = {
  stage: string;
};

/**
 * 资源级可见性过滤（SQL WHERE 条件）。
 *
 * - admin：全量
 * - staff：本组 + 负责/协作案件
 * - viewer：仅负责/协作案件
 */
export type CaseVisibilityFilter = {
  userId: string;
  roleTier: CaseRoleTier;
  groupId?: string;
};

/** 列表查询请求参数。 */
export type CaseListInput = {
  stage?: string;
  status?: string;
  resultOutcome?: string;
  ownerUserId?: string;
  customerId?: string;
  groupId?: string;
  priority?: string;
  riskLevel?: string;
  companyId?: string;
  page?: number;
  limit?: number;
  visibility?: CaseVisibilityFilter;
};

/**
 * 案件列表项 DTO — Case 基础上附加关联实体展示名。
 *
 * 前端列表页消费此结构，避免在浏览器侧逐行查询客户/用户/分组。
 */
export type CaseListItemDto = Case & {
  customerName: string;
  groupName: string | null;
  ownerDisplayName: string;
  assistantDisplayName: string | null;
};

/** 案件列表分页结果 DTO。 */
export type CaseListResultDto = {
  items: CaseListItemDto[];
  total: number;
  page: number;
  limit: number;
};

// ────────────────────────────────────────────────────────────────
// Case Detail Aggregate DTO — 冻结契约
//
// 覆盖 admin detail 页面 10 个 tab 的共用需求：
//   header / overview / info / documents / forms / tasks / deadlines /
//   validation / billing / messages / log
//
// 此类型是前端 CaseRepository adapter 的唯一数据源；
// tab 内部明细（document_items 列表、task 列表等）由各自端点提供，
// 此处仅提供计数器与摘要。
//
// P0 边界：不含 CaseWorkflowStep、extra_fields、CaseDeadline 表
// （CaseDeadline 表尚未落地）。P1 扩展通过追加字段方式叠加，不破坏现有属性。
// ────────────────────────────────────────────────────────────────

/** 案件详情 tab 级别计数器 — 覆盖全部 10 个 tab 的 badge 需求。 */
export type CaseDetailCounts = {
  documentItemsTotal: number;
  documentItemsDone: number;
  caseParties: number;
  tasks: number;
  tasksPending: number;
  communicationLogs: number;
  submissionPackages: number;
  generatedDocuments: number;
  validationRuns: number;
  reviewRecords: number;
  billingRecords: number;
  paymentRecords: number;
};

/** 最近一次校验概要。 */
export type CaseLatestValidationSummary = {
  id: string;
  status: string;
  executedAt: string;
  blockingCount: number;
  warningCount: number;
};

/**
 * 最近一次提交包摘要 — 概览 / 校验 tab 消费。
 */
export type CaseLatestSubmissionSummary = {
  id: string;
  submissionNo: number;
  submissionKind: string;
  submittedAt: string;
  relatedSubmissionId: string | null;
};

/**
 * 最近一次复核摘要 — 概览 / 校验 tab 消费。
 */
export type CaseLatestReviewSummary = {
  id: string;
  decision: string;
  reviewedAt: string;
  reviewerUserId: string | null;
  reviewerDisplayName: string | null;
};

/**
 * 按提供方（provided_by_role）分组的资料完成率 — 概览 tab 进度卡消费。
 *
 * 规则对齐 P0-CONTRACT-DETAIL §4.2：
 *   done = status ∈ {approved, waived}
 *   total = 排除 status='deleted'
 */
export type CaseDocumentProgressByProvider = {
  providerRole: string;
  total: number;
  done: number;
};

export type { CaseBillingSummary } from "./cases.types-billing";

/**
 * 跨模块深链上下文 — 其他模块（customer / documents / dashboard）
 * 指向案件或从案件跳回时所需的标识与展示字段。
 *
 * admin 路由协议：
 *   案件详情 → /cases/:caseId?tab=xxx
 *   回链客户 → /customers/:customerId
 */
export type CaseDeepLinkContext = {
  customerId: string;
  customerName: string;
  groupId: string | null;
  groupName: string | null;
  ownerUserId: string;
  ownerDisplayName: string;
  assistantUserId: string | null;
  assistantDisplayName: string | null;
};

/**
 * 案件详情聚合 DTO — 供 admin detail 页面一次性消费。
 *
 * 将 header / overview / info / tabs counts / billing / validation /
 * deep-links 所依赖字段收在一个可引用契约中，
 * 避免散落在多个 controller 响应里。
 *
 * 设计原则：
 * 1. `case` 携带完整 Case 实体，admin adapter 按需取用字段
 * 2. `counts` 覆盖每个 tab badge 的计数器需求
 * 3. `latestValidation` / `latestSubmission` / `latestReview` 为概览摘要
 * 4. `documentProgressByProvider` 为概览资料完成率按提供方展开
 * 5. `billing` 为概览财务卡与收费 tab 头部统计
 * 6. `deepLink` 为跨模块跳转所需标识与展示名
 * 7. P1 扩展追加字段（如 workflowStep 概要），不删除/改名现有属性
 */
export type CaseDetailAggregateDto = {
  case: Case;
  counts: CaseDetailCounts;
  latestValidation: CaseLatestValidationSummary | null;
  latestSubmission: CaseLatestSubmissionSummary | null;
  latestReview: CaseLatestReviewSummary | null;
  documentProgressByProvider: CaseDocumentProgressByProvider[];
  billing: _CaseBillingSummary;
  deepLink: CaseDeepLinkContext;
};

// ────────────────────────────────────────────────────────────────
// Case-Party 写接口请求参数 — 冻结契约
//
// 从 caseParties.service 提升到统一契约层，
// 保证 admin adapter 引用单一来源。
// ────────────────────────────────────────────────────────────────

/** 创建案件关联人请求参数。 */
export type CasePartyCreateInput = {
  caseId: string;
  partyType: string;
  customerId?: string | null;
  contactPersonId?: string | null;
  relationToCase?: string | null;
  isPrimary?: boolean;
};

/** 更新案件关联人请求参数。 */
export type CasePartyUpdateInput = {
  partyType?: string;
  customerId?: string | null;
  contactPersonId?: string | null;
  relationToCase?: string | null;
  isPrimary?: boolean;
};

/** 关联人列表查询请求参数。 */
export type CasePartyListInput = {
  caseId?: string;
  page?: number;
  limit?: number;
};

// ────────────────────────────────────────────────────────────────
// Validation / Review / Submission 写接口请求参数 — case 视角冻结契约
//
// 各模块 service 内部仍持有同名类型；此处再导出一份，
// 供 admin adapter 与跨模块类型检查统一引用。
// ────────────────────────────────────────────────────────────────

/** 创建校验运行请求参数。 */
export type ValidationRunCreateInput = {
  caseId: string;
  rulesetRef?: Record<string, unknown>;
};

/** 校验运行列表查询参数。 */
export type ValidationRunListInput = {
  caseId?: string;
  page?: number;
  limit?: number;
};

/** 创建复核记录请求参数。 */
export type ReviewRecordCreateInput = {
  caseId: string;
  validationRunId: string;
  decision: "approved" | "rejected";
  comment?: string | null;
};

/** 复核记录列表查询参数。 */
export type ReviewRecordListInput = {
  caseId?: string;
  validationRunId?: string;
  page?: number;
  limit?: number;
};

/** 提交包明细项请求参数。 */
export type SubmissionPackageCreateItemInput = {
  itemType: string;
  refId: string;
  snapshotPayload?: Record<string, unknown> | null;
};

/** 创建提交包请求参数。 */
export type SubmissionPackageCreateInput = {
  caseId: string;
  submissionKind?: string;
  submittedAt?: string;
  validationRunId?: string | null;
  reviewRecordId?: string | null;
  authorityName?: string | null;
  acceptanceNo?: string | null;
  receiptStorageType?: string | null;
  receiptRelativePathOrKey?: string | null;
  relatedSubmissionId?: string | null;
  items: SubmissionPackageCreateItemInput[];
};

/** 提交包列表查询参数。 */
export type SubmissionPackageListInput = {
  caseId?: string;
  page?: number;
  limit?: number;
};

export type {
  CaseCommunicationLogListInput,
  CaseCommunicationLogDto,
  CaseCommunicationLogListResult,
  CaseTimelineListInput,
  CaseTimelineLogDto,
  CaseLogCategory,
} from "./cases.types-comms-timeline";

export {
  GENERATED_DOCUMENT_ERROR_CODES,
  type GeneratedDocumentDto,
  type GeneratedDocumentListResult,
  type GeneratedDocumentCreateInput,
} from "./cases.types-generated-docs";

export type {
  CaseTaskListInput,
  CaseTaskDto,
  CaseTaskListResult,
  CaseDeadlineType,
  CaseDeadlineSeverity,
  CaseDeadlineDto,
  CaseDeadlineListResult,
  CaseReminderListInput,
  CaseReminderDto,
  CaseReminderListResult,
  CaseDeadlineSourceFields,
} from "./cases.types-task-deadline";

export {
  BILLING_ERROR_CODES,
  type BillingErrorCode,
  type CaseBillingPlanListInput,
  type CaseBillingPlanDto,
  type CaseBillingPlanListResult,
  type CaseBillingPlanCreateInput,
  type CaseBillingPlanUpdateInput,
  type CaseBillingPlanTransitionInput,
  type CasePaymentRecordListInput,
  type CasePaymentRecordDto,
  type CasePaymentRecordListResult,
  type CasePaymentRecordCreateInput,
  type CasePaymentRecordVoidInput,
  type CaseBillingGuardResult,
  type CaseBillingCacheSyncFields,
  type CaseBillingRiskAckRecord,
  type CaseBillingSummaryFull,
  type CaseBillingTabAggregate,
  type CaseBillingTimelineAction,
  type CaseBillingMilestoneHint,
} from "./cases.types-billing";
