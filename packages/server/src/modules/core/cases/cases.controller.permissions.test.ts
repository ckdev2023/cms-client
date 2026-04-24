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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const managerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "manager" as const,
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

// §p0-sv-006: real PermissionsService with role/group isolation
const realPermissions = new PermissionsService();

const otherOwnerCase: Case = {
  ...mockCase,
  ownerUserId: "other-user",
  assistantUserId: null,
  groupId: "other-group",
};

const staffNonParticipantCtx = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff" as const,
    groupId: "my-group",
  },
};

void test("transition: staff non-participant denied by real PermissionsService", async () => {
  let transitionCalled = false;
  const service = {
    get: () => Promise.resolve(otherOwnerCase),
    transition: () => {
      transitionCalled = true;
      return Promise.resolve(otherOwnerCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);

  await assert.rejects(
    () =>
      controller.transition(staffNonParticipantCtx as never, "case-1", {
        toStage: "S2",
      }),
    ForbiddenException,
  );
  assert.equal(transitionCalled, false);
});

void test("transition: manager can transition any case regardless of ownership", async () => {
  const transitionedCase = { ...otherOwnerCase, stage: "S2", status: "S2" };
  const service = {
    get: () => Promise.resolve(otherOwnerCase),
    transition: () => Promise.resolve(transitionedCase),
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);
  const result = await controller.transition(managerCtxReq as never, "case-1", {
    toStage: "S2",
  });
  assert.equal(result.stage, "S2");
});

void test("transition: assistant can transition their assigned case", async () => {
  const assistantCase = {
    ...mockCase,
    ownerUserId: "other-user",
    assistantUserId: "user-1",
  };
  const transitionedCase = { ...assistantCase, stage: "S2", status: "S2" };
  const service = {
    get: () => Promise.resolve(assistantCase),
    transition: () => Promise.resolve(transitionedCase),
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);
  const result = await controller.transition(ctxReq as never, "case-1", {
    toStage: "S2",
  });
  assert.equal(result.stage, "S2");
});

void test("acknowledgeBillingRisk: staff non-participant denied by real PermissionsService", async () => {
  let ackCalled = false;
  const service = {
    get: () => Promise.resolve(otherOwnerCase),
    acknowledgeBillingRisk: () => {
      ackCalled = true;
      return Promise.resolve(otherOwnerCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);

  await assert.rejects(
    () =>
      controller.acknowledgeBillingRisk(
        staffNonParticipantCtx as never,
        "case-1",
        { reasonCode: "test" },
      ),
    ForbiddenException,
  );
  assert.equal(ackCalled, false);
});

void test("acknowledgeBillingRisk: manager can ack any case", async () => {
  const ackedCase = {
    ...otherOwnerCase,
    billingRiskAcknowledgedBy: "user-1",
  };
  const service = {
    get: () => Promise.resolve(otherOwnerCase),
    acknowledgeBillingRisk: () => Promise.resolve(ackedCase),
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);
  const result = await controller.acknowledgeBillingRisk(
    managerCtxReq as never,
    "case-1",
    { reasonCode: "fast_track" },
  );
  assert.equal(result.billingRiskAcknowledgedBy, "user-1");
});

void test("updatePostApprovalStage: staff non-participant denied", async () => {
  let updateCalled = false;
  const service = {
    get: () => Promise.resolve(otherOwnerCase),
    updatePostApprovalStage: () => {
      updateCalled = true;
      return Promise.resolve(otherOwnerCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);

  await assert.rejects(
    () =>
      controller.updatePostApprovalStage(
        staffNonParticipantCtx as never,
        "case-1",
        { stage: "entry_success" },
      ),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});

void test("delete: staff non-participant denied by real PermissionsService", async () => {
  let deleteCalled = false;
  const service = {
    get: () => Promise.resolve(otherOwnerCase),
    softDelete: () => {
      deleteCalled = true;
      return Promise.resolve();
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, realPermissions);

  await assert.rejects(
    () => controller.delete(staffNonParticipantCtx as never, "case-1"),
    ForbiddenException,
  );
  assert.equal(deleteCalled, false);
});

// §p0-sv-006: transition/ack/postApproval forwarding

void test("transition: succeeds and forwards toStage to service", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const transitionedCase = { ...mockCase, stage: "S2", status: "S2" };
  const service = {
    get: () => Promise.resolve(mockCase),
    transition: (
      _ctx: unknown,
      _id: string,
      input: Record<string, unknown>,
    ) => {
      capturedInput = input;
      return Promise.resolve(transitionedCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const result = await controller.transition(ctxReq as never, "case-1", {
    toStage: "S2",
  });

  assert.equal(result.stage, "S2");
  assert.ok(capturedInput);
  assert.equal(capturedInput.toStage, "S2");
  assert.equal(capturedInput.toStatus, undefined);
});

void test("transition: forwards toStatus when toStage omitted", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const transitionedCase = { ...mockCase, stage: "S3", status: "S3" };
  const service = {
    get: () => Promise.resolve(mockCase),
    transition: (
      _ctx: unknown,
      _id: string,
      input: Record<string, unknown>,
    ) => {
      capturedInput = input;
      return Promise.resolve(transitionedCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.transition(ctxReq as never, "case-1", { toStatus: "S3" });

  assert.ok(capturedInput);
  assert.equal(capturedInput.toStage, undefined);
  assert.equal(capturedInput.toStatus, "S3");
});

void test("acknowledgeBillingRisk: succeeds and forwards all fields", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const ackedCase = {
    ...mockCase,
    billingRiskAcknowledgedBy: "user-1",
    billingRiskAcknowledgedAt: "2026-04-20T00:00:00.000Z",
    billingRiskAckReasonCode: "client_request",
    billingRiskAckReasonNote: "confirmed by phone",
    billingRiskAckEvidenceUrl: "https://example.com/receipt.pdf",
  };
  const service = {
    get: () => Promise.resolve(mockCase),
    acknowledgeBillingRisk: (
      _ctx: unknown,
      _id: string,
      input: Record<string, unknown>,
    ) => {
      capturedInput = input;
      return Promise.resolve(ackedCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const result = await controller.acknowledgeBillingRisk(
    ctxReq as never,
    "case-1",
    {
      reasonCode: "client_request",
      reasonNote: "confirmed by phone",
      evidenceUrl: "https://example.com/receipt.pdf",
    },
  );

  assert.equal(result.billingRiskAckReasonCode, "client_request");
  assert.equal(
    result.billingRiskAckEvidenceUrl,
    "https://example.com/receipt.pdf",
  );
  assert.ok(capturedInput);
  assert.equal(capturedInput.reasonCode, "client_request");
  assert.equal(capturedInput.reasonNote, "confirmed by phone");
  assert.equal(capturedInput.evidenceUrl, "https://example.com/receipt.pdf");
});

void test("updatePostApprovalStage: succeeds and forwards stage", async () => {
  let capturedInput: Record<string, unknown> | undefined;
  const updatedCase = { ...mockCase, postApprovalStage: "entry_success" };
  const service = {
    get: () => Promise.resolve(mockCase),
    updatePostApprovalStage: (
      _ctx: unknown,
      _id: string,
      input: Record<string, unknown>,
    ) => {
      capturedInput = input;
      return Promise.resolve(updatedCase);
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const result = await controller.updatePostApprovalStage(
    ctxReq as never,
    "case-1",
    { stage: "entry_success" },
  );

  assert.equal(result.postApprovalStage, "entry_success");
  assert.ok(capturedInput);
  assert.equal(capturedInput.stage, "entry_success");
});

// §p0-sv-006: Gate exceptions propagate through controller

void test("transition: Gate-A BadRequestException propagates through controller", async () => {
  const s3Case = { ...mockCase, stage: "S3", status: "S3" };
  const service = {
    get: () => Promise.resolve(s3Case),
    transition: () =>
      Promise.reject(
        new BadRequestException(
          "S3→S4 requires a primary case party before moving to S4",
        ),
      ),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.transition(ctxReq as never, "case-1", { toStage: "S4" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("primary case party"));
      return true;
    },
  );
});

void test("transition: Gate-C billing risk error propagates through controller", async () => {
  const s6Case = { ...mockCase, stage: "S6", status: "S6" };
  const service = {
    get: () => Promise.resolve(s6Case),
    transition: () =>
      Promise.reject(
        new BadRequestException(
          "S6→S7 requires billing risk acknowledgment before formal submission when there is unpaid balance",
        ),
      ),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.transition(ctxReq as never, "case-1", { toStage: "S7" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("billing risk"));
      return true;
    },
  );
});

void test("transition: NotFoundException from service propagates", async () => {
  const service = {
    get: () => Promise.resolve(mockCase),
    transition: () =>
      Promise.reject(new NotFoundException("Case not found or deleted")),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.transition(ctxReq as never, "case-1", { toStage: "S2" }),
    NotFoundException,
  );
});

// §p0-sv-006: Missing requestContext → 401

void test("transition: missing requestContext throws UnauthorizedException", async () => {
  const service = {} as unknown as CasesService;
  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.transition({} as never, "case-1", { toStage: "S2" }),
    UnauthorizedException,
  );
});

void test("acknowledgeBillingRisk: missing requestContext throws UnauthorizedException", async () => {
  const service = {} as unknown as CasesService;
  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () =>
      controller.acknowledgeBillingRisk({} as never, "case-1", {
        reasonCode: "test",
      }),
    UnauthorizedException,
  );
});

void test("updatePostApprovalStage: missing requestContext throws UnauthorizedException", async () => {
  const service = {} as unknown as CasesService;
  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () =>
      controller.updatePostApprovalStage({} as never, "case-1", {
        stage: "coe_sent",
      }),
    UnauthorizedException,
  );
});
