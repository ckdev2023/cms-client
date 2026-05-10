import type { RequestContext } from "../tenancy/requestContext";

/** HTTP 请求対象。 */
export type HttpRequest = { requestContext?: RequestContext };

/** 创建案件请求体。 */
export type CreateCaseBody = {
  customerId: unknown;
  caseTypeCode: unknown;
  ownerUserId: unknown;
  stage?: unknown;
  status?: unknown;
  dueAt?: unknown;
  metadata?: unknown;
  caseNo?: unknown;
  caseName?: unknown;
  caseSubtype?: unknown;
  applicationType?: unknown;
  companyId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  assistantUserId?: unknown;
  sourceChannel?: unknown;
  signedAt?: unknown;
  acceptedAt?: unknown;
  submissionDate?: unknown;
  resultDate?: unknown;
  residenceExpiryDate?: unknown;
  resultOutcome?: unknown;
  quotePrice?: unknown;
  groupId?: unknown;
  crossGroupReason?: unknown;
  visaPlan?: unknown;
};

/** 更新案件请求体。 */
export type UpdateCaseBody = {
  caseTypeCode?: unknown;
  ownerUserId?: unknown;
  dueAt?: unknown;
  metadata?: unknown;
  caseNo?: unknown;
  caseName?: unknown;
  caseSubtype?: unknown;
  applicationType?: unknown;
  companyId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  assistantUserId?: unknown;
  sourceChannel?: unknown;
  signedAt?: unknown;
  acceptedAt?: unknown;
  submissionDate?: unknown;
  resultDate?: unknown;
  residenceExpiryDate?: unknown;
  archivedAt?: unknown;
  resultOutcome?: unknown;
  quotePrice?: unknown;
  overseasVisaStartAt?: unknown;
  entryConfirmedAt?: unknown;
  groupId?: unknown;
  groupTransferReason?: unknown;
  visaPlan?: unknown;
};

/** 状态变更请求体。 */
export type TransitionBody = {
  toStage?: unknown;
  toStatus?: unknown;
  closeReason?: unknown;
};

/** 收费风险确认请求体。 */
export type BillingRiskAckBody = {
  reasonCode: unknown;
  reasonNote?: unknown;
  evidenceUrl?: unknown;
};

/** 下签后子阶段变更请求体。 */
export type PostApprovalStageBody = { stage: unknown };

/** P1 子步骤流转请求体。 */
export type WorkflowStepTransitionBody = { toStepCode: unknown };

/** businessPhase 维度流转请求体。 */
export type PhaseTransitionBody = {
  toPhase: unknown;
  closeReason?: unknown;
  resultOutcome?: unknown;
};

/** 案件列表查询参数。 */
export type ListCasesQuery = {
  scope?: unknown;
  stage?: unknown;
  status?: unknown;
  resultOutcome?: unknown;
  ownerUserId?: unknown;
  customerId?: unknown;
  priority?: unknown;
  riskLevel?: unknown;
  /** 与 dashboard "风险案件" 同口径的并集风险桶。 */
  riskBucket?: unknown;
  companyId?: unknown;
  phase?: unknown;
  search?: unknown;
  page?: unknown;
  limit?: unknown;
  view?: unknown;
};
