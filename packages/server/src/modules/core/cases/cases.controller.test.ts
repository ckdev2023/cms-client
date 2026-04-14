import test from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException } from "@nestjs/common";

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

function makePermissions(
  canEditCase: PermissionsService["canEditCase"] = () => true,
): PermissionsService {
  return { canEditCase } as unknown as PermissionsService;
}

void test("CasesController.update forwards caseNo in patch body", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const service = {
    get: () => Promise.resolve(mockCase),
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
    get: () => Promise.resolve(mockCase),
    update: () => {
      updateCalled = true;
      return Promise.resolve({ id: "case-1" });
    },
  } as unknown as CasesService;

  const controller = new CasesController(
    service,
    makePermissions(() => false),
  );

  await assert.rejects(
    () => controller.update(ctxReq as never, "case-1", { caseNo: "CASE-001" }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});

void test("CasesController.delete checks permission before soft delete", async () => {
  let deletedId = "";
  const service = {
    get: () => Promise.resolve(mockCase),
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
