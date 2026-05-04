import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { PermissionsService } from "../auth/permissions.service";
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
const managerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "manager",
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
const realPermissions = new PermissionsService();
const otherOwnerCase = {
  ...mockCase,
  ownerUserId: "other-user",
  assistantUserId: null,
  groupId: "other-group",
};
const staffNonParticipantCtx = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff",
    groupId: "my-group",
  },
};
// ── permission / scope tests ──
void test("phaseTransition: staff non-participant denied by real PermissionsService", async () => {
  let transitionCalled = false;
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    transitionPhase: () => {
      transitionCalled = true;
      return Promise.resolve(otherOwnerCase);
    },
  };
  const controller = new CasesController(service, realPermissions);
  await assert.rejects(
    () =>
      controller.phaseTransition(staffNonParticipantCtx, "case-1", {
        toPhase: "CONTRACTED",
      }),
    ForbiddenException,
  );
  assert.equal(transitionCalled, false);
});
void test("phaseTransition: manager can transition phase on any case", async () => {
  const transitionedCase = {
    ...otherOwnerCase,
    businessPhase: "CONTRACTED",
  };
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: () => Promise.resolve(transitionedCase),
  };
  const controller = new CasesController(service, realPermissions);
  const result = await controller.phaseTransition(managerCtxReq, "case-1", {
    toPhase: "CONTRACTED",
  });
  assert.equal(result.businessPhase, "CONTRACTED");
});
void test("phaseTransition: assistant can transition phase on their assigned case", async () => {
  const assistantCase = {
    ...mockCase,
    ownerUserId: "other-user",
    assistantUserId: "user-1",
    businessPhase: "CONTRACTED",
  };
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: () => Promise.resolve(assistantCase),
  };
  const controller = new CasesController(service, realPermissions);
  const result = await controller.phaseTransition(ctxReq, "case-1", {
    toPhase: "CONTRACTED",
  });
  assert.equal(result.businessPhase, "CONTRACTED");
});
// ── field forwarding ──
void test("phaseTransition: succeeds and forwards toPhase to service", async () => {
  let capturedInput;
  const transitionedCase = { ...mockCase, businessPhase: "CONTRACTED" };
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: (_ctx, _id, input) => {
      capturedInput = input;
      return Promise.resolve(transitionedCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  const result = await controller.phaseTransition(ctxReq, "case-1", {
    toPhase: "CONTRACTED",
  });
  assert.equal(result.businessPhase, "CONTRACTED");
  assert.ok(capturedInput);
  assert.equal(capturedInput.toPhase, "CONTRACTED");
});
// ── input validation ──
void test("phaseTransition: missing requestContext throws UnauthorizedException", async () => {
  const service = {};
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.phaseTransition({}, "case-1", {
        toPhase: "CONTRACTED",
      }),
    UnauthorizedException,
  );
});
void test("phaseTransition: missing toPhase throws BadRequestException", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: () => Promise.resolve(mockCase),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.phaseTransition(ctxReq, "case-1", {
        toPhase: "",
      }),
    BadRequestException,
  );
});
// ── S9 write guard ──
void test("phaseTransition: S9 archived case rejected by service", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: () =>
      Promise.reject(
        new BadRequestException(
          "CASE_S9_READONLY: Case is archived (S9) and read-only",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.phaseTransition(ctxReq, "case-1", {
        toPhase: "CONTRACTED",
      }),
    BadRequestException,
  );
});
// ── error propagation ──
void test("phaseTransition: BadRequestException from service propagates", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: () =>
      Promise.reject(
        new BadRequestException(
          "Invalid phase transition: CONSULTING → CLOSED_SUCCESS",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.phaseTransition(ctxReq, "case-1", {
        toPhase: "CLOSED_SUCCESS",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("phase transition"));
      return true;
    },
  );
});
void test("phaseTransition: CLOSED_SUCCESS gate error propagates", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transitionPhase: () =>
      Promise.reject(
        new BadRequestException(
          "CASE_SUCCESS_CLOSEOUT_BLOCKED: CLOSED_SUCCESS requires a current residence period record",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.phaseTransition(ctxReq, "case-1", {
        toPhase: "CLOSED_SUCCESS",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("CLOSED_SUCCESS"));
      return true;
    },
  );
});
//# sourceMappingURL=cases.controller.phase-transition.test.js.map
