import {
  requireString,
  parseOptionalString,
  parseOptionalNullableString,
  parseOptionalNullableNumber,
  parseOptionalBoolean,
  parseObject,
} from "./cases.parsers";

import type { CreateCaseBody, UpdateCaseBody } from "./cases.controller-bodies";

/**
 * CreateCaseBody → CaseCreateInput 変換。
 * @param body 作成リクエスト
 * @returns CaseCreateInput
 */
export function parseCreateCaseBody(body: CreateCaseBody) {
  return {
    customerId: requireString(body.customerId, "customerId"),
    caseTypeCode: requireString(body.caseTypeCode, "caseTypeCode"),
    ownerUserId: requireString(body.ownerUserId, "ownerUserId"),
    groupId: parseOptionalNullableString(body.groupId, "groupId"),
    stage: parseOptionalString(body.stage, "stage"),
    status: parseOptionalString(body.status, "status"),
    dueAt: parseOptionalNullableString(body.dueAt, "dueAt"),
    metadata: parseObject(body.metadata),
    caseNo: parseOptionalNullableString(body.caseNo, "caseNo"),
    caseName: parseOptionalNullableString(body.caseName, "caseName"),
    caseSubtype: parseOptionalNullableString(body.caseSubtype, "caseSubtype"),
    applicationType: parseOptionalNullableString(
      body.applicationType,
      "applicationType",
    ),
    companyId: parseOptionalNullableString(body.companyId, "companyId"),
    priority: parseOptionalString(body.priority, "priority"),
    riskLevel: parseOptionalString(body.riskLevel, "riskLevel"),
    assistantUserId: parseOptionalNullableString(
      body.assistantUserId,
      "assistantUserId",
    ),
    sourceChannel: parseOptionalNullableString(
      body.sourceChannel,
      "sourceChannel",
    ),
    signedAt: parseOptionalNullableString(body.signedAt, "signedAt"),
    acceptedAt: parseOptionalNullableString(body.acceptedAt, "acceptedAt"),
    submissionDate: parseOptionalNullableString(
      body.submissionDate,
      "submissionDate",
    ),
    resultDate: parseOptionalNullableString(body.resultDate, "resultDate"),
    residenceExpiryDate: parseOptionalNullableString(
      body.residenceExpiryDate,
      "residenceExpiryDate",
    ),
    resultOutcome: parseOptionalNullableString(
      body.resultOutcome,
      "resultOutcome",
    ),
    quotePrice: parseOptionalNullableNumber(body.quotePrice, "quotePrice"),
    visaPlan: parseOptionalNullableString(body.visaPlan, "visaPlan"),
    crossGroupReason: parseOptionalNullableString(
      body.crossGroupReason,
      "crossGroupReason",
    ),
    forceCreate: parseOptionalBoolean(body.forceCreate, "forceCreate"),
  };
}

/**
 * UpdateCaseBody → CaseUpdateInput 変換。
 * @param body 更新請求体
 * @returns CaseUpdateInput
 */
export function parseUpdateCaseBody(body: UpdateCaseBody) {
  return {
    caseTypeCode: parseOptionalString(body.caseTypeCode, "caseTypeCode"),
    ownerUserId: parseOptionalString(body.ownerUserId, "ownerUserId"),
    groupId: parseOptionalNullableString(body.groupId, "groupId"),
    groupTransferReason: parseOptionalNullableString(
      body.groupTransferReason,
      "groupTransferReason",
    ),
    dueAt: parseOptionalNullableString(body.dueAt, "dueAt"),
    metadata: parseObject(body.metadata),
    caseNo: parseOptionalNullableString(body.caseNo, "caseNo"),
    caseName: parseOptionalNullableString(body.caseName, "caseName"),
    caseSubtype: parseOptionalNullableString(body.caseSubtype, "caseSubtype"),
    applicationType: parseOptionalNullableString(
      body.applicationType,
      "applicationType",
    ),
    companyId: parseOptionalNullableString(body.companyId, "companyId"),
    priority: parseOptionalString(body.priority, "priority"),
    riskLevel: parseOptionalString(body.riskLevel, "riskLevel"),
    assistantUserId: parseOptionalNullableString(
      body.assistantUserId,
      "assistantUserId",
    ),
    sourceChannel: parseOptionalNullableString(
      body.sourceChannel,
      "sourceChannel",
    ),
    signedAt: parseOptionalNullableString(body.signedAt, "signedAt"),
    acceptedAt: parseOptionalNullableString(body.acceptedAt, "acceptedAt"),
    submissionDate: parseOptionalNullableString(
      body.submissionDate,
      "submissionDate",
    ),
    resultDate: parseOptionalNullableString(body.resultDate, "resultDate"),
    residenceExpiryDate: parseOptionalNullableString(
      body.residenceExpiryDate,
      "residenceExpiryDate",
    ),
    archivedAt: parseOptionalNullableString(body.archivedAt, "archivedAt"),
    resultOutcome: parseOptionalNullableString(
      body.resultOutcome,
      "resultOutcome",
    ),
    quotePrice: parseOptionalNullableNumber(body.quotePrice, "quotePrice"),
    visaPlan: parseOptionalNullableString(body.visaPlan, "visaPlan"),
    overseasVisaStartAt: parseOptionalNullableString(
      body.overseasVisaStartAt,
      "overseasVisaStartAt",
    ),
    entryConfirmedAt: parseOptionalNullableString(
      body.entryConfirmedAt,
      "entryConfirmedAt",
    ),
  };
}
