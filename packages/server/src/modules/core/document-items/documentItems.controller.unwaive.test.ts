import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";

import type { Case, DocumentItem } from "../model/coreEntities";
import { CasesService } from "../cases/cases.service";
import { ValidationAutoRunService } from "../validation-runs/validationAutoRun.service";
import { DocumentItemsController } from "./documentItems.controller";
import { DocumentItemsService } from "./documentItems.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const ITEM_ID = "00000000-0000-4000-8000-000000000003";

const req = {
  requestContext: { orgId: ORG_ID, userId: USER_ID, role: "staff" as const },
};

const mockItem: DocumentItem = {
  id: ITEM_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  checklistItemCode: "passport",
  name: "Passport Copy",
  status: "pending",
  requiredFlag: true,
  requestedAt: null,
  receivedAt: null,
  reviewedAt: null,
  dueAt: null,
  ownerSide: "applicant",
  providedByRole: "applicant",
  lastFollowUpAt: null,
  note: null,
  category: null,
  surveyData: null,
  waiveReasonLatest: null,
  waiveReasonCodeLatest: null,
  waivedByUserIdLatest: null,
  waivedAtLatest: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
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

const autoRunCalls: { caseId: string; trigger: string }[] = [];

function makeController(
  opts: {
    service?: Partial<DocumentItemsService>;
    cases?: Partial<CasesService>;
  } = {},
): DocumentItemsController {
  const service = {
    get: () => Promise.resolve({ ...mockItem, status: "waived" }),
    unwaive: () => Promise.resolve({ ...mockItem, status: "pending" }),
    ...opts.service,
  } as unknown as DocumentItemsService;
  const cases = {
    get: () => Promise.resolve(mockCase),
    ...opts.cases,
  } as unknown as CasesService;
  const autoRun = {
    schedule: (_ctx: unknown, caseId: string, trigger: string) => {
      autoRunCalls.push({ caseId, trigger });
    },
  } as unknown as ValidationAutoRunService;
  return new DocumentItemsController(service, cases, autoRun);
}

void test("unwaive: forwards to service, triggers autoRun, and returns result", async () => {
  autoRunCalls.length = 0;
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      get: () => Promise.resolve({ ...mockItem, status: "waived" }),
      unwaive: (
        _ctx: unknown,
        _id: unknown,
        input: Record<string, unknown>,
      ) => {
        calledInput = input;
        return Promise.resolve({ ...mockItem, status: "pending" });
      },
    },
  });

  const result = await controller.unwaive(req as never, ITEM_ID, {
    note: "restoring",
  });
  assert.equal(result.status, "pending");
  assert.deepEqual(calledInput, { note: "restoring" });
  assert.equal(autoRunCalls.length, 1);
  assert.equal(autoRunCalls[0]?.caseId, CASE_ID);
  assert.equal(autoRunCalls[0]?.trigger, "document_item.unwaive");
});

void test("unwaive: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.unwaive({} as never, ITEM_ID, {}),
    UnauthorizedException,
  );
});

void test("unwaive: throws when document item not found", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.unwaive(req as never, ITEM_ID, {}),
    BadRequestException,
  );
});

void test("unwaive: throws BadRequestException when parent case is S9", async () => {
  let unwaiveCalled = false;
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      get: () => Promise.resolve({ ...mockItem, status: "waived" }),
      unwaive: () => {
        unwaiveCalled = true;
        return Promise.resolve(mockItem);
      },
    },
  });

  await assert.rejects(
    () => controller.unwaive(req as never, ITEM_ID, {}),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(unwaiveCalled, false);
});

void test("unwaive: note defaults to undefined when not provided", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      get: () => Promise.resolve({ ...mockItem, status: "waived" }),
      unwaive: (
        _ctx: unknown,
        _id: unknown,
        input: Record<string, unknown>,
      ) => {
        calledInput = input;
        return Promise.resolve(mockItem);
      },
    },
  });

  await controller.unwaive(req as never, ITEM_ID, {});
  assert.deepEqual(calledInput, { note: undefined });
});
