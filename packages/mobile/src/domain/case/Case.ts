import type { DocumentRequirementStatus } from "@domain/documents/UserDocument";

/**
 * P0 案件阶段枚举（§3.1）。
 */
export type CaseStage =
  | "S1"
  | "S2"
  | "S3"
  | "S4"
  | "S5"
  | "S6"
  | "S7"
  | "S8"
  | "S9";

/**
 * P0 案件结果枚举。
 */
export type CaseResultOutcome =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn";

/**
 * P0 案件优先度。
 */
export type CasePriority = "low" | "medium" | "high" | "urgent";

/**
 * P0 案件风险等级。
 */
export type CaseRiskLevel = "none" | "low" | "medium" | "high";

/**
 * P0 案件申请类型。
 */
export type CaseApplicationType = "recognition" | "change" | "renewal";

/**
 * 案件摘要（列表用）。
 * P0 §3.5 Case のうち、リスト表示に必要な最小フィールド。
 */
export type CaseSummary = {
  /** 案件 ID。 */
  id: string;
  /** 案件编号（组织内唯一）。 */
  caseNo: string;
  /** 案件名称。 */
  caseName: string | null;
  /** 案件类型（家族滞在 / 工作签証-技人国 等）。 */
  caseType: string;
  /** 申请类型（認定 / 変更 / 更新）。 */
  applicationType: CaseApplicationType | null;
  /** 当前阶段（S1–S9）。 */
  stage: CaseStage;
  /** 优先度。 */
  priority: CasePriority | null;
  /** 风险等级。 */
  riskLevel: CaseRiskLevel | null;
  /** 主申请人 ID。 */
  customerId: string;
  /** 负责人 ID。 */
  principalUserId: string;
  /** 结果。 */
  resultOutcome: CaseResultOutcome | null;
  /** 工作台：最近关键期限。 */
  nextDeadlineDueAt: string | null;
  /** 工作台：未结清金额（缓存）。 */
  billingUnpaidAmountCached: number | null;
  /** 创建时间。 */
  createdAt: string;
  /** 更新时间。 */
  updatedAt: string;
};

/**
 * 时间线条目。
 */
export type TimelineEntry = {
  /** 条目 ID。 */
  id: string;
  /** 动作。 */
  action: string;
  /** 创建时间。 */
  createdAt: string;
};

/**
 * 案件内资料项摘要（P0 DocumentRequirement 的轻量投影）。
 */
export type DocumentItemSummary = {
  /** 资料项 ID。 */
  id: string;
  /** 资料项名称。 */
  name: string;
  /** P0 资料项状态（§3.2）。 */
  status: DocumentRequirementStatus;
  /** 是否必交。 */
  requiredFlag: boolean;
  /** 提供方角色。 */
  providedByRole: string | null;
};

/**
 * 案件详情（P0 §3.5 全量字段 + 关联聚合）。
 */
export type CaseDetail = CaseSummary & {
  /** 来源线索 ID（可选）。 */
  sourceLeadId: string | null;
  /** 归属团队 ID。 */
  groupId: string;
  /** 主协作/助理 ID（可选）。 */
  primaryAssistantUserId: string | null;
  /** 来源渠道。 */
  sourceChannel: string | null;
  /** 签约时间（可选）。 */
  signedAt: string | null;
  /** 雇主名称（工作类案件，可选）。 */
  employerName: string | null;
  /** 关闭原因。 */
  closeReason: string | null;
  /** 归档原因。 */
  archiveReason: string | null;
  /** 归档时间。 */
  archivedAt: string | null;
  /** 下一步动作描述。 */
  nextAction: string | null;
  /** 下一步动作期限。 */
  nextActionDueAt: string | null;
  /** 是否存在阻断问题。 */
  hasBlockingIssueFlag: boolean;
  /** 关联资料项。 */
  documents: DocumentItemSummary[];
  /** 时间线。 */
  timeline: TimelineEntry[];
};
