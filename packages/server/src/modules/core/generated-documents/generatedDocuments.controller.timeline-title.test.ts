import test from "node:test";
import assert from "node:assert/strict";
import { GoneException } from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import type { GeneratedDocument } from "../model/documentEntities";
import type { GeneratedDocumentDto } from "../cases/cases.types-generated-docs";
import { CasesService } from "../cases/cases.service";
import { GeneratedDocumentsController } from "./generatedDocuments.controller";
import { GeneratedDocumentsService } from "./generatedDocuments.service";
import type { RedisClient } from "../../../infra/redis/createRedisClient";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER = "00000000-0000-4000-8000-000000000009";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const GD_ID = "00000000-0000-4000-8000-000000000005";

const staffReq = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
    groupId: "g1",
  },
};

const mockCase: Case = {
  id: CASE_ID,
  orgId: ORG_ID,
  customerId: "c-1",
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
  assistantUserId: OTHER_USER,
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

function gdEntity(
  overrides: Partial<GeneratedDocument> = {},
): GeneratedDocument {
  return {
    id: GD_ID,
    orgId: ORG_ID,
    caseId: CASE_ID,
    templateId: null,
    title: "申請書",
    versionNo: 1,
    outputFormat: "pdf",
    fileUrl: "https://example.com/doc.pdf",
    status: "draft",
    generatedBy: USER_ID,
    approvedBy: null,
    generatedAt: "2026-01-01T00:00:00.000Z",
    approvedAt: null,
    templateVersionNoSnapshot: null,
    templateDocType: null,
    ...overrides,
  };
}

function gdDto(
  overrides: Partial<GeneratedDocumentDto> = {},
): GeneratedDocumentDto {
  return {
    id: GD_ID,
    caseId: CASE_ID,
    templateId: null,
    title: "申請書",
    versionNo: 1,
    outputFormat: "pdf",
    fileUrl: null,
    status: "final",
    generatedBy: USER_ID,
    generatedByDisplayName: "Test",
    approvedBy: USER_ID,
    approvedByDisplayName: "Test",
    generatedAt: "2026-01-01T00:00:00.000Z",
    approvedAt: "2026-01-02T00:00:00.000Z",
    templateVersionNoSnapshot: null,
    templateDocType: null,
    ...overrides,
  };
}

function perms(
  overrides: Partial<PermissionsService> = {},
): PermissionsService {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    canFinalizeCase: () => true,
    ...overrides,
  } as unknown as PermissionsService;
}

function cases(overrides: Partial<CasesService> = {}): CasesService {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  } as unknown as CasesService;
}

function ctrl(opts: {
  entity?: GeneratedDocument;
  svc?: Partial<GeneratedDocumentsService>;
  cs?: Partial<CasesService>;
  perm?: Partial<PermissionsService>;
}) {
  const entity = opts.entity ?? gdEntity();
  const svc = {
    get: () => Promise.resolve(entity),
    getDto: () => Promise.resolve(gdDto()),
    list: () => Promise.resolve({ items: [gdDto()], total: 1 }),
    create: () => Promise.resolve(gdDto()),
    update: () => Promise.resolve(gdDto()),
    writeTimeline: () => Promise.resolve(),
    ...opts.svc,
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
    svc,
    cases(opts.cs),
    perms(opts.perm),
    fakeRedis,
    fakeStorage,
  );
}

// ─── finalize: timeline extra includes title ─────────────────────

void test("finalize timeline extra.title equals existing.title", async () => {
  let tlInput: Record<string, unknown> | undefined;
  const c = ctrl({
    entity: gdEntity({ status: "draft", title: "在留資格申請書" }),
    svc: {
      writeTimeline: (_c: unknown, i: Record<string, unknown>) => {
        tlInput = i;
        return Promise.resolve();
      },
    },
  });
  await c.finalize(staffReq as never, GD_ID);
  assert.ok(tlInput, "writeTimeline must have been called");
  assert.equal(tlInput.action, "generated_document.finalized");
  const extra = tlInput.extra as Record<string, unknown>;
  assert.ok(extra, "extra must be present");
  assert.equal(extra.title, "在留資格申請書");
});

void test("finalize timeline title matches entity even with different value", async () => {
  let tlInput: Record<string, unknown> | undefined;
  const c = ctrl({
    entity: gdEntity({ status: "draft", title: "理由書 v2" }),
    svc: {
      writeTimeline: (_c: unknown, i: Record<string, unknown>) => {
        tlInput = i;
        return Promise.resolve();
      },
    },
  });
  await c.finalize(staffReq as never, GD_ID);
  assert.ok(tlInput);
  const extra = tlInput.extra as Record<string, unknown>;
  assert.equal(extra.title, "理由書 v2");
});

// ─── export: deprecated (no timeline written) ───────────────────

void test("export is deprecated and throws GoneException", async () => {
  const c = ctrl({
    entity: gdEntity({ status: "final", title: "雇用契約書" }),
  });
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  await assert.rejects(() => c.export(staffReq as never), GoneException);
});
