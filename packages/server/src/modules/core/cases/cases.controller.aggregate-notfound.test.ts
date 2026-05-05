import test from "node:test";
import assert from "node:assert/strict";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";
import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";

const TS = "2026-01-01T00:00:00.000Z";
const BASE: Case = {
  id: "case-1",
  orgId: "org-1",
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S1",
  stage: "S1",
  groupId: "group-1",
  ownerUserId: "owner-1",
  openedAt: TS,
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
  assistantUserId: "assistant-1",
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
  createdAt: TS,
  updatedAt: TS,
};

function reqCtx(
  role: "owner" | "manager" | "staff" | "viewer",
  opts: { userId?: string; groupId?: string } = {},
) {
  return {
    requestContext: {
      orgId: "org-1",
      userId: opts.userId ?? "owner-1",
      role,
      ...(opts.groupId ? { groupId: opts.groupId } : {}),
    },
  };
}

function stubPerms(o: Partial<PermissionsService> = {}): PermissionsService {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    ...o,
  } as unknown as PermissionsService;
}

function makeAgg(c: Case = BASE) {
  return {
    case: c,
    counts: {},
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    billing: {},
    deepLink: { customerId: "c" },
  };
}

void test("getAggregate: null result throws NotFoundException", async () => {
  const ctrl = new CasesController(
    {
      getDetailAggregate: () => Promise.resolve(null),
    } as unknown as CasesService,
    stubPerms(),
  );

  await assert.rejects(
    () => ctrl.getAggregate(reqCtx("viewer") as never, "non-existent-id"),
    (err: unknown) => {
      assert.ok(err instanceof NotFoundException);
      assert.match(String(err), /Case not found/);
      return true;
    },
  );
});

void test("getAggregate: existing case returns aggregate (no throw)", async () => {
  const agg = makeAgg();
  const ctrl = new CasesController(
    {
      getDetailAggregate: () => Promise.resolve(agg),
    } as unknown as CasesService,
    stubPerms(),
  );

  const result = await ctrl.getAggregate(reqCtx("staff") as never, "case-1");
  assert.strictEqual(result, agg);
});

void test("getAggregate: permission denied still throws ForbiddenException", async () => {
  const other = {
    ...BASE,
    ownerUserId: "x",
    assistantUserId: null,
    groupId: "x",
  };
  const ctrl = new CasesController(
    {
      getDetailAggregate: () => Promise.resolve(makeAgg(other)),
    } as unknown as CasesService,
    new PermissionsService(),
  );

  await assert.rejects(
    () =>
      ctrl.getAggregate(reqCtx("viewer", { userId: "v1" }) as never, "case-1"),
    ForbiddenException,
  );
});
