import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import { CasesService } from "../cases/cases.service";
import { ValidationRunsController } from "./validationRuns.controller";
import { ValidationRunsService } from "./validationRuns.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000003";

const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
    groupId: "group-1",
  },
};

const mockCase: Case = {
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

const mockValidationRun = {
  id: VALIDATION_RUN_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  rulesetRef: { gate: "submission_readiness" },
  resultStatus: "passed",
  blockingCount: 0,
  warningCount: 0,
  reportPayload: { checks: [] },
  executedBy: USER_ID,
  executedAt: "2026-01-01T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
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
    service?: Partial<ValidationRunsService>;
    cases?: Partial<CasesService>;
    permissions?: Partial<PermissionsService>;
  } = {},
): ValidationRunsController {
  const service = {
    create: () => Promise.resolve(mockValidationRun),
    get: () => Promise.resolve(mockValidationRun),
    list: () => Promise.resolve({ items: [mockValidationRun], total: 1 }),
    ...opts.service,
  } as unknown as ValidationRunsService;
  return new ValidationRunsController(
    service,
    makeCasesService(opts.cases),
    makePermissions(opts.permissions),
  );
}

void test("create validates body and requires context", async () => {
  const controller = makeController();

  await assert.rejects(
    () => controller.create({} as never, { caseId: CASE_ID } as never),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req as never, { caseId: "" } as never),
    /caseId is required/,
  );
  await assert.rejects(
    () =>
      controller.create(
        req as never,
        { caseId: CASE_ID, rulesetRef: [] } as never,
      ),
    /Invalid rulesetRef/,
  );
});

void test("create forwards input to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      create: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve(mockValidationRun);
      },
    },
  });

  const created = await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      rulesetRef: { version: 2 },
    } as never,
  );
  assert.equal(created.id, VALIDATION_RUN_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    rulesetRef: { version: 2 },
  });
});

void test("list parses query", async () => {
  let calledQuery: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledQuery = input;
        return Promise.resolve({ items: [mockValidationRun], total: 1 });
      },
    },
  });

  const result = await controller.list(req as never, {
    caseId: CASE_ID,
    page: "2",
    limit: "10",
  });
  assert.equal(result.total, 1);
  assert.deepEqual(calledQuery, { caseId: CASE_ID, page: 2, limit: 10 });
});

void test("get throws when run is missing", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () => controller.get(req as never, VALIDATION_RUN_ID),
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
        return Promise.resolve(mockValidationRun);
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () => controller.create(req as never, { caseId: CASE_ID } as never),
    ForbiddenException,
  );
  assert.equal(createCalled, false);
});

void test("create throws NotFoundException when parent case is missing", async () => {
  const controller = makeController({
    cases: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () => controller.create(req as never, { caseId: CASE_ID } as never),
    NotFoundException,
  );
});

void test("create throws BadRequestException when parent case is S9", async () => {
  let createCalled = false;
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockValidationRun);
      },
    },
  });

  await assert.rejects(
    () => controller.create(req as never, { caseId: CASE_ID } as never),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(createCalled, false);
});

void test("list with caseId checks canViewCase", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });

  await assert.rejects(
    () => controller.list(req as never, { caseId: CASE_ID }),
    ForbiddenException,
  );
});

void test("get checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });

  await assert.rejects(
    () => controller.get(req as never, VALIDATION_RUN_ID),
    ForbiddenException,
  );
});
