import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { CasesController } from "./cases.controller";
const ctxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff",
  },
};
const mockCase = {
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
    role: "viewer",
  },
};
const managerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "manager",
    groupId: "group-1",
  },
};
const staffWithGroupCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff",
    groupId: "group-1",
  },
};
function makePermissions(overrides = {}) {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    ...overrides,
  };
}
void test("CasesController.update forwards caseNo in patch body", async () => {
  let calledInput;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: (_ctx, _id, input) => {
      calledInput = input;
      return Promise.resolve({ id: "case-1" });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.update(ctxReq, "case-1", { caseNo: "CASE-001" });
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
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.update(ctxReq, "case-1", { caseNo: "CASE-001" }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});
void test("CasesController.delete checks permission before soft delete", async () => {
  let deletedId = "";
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    softDelete: (_ctx, id) => {
      deletedId = id;
      return Promise.resolve();
    },
  };
  const controller = new CasesController(service, makePermissions());
  const res = await controller.delete(ctxReq, "case-1");
  assert.equal(res.ok, true);
  assert.equal(deletedId, "case-1");
});
void test("CasesController.get enforces canViewCase", async () => {
  const service = {
    get: () => Promise.resolve(mockCase),
  };
  const controller = new CasesController(
    service,
    makePermissions({ canViewCase: () => false }),
  );
  await assert.rejects(
    () => controller.get(ctxReq, "case-1"),
    ForbiddenException,
  );
});
void test("CasesController.get returns case when canViewCase allows", async () => {
  const service = {
    get: () => Promise.resolve(mockCase),
  };
  const controller = new CasesController(service, makePermissions());
  const result = await controller.get(ctxReq, "case-1");
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
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.transition(ctxReq, "case-1", { toStage: "S2" }),
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
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.acknowledgeBillingRisk(ctxReq, "case-1", {
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
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.updatePostApprovalStage(ctxReq, "case-1", {
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
  let capturedInput;
  const service = {
    list: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(staffWithGroupCtxReq, {});
  assert.ok(capturedInput);
  assert.deepStrictEqual(capturedInput.visibility, {
    userId: "user-1",
    roleTier: "staff",
    groupId: "group-1",
  });
});
void test("CasesController.list passes admin roleTier for manager", async () => {
  let capturedInput;
  const service = {
    list: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(managerCtxReq, {});
  assert.ok(capturedInput);
  const visibility = capturedInput.visibility;
  assert.equal(visibility.roleTier, "admin");
});
void test("CasesController.list passes viewer roleTier for viewer", async () => {
  let capturedInput;
  const service = {
    list: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq, {});
  assert.ok(capturedInput);
  const visibility = capturedInput.visibility;
  assert.equal(visibility.roleTier, "viewer");
});
void test("CasesController.list forwards parsed scope", async () => {
  let capturedInput;
  const service = {
    list: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.list(staffWithGroupCtxReq, { scope: "group" });
  assert.ok(capturedInput);
  assert.equal(capturedInput.scope, "group");
});
void test("CasesController.list rejects invalid scope", async () => {
  const controller = new CasesController(
    { list: () => Promise.resolve({ items: [], total: 0 }) },
    makePermissions(),
  );
  await assert.rejects(
    () => controller.list(staffWithGroupCtxReq, { scope: "invalid" }),
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
  };
  const controller = new CasesController(
    service,
    makePermissions({ canCreateCase: () => false }),
  );
  await assert.rejects(
    () =>
      controller.create(ctxReq, {
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
  };
  const controller = new CasesController(service, makePermissions());
  await controller.create(ctxReq, {
    customerId: "c1",
    caseTypeCode: "visa",
    ownerUserId: "u1",
  });
  assert.equal(createCalled, true);
});
//# sourceMappingURL=cases.controller.test.js.map
