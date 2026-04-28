import test from "node:test";
import assert from "node:assert/strict";
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import { CasesService } from "../cases/cases.service";
import { SubmissionPackagesController } from "./submissionPackages.controller";
import { SubmissionPackagesService } from "./submissionPackages.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const SP_ID = "00000000-0000-4000-8000-000000000005";

const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
    groupId: "group-1",
  },
};

const viewerReq = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "viewer" as const,
  },
};

const mockCase: Case = {
  id: CASE_ID,
  orgId: ORG_ID,
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S6",
  stage: "S6",
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
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockPackage = {
  id: SP_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  submissionNo: 1,
  submissionKind: "initial",
  submittedAt: "2026-01-15T00:00:00.000Z",
  validationRunId: null,
  reviewRecordId: null,
  authorityName: "入管局",
  acceptanceNo: null,
  receiptStorageType: null,
  receiptRelativePathOrKey: null,
  relatedSubmissionId: null,
  createdBy: USER_ID,
  createdAt: "2026-01-15T00:00:00.000Z",
  items: [],
};

function makePermissions(
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

function makeCasesService(overrides: Partial<CasesService> = {}): CasesService {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  } as unknown as CasesService;
}

function makeController(
  opts: {
    service?: Partial<SubmissionPackagesService>;
    cases?: Partial<CasesService>;
    permissions?: Partial<PermissionsService>;
  } = {},
): SubmissionPackagesController {
  const service = {
    create: () => Promise.resolve(mockPackage),
    get: () => Promise.resolve(mockPackage),
    list: () => Promise.resolve({ items: [mockPackage], total: 1 }),
    ...opts.service,
  } as unknown as SubmissionPackagesService;
  return new SubmissionPackagesController(
    service,
    makeCasesService(opts.cases),
    makePermissions(opts.permissions),
  );
}

// ---------------------------------------------------------------------------
// basic CRUD
// ---------------------------------------------------------------------------

void test("create requires context", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(
        {} as never,
        {
          caseId: CASE_ID,
          items: [{ itemType: "document_requirement", refId: "r1" }],
        } as never,
      ),
    UnauthorizedException,
  );
});

void test("create requires caseId", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          items: [{ itemType: "document_requirement", refId: "r1" }],
        } as never,
      ),
    /caseId is required/,
  );
});

void test("create requires non-empty items", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          items: [],
        } as never,
      ),
    /items is required/,
  );
});

void test("create forwards input to service", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      create: (_ctx: unknown, input: Record<string, unknown>) => {
        capturedInput = input;
        return Promise.resolve(mockPackage);
      },
    },
  });

  await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      submissionKind: "initial",
      submittedAt: "2026-01-15T00:00:00.000Z",
      authorityName: "入管局",
      relatedSubmissionId: null,
      items: [{ itemType: "document_requirement", refId: "r1" }],
    } as never,
  );

  assert.ok(capturedInput);
  assert.equal(capturedInput.caseId, CASE_ID);
  assert.equal(capturedInput.submissionKind, "initial");
  assert.equal(capturedInput.relatedSubmissionId, null);
});

void test("list parses query", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledQuery = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(viewerReq as never, {
    caseId: CASE_ID,
    page: "1",
    limit: "25",
  });
  assert.ok(calledQuery);
  assert.deepEqual(calledQuery, { caseId: CASE_ID, page: 1, limit: 25 });
});

void test("get throws NotFoundException when package is missing", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () => controller.get(viewerReq as never, SP_ID),
    NotFoundException,
  );
});

// ---------------------------------------------------------------------------
// §p0-sv-009: resource-level permission checks
// ---------------------------------------------------------------------------

void test("create throws ForbiddenException when canEditCase denies", async () => {
  let createCalled = false;
  const controller = makeController({
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockPackage);
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          items: [{ itemType: "document_requirement", refId: "r1" }],
        } as never,
      ),
    ForbiddenException,
  );
  assert.equal(createCalled, false);
});

void test("create throws NotFoundException when parent case is missing", async () => {
  const controller = makeController({
    cases: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          items: [{ itemType: "document_requirement", refId: "r1" }],
        } as never,
      ),
    NotFoundException,
  );
});

void test("list with caseId checks canViewCase", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });

  await assert.rejects(
    () => controller.list(viewerReq as never, { caseId: CASE_ID }),
    ForbiddenException,
  );
});

void test("get checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });

  await assert.rejects(
    () => controller.get(viewerReq as never, SP_ID),
    ForbiddenException,
  );
});

// ---------------------------------------------------------------------------
// §p0-sv-009: supplement package — relatedSubmissionId forwarding
// ---------------------------------------------------------------------------

void test("create: forwards relatedSubmissionId for supplement package", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      create: (_ctx: unknown, input: Record<string, unknown>) => {
        capturedInput = input;
        return Promise.resolve({
          ...mockPackage,
          submissionKind: "supplement",
          relatedSubmissionId: "sp-original",
        });
      },
    },
  });

  await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      submissionKind: "supplement",
      submittedAt: "2026-02-01T00:00:00.000Z",
      authorityName: "入管局",
      relatedSubmissionId: "sp-original",
      items: [{ itemType: "document_requirement", refId: "r2" }],
    } as never,
  );

  assert.ok(capturedInput);
  assert.equal(capturedInput.submissionKind, "supplement");
  assert.equal(capturedInput.relatedSubmissionId, "sp-original");
});
