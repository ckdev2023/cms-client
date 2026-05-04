import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ReviewRecordsController } from "./reviewRecords.controller";
const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const VALIDATION_RUN_ID = "00000000-0000-4000-8000-000000000003";
const REVIEW_RECORD_ID = "00000000-0000-4000-8000-000000000004";
const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff",
    groupId: "group-1",
  },
};
const mockCase = {
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
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const mockReviewRecord = {
  id: REVIEW_RECORD_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  validationRunId: VALIDATION_RUN_ID,
  decision: "approved",
  comment: "ok",
  reviewerUserId: USER_ID,
  reviewedAt: "2026-01-01T00:00:00.000Z",
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
function makeCasesService(overrides = {}) {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  };
}
function makeController(opts = {}) {
  const service = {
    create: () => Promise.resolve(mockReviewRecord),
    get: () => Promise.resolve(mockReviewRecord),
    list: () => Promise.resolve({ items: [mockReviewRecord], total: 1 }),
    ...opts.service,
  };
  return new ReviewRecordsController(
    service,
    makeCasesService(opts.cases),
    makePermissions(opts.permissions),
  );
}
void test("create validates body and requires context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.create({}, { caseId: CASE_ID }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => controller.create(req, { caseId: "" }),
    /caseId is required/,
  );
  await assert.rejects(
    () =>
      controller.create(req, {
        caseId: CASE_ID,
        validationRunId: VALIDATION_RUN_ID,
        decision: "noop",
      }),
    /decision must be approved or rejected/,
  );
});
void test("create forwards input to service", async () => {
  let calledInput;
  const controller = makeController({
    service: {
      create: (_ctx, input) => {
        calledInput = input;
        return Promise.resolve(mockReviewRecord);
      },
    },
  });
  const created = await controller.create(req, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    decision: "approved",
    comment: "ok",
  });
  assert.equal(created.id, REVIEW_RECORD_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    decision: "approved",
    comment: "ok",
  });
});
void test("list parses query", async () => {
  let calledQuery;
  const controller = makeController({
    service: {
      list: (_ctx, input) => {
        calledQuery = input;
        return Promise.resolve({ items: [mockReviewRecord], total: 1 });
      },
    },
  });
  const result = await controller.list(req, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    page: "2",
    limit: "20",
  });
  assert.equal(result.total, 1);
  assert.deepEqual(calledQuery, {
    caseId: CASE_ID,
    validationRunId: VALIDATION_RUN_ID,
    page: 2,
    limit: 20,
  });
});
void test("get throws when record is missing", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.get(req, REVIEW_RECORD_ID),
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
        return Promise.resolve(mockReviewRecord);
      },
    },
    permissions: { canEditCase: () => false },
  });
  await assert.rejects(
    () =>
      controller.create(req, {
        caseId: CASE_ID,
        validationRunId: VALIDATION_RUN_ID,
        decision: "approved",
      }),
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
      controller.create(req, {
        caseId: CASE_ID,
        validationRunId: VALIDATION_RUN_ID,
        decision: "approved",
      }),
    NotFoundException,
  );
});
void test("create throws BadRequestException when parent case is S9", async () => {
  let createCalled = false;
  const archivedCase = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockReviewRecord);
      },
    },
  });
  await assert.rejects(
    () =>
      controller.create(req, {
        caseId: CASE_ID,
        validationRunId: VALIDATION_RUN_ID,
        decision: "approved",
      }),
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
    () => controller.list(req, { caseId: CASE_ID }),
    ForbiddenException,
  );
});
void test("get checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });
  await assert.rejects(
    () => controller.get(req, REVIEW_RECORD_ID),
    ForbiddenException,
  );
});
//# sourceMappingURL=reviewRecords.controller.test.js.map
