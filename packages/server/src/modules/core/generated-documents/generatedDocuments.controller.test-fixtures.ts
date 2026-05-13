/* eslint-disable jsdoc/require-description, jsdoc/require-returns, jsdoc/require-param-description -- 单测夹具 */
import type { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import type { GeneratedDocument } from "../model/documentEntities";
import { CasesService } from "../cases/cases.service";
import type { GeneratedDocumentDto } from "../cases/cases.types-generated-docs";
import { GeneratedDocumentsController } from "./generatedDocuments.controller";
import type { RedisClient } from "../../../infra/redis/createRedisClient";
import { GeneratedDocumentsService } from "./generatedDocuments.service";

export const ORG_ID = "00000000-0000-4000-8000-000000000000";
export const USER_ID = "00000000-0000-4000-8000-000000000001";
export const CASE_ID = "00000000-0000-4000-8000-000000000002";
export const GD_ID = "00000000-0000-4000-8000-000000000005";

export const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
    groupId: "group-1",
  },
};

export const mockCase: Case = {
  id: CASE_ID,
  orgId: ORG_ID,
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S5",
  stage: "S5",
  groupId: null,
  ownerUserId: USER_ID,
  openedAt: "2026-01-01T00:00:00.000Z",
  dueAt: null,
  metadata: {},
  caseNo: "CASE-001",
  caseName: null,
  caseSubtype: null,
  applicationType: null,
  applicationFlowType: null,
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
  jurisdictionAuthority: null,
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const mockGdEntity: GeneratedDocument = {
  id: GD_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  templateId: null,
  title: "申請書",
  versionNo: 1,
  outputFormat: "pdf",
  fileUrl: null,
  status: "draft",
  generatedBy: USER_ID,
  approvedBy: null,
  generatedAt: "2026-01-01T00:00:00.000Z",
  approvedAt: null,
  templateVersionNoSnapshot: null,
  templateDocType: null,
};

export const mockGdDto: GeneratedDocumentDto = {
  id: GD_ID,
  caseId: CASE_ID,
  templateId: null,
  title: "申請書",
  versionNo: 1,
  outputFormat: "pdf",
  fileUrl: null,
  status: "draft",
  generatedBy: USER_ID,
  generatedByDisplayName: "Test User",
  approvedBy: null,
  approvedByDisplayName: null,
  generatedAt: "2026-01-01T00:00:00.000Z",
  approvedAt: null,
  templateVersionNoSnapshot: null,
  templateDocType: null,
};

/**
 *
 * @param overrides
 */
export function makePermissions(
  overrides: Partial<PermissionsService> = {},
): PermissionsService {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    ...overrides,
  } as unknown as PermissionsService;
}

/**
 *
 * @param overrides
 */
export function makeCasesService(
  overrides: Partial<CasesService> = {},
): CasesService {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  } as unknown as CasesService;
}

/**
 *
 * @param opts
 * @param opts.service
 * @param opts.cases
 * @param opts.permissions
 */
export function makeController(
  opts: {
    service?: Partial<GeneratedDocumentsService>;
    cases?: Partial<CasesService>;
    permissions?: Partial<PermissionsService>;
  } = {},
): GeneratedDocumentsController {
  const service = {
    get: () => Promise.resolve(mockGdEntity),
    getDto: () => Promise.resolve(mockGdDto),
    list: () => Promise.resolve({ items: [mockGdDto], total: 1 }),
    create: () => Promise.resolve(mockGdDto),
    update: () => Promise.resolve(mockGdDto),
    deleteDraft: () => Promise.resolve(),
    ...opts.service,
  } as unknown as GeneratedDocumentsService;
  const fakeRedis = {
    isOpen: true,
    rPush: () => Promise.resolve(1),
    lPop: () => Promise.resolve(null),
    connect: () => Promise.resolve(),
  } as unknown as RedisClient;
  const fakeStorage = {
    upload: () => Promise.resolve(),
    download: () => Promise.resolve(Buffer.from("stub")),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("https://example.test/file"),
  };
  return new GeneratedDocumentsController(
    service,
    makeCasesService(opts.cases),
    makePermissions(opts.permissions),
    fakeRedis,
    fakeStorage,
  );
}
