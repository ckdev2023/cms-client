import assert from "node:assert/strict";

import type { Case } from "../model/coreEntities";
import type { WorkflowStepSummary } from "./cases.types";
import { resolveWorkflowStepSummary } from "./cases.workflow-step-readmodel";

/**
 * 读取 workflow step summary，并在缺失时直接失败。
 * @param caseEntity 用于解析读模型的案件实体。
 * @returns 非空的 WorkflowStepSummary。
 */
export function getWorkflowStepSummaryOrFail(
  caseEntity: Case,
): WorkflowStepSummary {
  const summary = resolveWorkflowStepSummary(caseEntity);
  assert.ok(summary, "workflow step summary should exist");
  return summary;
}

/**
 * 构造 workflow-step readmodel 测试用的 Case 实体。
 * @param overrides 需要覆盖的案件字段。
 * @returns 满足 Case 结构的测试实体。
 */
export function buildMockCase(overrides: Partial<Case> = {}): Case {
  return {
    id: "case-001",
    orgId: "org-001",
    customerId: "cust-001",
    caseTypeCode: "business_manager_visa",
    status: "S3",
    stage: "S3",
    groupId: null,
    ownerUserId: "user-001",
    openedAt: "2025-01-01T00:00:00Z",
    dueAt: null,
    metadata: {},
    caseNo: null,
    caseName: null,
    caseSubtype: null,
    applicationType: null,
    applicationFlowType: "standard",
    visaPlan: null,
    postApprovalStage: null,
    coeIssuedAt: null,
    coeExpiryDate: null,
    coeSentAt: null,
    closeReason: null,
    supplementCount: 0,
    companyId: null,
    priority: "normal",
    riskLevel: "low",
    assistantUserId: null,
    sourceChannel: null,
    signedAt: null,
    acceptedAt: null,
    submissionDate: null,
    resultDate: null,
    residenceExpiryDate: null,
    archivedAt: null,
    resultOutcome: null,
    quotePrice: null,
    depositPaidCached: false,
    finalPaymentPaidCached: false,
    billingUnpaidAmountCached: 0,
    billingRiskAcknowledgedBy: null,
    billingRiskAcknowledgedAt: null,
    billingRiskAckReasonCode: null,
    billingRiskAckReasonNote: null,
    billingRiskAckEvidenceUrl: null,
    overseasVisaStartAt: null,
    entryConfirmedAt: null,
    businessPhase: "CONSULTING",
    currentWorkflowStepCode: null,
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}
