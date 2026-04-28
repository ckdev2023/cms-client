import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";

const ctxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff" as const,
  },
};

const mockCase: Case = {
  id: "case-1",
  orgId: "org-1",
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S1",
  stage: "S1",
  groupId: null,
  ownerUserId: "user-1",
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

const viewerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "viewer" as const,
  },
};

const managerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "manager" as const,
    groupId: "group-1",
  },
};

const staffWithGroupCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff" as const,
    groupId: "group-1",
  },
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

void test("CasesController.update forwards caseNo in patch body", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: (_ctx: unknown, _id: string, input: Record<string, unknown>) => {
      calledInput = input;
      return Promise.resolve({ id: "case-1" });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.update(ctxReq as never, "case-1", { caseNo: "CASE-001" });

  assert.equal(calledInput?.caseNo, "CASE-001");
});

void test("CasesController.update throws when canEditCase denies", async () => {
  let updateCalled = false;
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    update: () => {
      updateCalled = true;
      return Promise.resolve({ id: "case-1" });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.update(ctxReq as never, "case-1", { caseNo: "CASE-001" }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});

void test("CasesController.delete checks permission before soft delete", async () => {
  let deletedId = "";
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    softDelete: (_ctx: unknown, id: string) => {
      deletedId = id;
      return Promise.resolve();
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const res = await controller.delete(ctxReq as never, "case-1");

  assert.equal(res.ok, true);
  assert.equal(deletedId, "case-1");
});

void test("CasesController.get enforces canViewCase", async () => {
  const service = {
    get: () => Promise.resolve(mockCase),
  } as unknown as CasesService;

  const controller = new CasesController(
    service,
    makePermissions({ canViewCase: () => false }),
  );

  await assert.rejects(
    () => controller.get(ctxReq as never, "case-1"),
    ForbiddenException,
  );
});

void test("CasesController.get returns case when canViewCase allows", async () => {
  const service = {
    get: () => Promise.resolve(mockCase),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const result = await controller.get(ctxReq as never, "case-1");

  assert.equal(result.id, "case-1");
});

void test("CasesController.transition checks canEditCase before executing", async () => {
  let transitionCalled = false;
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    transition: () => {
      transitionCalled = true;
      return Promise.resolve(mockCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.transition(ctxReq as never, "case-1", { toStage: "S2" }),
    ForbiddenException,
  );
  assert.equal(transitionCalled, false);
});

void test("CasesController.acknowledgeBillingRisk checks canEditCase", async () => {
  let ackCalled = false;
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    acknowledgeBillingRisk: () => {
      ackCalled = true;
      return Promise.resolve(mockCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () =>
      controller.acknowledgeBillingRisk(ctxReq as never, "case-1", {
        reasonCode: "test",
      }),
    ForbiddenException,
  );
  assert.equal(ackCalled, false);
});

void test("CasesController.updatePostApprovalStage checks canEditCase", async () => {
  let updateCalled = false;
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    updatePostApprovalStage: () => {
      updateCalled = true;
      return Promise.resolve(mockCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () =>
      controller.updatePostApprovalStage(ctxReq as never, "case-1", {
        stage: "coe_sent",
      }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});

// ---------------------------------------------------------------------------
// list — visibility filter pass-through
// ---------------------------------------------------------------------------
void test("CasesController.list passes visibility filter with staff role and groupId", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(staffWithGroupCtxReq as never, {});

  assert.ok(capturedInput);
  assert.deepStrictEqual(capturedInput.visibility, {
    userId: "user-1",
    roleTier: "staff",
    groupId: "group-1",
  });
});

void test("CasesController.list passes admin roleTier for manager", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(managerCtxReq as never, {});

  assert.ok(capturedInput);
  const visibility = capturedInput.visibility as Record<string, unknown>;
  assert.equal(visibility.roleTier, "admin");
});

void test("CasesController.list passes viewer roleTier for viewer", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq as never, {});

  assert.ok(capturedInput);
  const visibility = capturedInput.visibility as Record<string, unknown>;
  assert.equal(visibility.roleTier, "viewer");
});

void test("CasesController.list forwards parsed scope", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const service = {
    list: (_ctx: unknown, input: Record<string, unknown>) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(staffWithGroupCtxReq as never, { scope: "group" });

  assert.ok(capturedInput);
  assert.equal(capturedInput.scope, "group");
});

void test("CasesController.list rejects invalid scope", async () => {
  const controller = new CasesController(
    { list: () => Promise.resolve({ items: [], total: 0 }) } as never,
    makePermissions(),
  );

  await assert.rejects(
    () => controller.list(staffWithGroupCtxReq as never, { scope: "invalid" }),
    BadRequestException,
  );
});

// ---------------------------------------------------------------------------
// create — canCreateCase guard
// ---------------------------------------------------------------------------
void test("CasesController.create throws when canCreateCase denies", async () => {
  let createCalled = false;
  const service = {
    create: () => {
      createCalled = true;
      return Promise.resolve(mockCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(
    service,
    makePermissions({ canCreateCase: () => false }),
  );

  await assert.rejects(
    () =>
      controller.create(ctxReq as never, {
        customerId: "c1",
        caseTypeCode: "visa",
        ownerUserId: "u1",
      }),
    ForbiddenException,
  );
  assert.equal(createCalled, false);
});

void test("CasesController.create proceeds when canCreateCase allows", async () => {
  let createCalled = false;
  const service = {
    create: () => {
      createCalled = true;
      return Promise.resolve(mockCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.create(ctxReq as never, {
    customerId: "c1",
    caseTypeCode: "visa",
    ownerUserId: "u1",
  });

  assert.equal(createCalled, true);
});
