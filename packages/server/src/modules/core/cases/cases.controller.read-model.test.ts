import test from "node:test";
import assert from "node:assert/strict";
import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Case } from "../model/coreEntities";
import { CasesController } from "./cases.controller";
import { CasesService } from "./cases.service";

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

// ── list view=summary ──

void test("list with view=summary calls listSummary", async () => {
  let called = false;
  let capturedInput: Record<string, unknown> | undefined;
  const summaryResult = {
    items: [
      {
        ...mockCase,
        customerName: "Alice",
        groupName: null,
        ownerDisplayName: "S",
        assistantDisplayName: null,
      },
    ],
    total: 1,
    page: 1,
    limit: 50,
  };
  const service = {
    listSummary: (_ctx: unknown, input: Record<string, unknown>) => {
      called = true;
      capturedInput = input;
      return Promise.resolve(summaryResult);
    },
    list: () => Promise.resolve({ items: [], total: 0 }),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const result = await controller.list(viewerCtxReq as never, {
    scope: "mine",
    view: "summary",
  });
  assert.equal(called, true);
  assert.equal(capturedInput?.scope, "mine");
  assert.equal((result as typeof summaryResult).page, 1);
});

void test("list without view=summary calls list", async () => {
  let listCalled = false;
  const service = {
    listSummary: () =>
      Promise.resolve({ items: [], total: 0, page: 1, limit: 50 }),
    list: () => {
      listCalled = true;
      return Promise.resolve({ items: [], total: 0 });
    },
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await controller.list(viewerCtxReq as never, {});
  assert.equal(listCalled, true);
});

// ── getAggregate ──

void test("getAggregate returns aggregate DTO", async () => {
  const aggregate = {
    case: mockCase,
    counts: {
      documentItemsTotal: 10,
      documentItemsDone: 5,
      caseParties: 2,
      tasks: 3,
      tasksPending: 1,
      communicationLogs: 4,
      submissionPackages: 1,
      generatedDocuments: 2,
      validationRuns: 1,
      reviewRecords: 0,
      billingRecords: 3,
      paymentRecords: 1,
    },
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [
      { providerRole: "applicant", total: 5, done: 3 },
    ],
    billing: {
      quotePrice: null,
      depositPaid: false,
      finalPaymentPaid: false,
      unpaidAmount: 0,
      billingRiskAcknowledged: false,
      billingRiskAcknowledgedAt: null,
      billingRiskAckReasonCode: null,
    },
    deepLink: {
      customerId: "customer-1",
      customerName: "Alice",
      groupId: null,
      groupName: "G1",
      ownerUserId: "user-1",
      ownerDisplayName: "Owner",
      assistantUserId: null,
      assistantDisplayName: null,
    },
  };
  const service = {
    getDetailAggregate: () => Promise.resolve(aggregate),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  const result = await controller.getAggregate(viewerCtxReq as never, "case-1");
  assert.equal((result as typeof aggregate).deepLink.customerName, "Alice");
  assert.equal((result as typeof aggregate).counts.documentItemsTotal, 10);
  assert.equal((result as typeof aggregate).counts.generatedDocuments, 2);
  assert.equal(
    (result as typeof aggregate).documentProgressByProvider.length,
    1,
  );
});

void test("getAggregate throws NotFoundException when case not found", async () => {
  const service = {
    getDetailAggregate: () => Promise.resolve(null),
  } as unknown as CasesService;

  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.getAggregate(viewerCtxReq as never, "missing"),
    NotFoundException,
  );
});

void test("getAggregate throws ForbiddenException when canViewCase denies", async () => {
  const aggregate = {
    case: mockCase,
    counts: {
      documentItemsTotal: 0,
      documentItemsDone: 0,
      caseParties: 0,
      tasks: 0,
      tasksPending: 0,
      communicationLogs: 0,
      submissionPackages: 0,
      generatedDocuments: 0,
      validationRuns: 0,
      reviewRecords: 0,
      billingRecords: 0,
      paymentRecords: 0,
    },
    latestValidation: null,
    latestSubmission: null,
    latestReview: null,
    documentProgressByProvider: [],
    billing: {
      quotePrice: null,
      depositPaid: false,
      finalPaymentPaid: false,
      unpaidAmount: 0,
      billingRiskAcknowledged: false,
      billingRiskAcknowledgedAt: null,
      billingRiskAckReasonCode: null,
    },
    deepLink: {
      customerId: "customer-1",
      customerName: "Alice",
      groupId: null,
      groupName: null,
      ownerUserId: "user-1",
      ownerDisplayName: "Owner",
      assistantUserId: null,
      assistantDisplayName: null,
    },
  };
  const service = {
    getDetailAggregate: () => Promise.resolve(aggregate),
  } as unknown as CasesService;

  const controller = new CasesController(
    service,
    makePermissions({ canViewCase: () => false }),
  );
  await assert.rejects(
    () => controller.getAggregate(viewerCtxReq as never, "case-1"),
    ForbiddenException,
  );
});

void test("getAggregate: missing requestContext throws UnauthorizedException", async () => {
  const service = {} as unknown as CasesService;
  const controller = new CasesController(service, makePermissions());

  await assert.rejects(
    () => controller.getAggregate({} as never, "case-1"),
    UnauthorizedException,
  );
});
