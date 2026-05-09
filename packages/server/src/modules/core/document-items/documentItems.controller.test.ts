import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";

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
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
  },
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

const waivedItem: DocumentItem = {
  ...mockItem,
  status: "waived",
  waiveReasonCodeLatest: "visa_type_exempt",
  waiveReasonLatest: null,
  waivedByUserIdLatest: USER_ID,
  waivedAtLatest: "2026-03-01T00:00:00.000Z",
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
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const autoRunCalls: { caseId: string; trigger: string }[] = [];

function makeAutoRun(): ValidationAutoRunService {
  return {
    schedule: (_ctx: unknown, caseId: string, trigger: string) => {
      autoRunCalls.push({ caseId, trigger });
    },
  } as unknown as ValidationAutoRunService;
}

function makeController(
  opts: {
    service?: Partial<DocumentItemsService>;
    cases?: Partial<CasesService>;
    autoRun?: ValidationAutoRunService;
  } = {},
): DocumentItemsController {
  const service = {
    get: () => Promise.resolve(mockItem),
    waive: () => Promise.resolve(waivedItem),
    unwaive: () => Promise.resolve({ ...mockItem, status: "pending" }),
    ...opts.service,
  } as unknown as DocumentItemsService;
  const cases = {
    get: () => Promise.resolve(mockCase),
    ...opts.cases,
  } as unknown as CasesService;
  const autoRun = opts.autoRun ?? makeAutoRun();
  return new DocumentItemsController(service, cases, autoRun);
}

// ── waive: happy path ──
void test("waive: forwards to service and returns result", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      get: () => Promise.resolve(mockItem),
      waive: (_ctx: unknown, _id: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve(waivedItem);
      },
    },
  });

  const result = await controller.waive(req as never, ITEM_ID, {
    reasonCode: "visa_type_exempt",
  });

  assert.equal(result.status, "waived");
  assert.equal(result.waiveReasonCodeLatest, "visa_type_exempt");
  assert.deepEqual(calledInput, {
    reasonCode: "visa_type_exempt",
    note: undefined,
  });
});

// ── waive: with note ──
void test("waive: passes note to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      get: () => Promise.resolve(mockItem),
      waive: (_ctx: unknown, _id: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({
          ...waivedItem,
          waiveReasonCodeLatest: "other",
          waiveReasonLatest: "custom reason",
        });
      },
    },
  });

  await controller.waive(req as never, ITEM_ID, {
    reasonCode: "other",
    note: "custom reason",
  });

  assert.deepEqual(calledInput, {
    reasonCode: "other",
    note: "custom reason",
  });
});

// ── waive: missing request context ──
void test("waive: throws UnauthorizedException without context", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.waive({} as never, ITEM_ID, {
        reasonCode: "visa_type_exempt",
      }),
    UnauthorizedException,
  );
});

// ── waive: missing reasonCode ──
void test("waive: throws when reasonCode is missing", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.waive(req as never, ITEM_ID, {} as never),
    BadRequestException,
  );
});

// ── waive: empty reasonCode ──
void test("waive: throws when reasonCode is empty string", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.waive(req as never, ITEM_ID, { reasonCode: "" }),
    BadRequestException,
  );
});

// ── waive: invalid reasonCode ──
void test("waive: throws when reasonCode is not in enum", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.waive(req as never, ITEM_ID, {
        reasonCode: "invalid_code",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("Invalid reasonCode"));
      return true;
    },
  );
});

// ── waive: item not found ──
void test("waive: throws when document item not found", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () =>
      controller.waive(req as never, ITEM_ID, {
        reasonCode: "visa_type_exempt",
      }),
    BadRequestException,
  );
});

// ── waive: S9 readonly guard — case is S9 ──
void test("waive: throws BadRequestException when parent case is S9", async () => {
  let waiveCalled = false;
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      get: () => Promise.resolve(mockItem),
      waive: () => {
        waiveCalled = true;
        return Promise.resolve(waivedItem);
      },
    },
  });

  await assert.rejects(
    () =>
      controller.waive(req as never, ITEM_ID, {
        reasonCode: "visa_type_exempt",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      assert.ok(e.message.includes("DOCUMENT_ITEM_CASE_S9_READONLY"));
      return true;
    },
  );
  assert.equal(waiveCalled, false);
});

// ── waive: S9 readonly guard — case stage null falls back to status ──
void test("waive: S9 guard checks status when stage is null", async () => {
  const caseWithNullStage: Case = {
    ...mockCase,
    stage: null,
    status: "S9",
  };
  const controller = makeController({
    cases: { get: () => Promise.resolve(caseWithNullStage) },
    service: { get: () => Promise.resolve(mockItem) },
  });

  await assert.rejects(
    () =>
      controller.waive(req as never, ITEM_ID, {
        reasonCode: "visa_type_exempt",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});

// ── waive: S9 guard — parent case not found ──
void test("waive: throws NotFoundException when parent case is missing", async () => {
  const controller = makeController({
    cases: { get: () => Promise.resolve(null) },
    service: { get: () => Promise.resolve(mockItem) },
  });

  await assert.rejects(
    () =>
      controller.waive(req as never, ITEM_ID, {
        reasonCode: "visa_type_exempt",
      }),
    NotFoundException,
  );
});

// ── waive: S9 guard — non-S9 case passes ──
void test("waive: succeeds when parent case is not S9", async () => {
  const controller = makeController({
    cases: {
      get: () => Promise.resolve({ ...mockCase, stage: "S5", status: "S5" }),
    },
  });

  const result = await controller.waive(req as never, ITEM_ID, {
    reasonCode: "visa_type_exempt",
  });
  assert.equal(result.status, "waived");
});

// ── waive: all valid reason codes accepted ──
for (const code of [
  "visa_type_exempt",
  "guarantor_family_exempt",
  "equivalent_in_other_case",
  "immigration_confirmed_exempt",
  "other",
]) {
  void test(`waive: accepts reasonCode '${code}'`, async () => {
    const note = code === "other" ? "required note" : undefined;
    const controller = makeController({
      service: {
        get: () => Promise.resolve(mockItem),
        waive: () =>
          Promise.resolve({
            ...waivedItem,
            waiveReasonCodeLatest: code,
            waiveReasonLatest: note ?? null,
          }),
      },
    });

    const result = await controller.waive(req as never, ITEM_ID, {
      reasonCode: code,
      note,
    });
    assert.equal(result.status, "waived");
  });
}

// ────────────────────────────────────────────────────────────────
// A2: list — ownerSide / statusIn query param validation
// ────────────────────────────────────────────────────────────────

void test("list: passes ownerSide and statusIn to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, {
    ownerSide: "office",
    statusIn: "pending,approved",
  });

  assert.ok(calledInput);
  assert.equal(calledInput.ownerSide, "office");
  assert.deepEqual(calledInput.statusIn, ["pending", "approved"]);
});

void test("list: rejects invalid ownerSide", async () => {
  const controller = makeController({
    service: {
      list: () => Promise.resolve({ items: [], total: 0 }),
    },
  });

  await assert.rejects(
    () => controller.list(req as never, { ownerSide: "invalid_side" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("Invalid ownerSide"));
      return true;
    },
  );
});

void test("list: rejects invalid statusIn value", async () => {
  const controller = makeController({
    service: {
      list: () => Promise.resolve({ items: [], total: 0 }),
    },
  });

  await assert.rejects(
    () => controller.list(req as never, { statusIn: "pending,invalid_status" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("Invalid statusIn"));
      return true;
    },
  );
});

void test("list: accepts 'missing' as valid statusIn value", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, { statusIn: "missing" });
  assert.ok(calledInput);
  assert.deepEqual(calledInput.statusIn, ["missing"]);
});

void test("list: accepts 'expired' as valid statusIn value", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, { statusIn: "expired" });
  assert.ok(calledInput);
  assert.deepEqual(calledInput.statusIn, ["expired"]);
});

void test("list: rejects 'deleted' in statusIn", async () => {
  const controller = makeController({
    service: {
      list: () => Promise.resolve({ items: [], total: 0 }),
    },
  });

  await assert.rejects(
    () => controller.list(req as never, { statusIn: "deleted" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("Invalid statusIn"));
      return true;
    },
  );
});

void test("list: undefined ownerSide and statusIn are omitted from service input", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [], total: 0 });
      },
    },
  });

  await controller.list(req as never, { caseId: CASE_ID });
  assert.ok(calledInput);
  assert.equal(calledInput.ownerSide, undefined);
  assert.equal(calledInput.statusIn, undefined);
  assert.equal(calledInput.caseId, CASE_ID);
});
