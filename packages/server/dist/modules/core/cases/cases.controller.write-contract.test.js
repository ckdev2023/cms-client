import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
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
// ---------------------------------------------------------------------------
// §p0-sv-008: write contract — S9 write guard
// ---------------------------------------------------------------------------
void test("update: S9 archived case rejected by service", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: () =>
      Promise.reject(
        new BadRequestException(
          "CASE_S9_READONLY: Case is archived (S9) and read-only",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.update(ctxReq, "case-1", { caseName: "test" }),
    BadRequestException,
  );
});
void test("transition: S9 archived case rejected by service", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transition: () =>
      Promise.reject(
        new BadRequestException(
          "CASE_S9_READONLY: Case is archived (S9) and read-only",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.transition(ctxReq, "case-1", { toStage: "S8" }),
    BadRequestException,
  );
});
void test("acknowledgeBillingRisk: S9 archived case rejected by service", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    acknowledgeBillingRisk: () =>
      Promise.reject(
        new BadRequestException(
          "CASE_S9_READONLY: Case is archived (S9) and read-only",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.acknowledgeBillingRisk(ctxReq, "case-1", {
        reasonCode: "test",
      }),
    BadRequestException,
  );
});
void test("updatePostApprovalStage: S9 archived case rejected by service", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    updatePostApprovalStage: () =>
      Promise.reject(
        new BadRequestException(
          "CASE_S9_READONLY: Case is archived (S9) and read-only",
        ),
      ),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.updatePostApprovalStage(ctxReq, "case-1", {
        stage: "coe_sent",
      }),
    BadRequestException,
  );
});
// ---------------------------------------------------------------------------
// §p0-sv-008: write contract — new field forwarding
// ---------------------------------------------------------------------------
void test("create: forwards groupId and crossGroupReason to service", async () => {
  let capturedInput;
  const service = {
    create: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve(mockCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.create(ctxReq, {
    customerId: "c1",
    caseTypeCode: "visa",
    ownerUserId: "u1",
    groupId: "group-2",
    crossGroupReason: "client transferred",
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.groupId, "group-2");
  assert.equal(capturedInput.crossGroupReason, "client transferred");
});
void test("update: forwards groupId and groupTransferReason to service", async () => {
  let capturedInput;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: (_ctx, _id, input) => {
      capturedInput = input;
      return Promise.resolve(mockCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.update(ctxReq, "case-1", {
    groupId: "group-new",
    groupTransferReason: "reassigned",
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.groupId, "group-new");
  assert.equal(capturedInput.groupTransferReason, "reassigned");
});
void test("transition: forwards closeReason to service for S9 transition", async () => {
  let capturedInput;
  const transitionedCase = { ...mockCase, stage: "S9", status: "S9" };
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transition: (_ctx, _id, input) => {
      capturedInput = input;
      return Promise.resolve(transitionedCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.transition(ctxReq, "case-1", {
    toStage: "S9",
    closeReason: "completed successfully",
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.closeReason, "completed successfully");
});
// ---------------------------------------------------------------------------
// §p0-sv-008: create — full body field forwarding
// ---------------------------------------------------------------------------
void test("create: forwards all optional fields to service", async () => {
  let capturedInput;
  const service = {
    create: (_ctx, input) => {
      capturedInput = input;
      return Promise.resolve(mockCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.create(ctxReq, {
    customerId: "c1",
    caseTypeCode: "visa",
    ownerUserId: "u1",
    stage: "S1",
    dueAt: "2026-12-31",
    caseName: "Test Case",
    caseSubtype: "family_stay",
    applicationType: "new",
    priority: "high",
    riskLevel: "medium",
    assistantUserId: "u2",
    sourceChannel: "referral",
    signedAt: "2026-01-01",
    quotePrice: 300000,
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.caseName, "Test Case");
  assert.equal(capturedInput.caseSubtype, "family_stay");
  assert.equal(capturedInput.applicationType, "new");
  assert.equal(capturedInput.priority, "high");
  assert.equal(capturedInput.riskLevel, "medium");
  assert.equal(capturedInput.assistantUserId, "u2");
  assert.equal(capturedInput.sourceChannel, "referral");
  assert.equal(capturedInput.quotePrice, 300000);
});
// ---------------------------------------------------------------------------
// §p0-sv-008: update — groupId + groupTransferReason forwarding
// ---------------------------------------------------------------------------
void test("update: forwards all nullable fields correctly (null clears)", async () => {
  let capturedInput;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: (_ctx, _id, input) => {
      capturedInput = input;
      return Promise.resolve(mockCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.update(ctxReq, "case-1", {
    caseName: null,
    assistantUserId: null,
    resultOutcome: "approved",
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.caseName, null);
  assert.equal(capturedInput.assistantUserId, null);
  assert.equal(capturedInput.resultOutcome, "approved");
});
// ---------------------------------------------------------------------------
// §p0-sv-008: billingRiskAck — field forwarding
// ---------------------------------------------------------------------------
void test("billingRiskAck: forwards reasonCode, reasonNote, evidenceUrl", async () => {
  let capturedInput;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    acknowledgeBillingRisk: (_ctx, _id, input) => {
      capturedInput = input;
      return Promise.resolve(mockCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.acknowledgeBillingRisk(ctxReq, "case-1", {
    reasonCode: "client_confirmed",
    reasonNote: "Payment pending",
    evidenceUrl: "https://example.com/receipt.pdf",
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.reasonCode, "client_confirmed");
  assert.equal(capturedInput.reasonNote, "Payment pending");
  assert.equal(capturedInput.evidenceUrl, "https://example.com/receipt.pdf");
});
// ---------------------------------------------------------------------------
// §p0-sv-008: postApprovalStage — field forwarding
// ---------------------------------------------------------------------------
void test("postApprovalStage: forwards stage value", async () => {
  let capturedInput;
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    updatePostApprovalStage: (_ctx, _id, input) => {
      capturedInput = input;
      return Promise.resolve(mockCase);
    },
  };
  const controller = new CasesController(service, makePermissions());
  await controller.updatePostApprovalStage(ctxReq, "case-1", {
    stage: "overseas_visa_applying",
  });
  assert.ok(capturedInput);
  assert.equal(capturedInput.stage, "overseas_visa_applying");
});
// ---------------------------------------------------------------------------
// §p0-sv-008: bad input rejection
// ---------------------------------------------------------------------------
void test("create: rejects missing required fields", async () => {
  const service = {
    create: () => Promise.resolve(mockCase),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.create(ctxReq, {
        customerId: "",
        caseTypeCode: "visa",
        ownerUserId: "u1",
      }),
    BadRequestException,
  );
});
void test("billingRiskAck: rejects missing reasonCode", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    acknowledgeBillingRisk: () => Promise.resolve(mockCase),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.acknowledgeBillingRisk(ctxReq, "case-1", {
        reasonCode: "",
      }),
    BadRequestException,
  );
});
void test("postApprovalStage: rejects missing stage", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    updatePostApprovalStage: () => Promise.resolve(mockCase),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () =>
      controller.updatePostApprovalStage(ctxReq, "case-1", {
        stage: "",
      }),
    BadRequestException,
  );
});
//# sourceMappingURL=cases.controller.write-contract.test.js.map
