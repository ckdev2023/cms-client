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
import type { GeneratedDocument } from "../model/documentEntities";
import { CasesService } from "../cases/cases.service";
import type { GeneratedDocumentDto } from "../cases/cases.types-generated-docs";
import { GeneratedDocumentsController } from "./generatedDocuments.controller";
import type { RedisClient } from "../../../infra/redis/createRedisClient";
import { GeneratedDocumentsService } from "./generatedDocuments.service";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const GD_ID = "00000000-0000-4000-8000-000000000005";

const req = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
    groupId: "group-1",
  },
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

const mockGdEntity: GeneratedDocument = {
  id: GD_ID,
  orgId: ORG_ID,
  caseId: CASE_ID,
  templateId: null,
  title: "申請書",
  versionNo: 1,
  outputFormat: "pdf",
  fileUrl: null,
  status: "draft",
  generatedBy: USER_ID,
  approvedBy: null,
  generatedAt: "2026-01-01T00:00:00.000Z",
  approvedAt: null,
  templateVersionNoSnapshot: null,
  templateDocType: null,
};

const mockGdDto: GeneratedDocumentDto = {
  id: GD_ID,
  caseId: CASE_ID,
  templateId: null,
  title: "申請書",
  versionNo: 1,
  outputFormat: "pdf",
  fileUrl: null,
  status: "draft",
  generatedBy: USER_ID,
  generatedByDisplayName: "Test User",
  approvedBy: null,
  approvedByDisplayName: null,
  generatedAt: "2026-01-01T00:00:00.000Z",
  approvedAt: null,
  templateVersionNoSnapshot: null,
  templateDocType: null,
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

function makeCasesService(overrides: Partial<CasesService> = {}): CasesService {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  } as unknown as CasesService;
}

function makeController(
  opts: {
    service?: Partial<GeneratedDocumentsService>;
    cases?: Partial<CasesService>;
    permissions?: Partial<PermissionsService>;
  } = {},
): GeneratedDocumentsController {
  const service = {
    get: () => Promise.resolve(mockGdEntity),
    getDto: () => Promise.resolve(mockGdDto),
    list: () => Promise.resolve({ items: [mockGdDto], total: 1 }),
    create: () => Promise.resolve(mockGdDto),
    update: () => Promise.resolve(mockGdDto),
    ...opts.service,
  } as unknown as GeneratedDocumentsService;
  const fakeRedis = {
    isOpen: true,
    rPush: () => Promise.resolve(1),
    lPop: () => Promise.resolve(null),
    connect: () => Promise.resolve(),
  } as unknown as RedisClient;
  const fakeStorage = {
    upload: () => Promise.resolve(),
    download: () => Promise.resolve(Buffer.from("stub")),
    remove: () => Promise.resolve(),
    getSignedUrl: () => Promise.resolve("https://example.test/file"),
  };
  return new GeneratedDocumentsController(
    service,
    makeCasesService(opts.cases),
    makePermissions(opts.permissions),
    fakeRedis,
    fakeStorage,
  );
}

// ─── list ────────────────────────────────────────────────────────

void test("list requires caseId", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list(req as never, {}),
    /caseId is required/,
  );
});

void test("list requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.list({} as never, { caseId: CASE_ID }),
    UnauthorizedException,
  );
});

void test("list parses query and forwards to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      list: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve({ items: [mockGdDto], total: 1 });
      },
    },
  });

  const result = await controller.list(req as never, {
    caseId: CASE_ID,
    status: "draft",
    page: "2",
    limit: "10",
  });
  assert.equal(result.total, 1);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    status: "draft",
    page: 2,
    limit: 10,
  });
});

void test("list checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });
  await assert.rejects(
    () => controller.list(req as never, { caseId: CASE_ID }),
    ForbiddenException,
  );
});

// ─── get ─────────────────────────────────────────────────────────

void test("get returns dto", async () => {
  const controller = makeController();
  const result = await controller.get(req as never, GD_ID);
  assert.equal(result.id, GD_ID);
  assert.equal(result.generatedByDisplayName, "Test User");
});

void test("get throws when not found", async () => {
  const controller = makeController({
    service: { getDto: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.get(req as never, GD_ID),
    NotFoundException,
  );
});

void test("get checks canViewCase on parent case", async () => {
  const controller = makeController({
    permissions: { canViewCase: () => false },
  });
  await assert.rejects(
    () => controller.get(req as never, GD_ID),
    ForbiddenException,
  );
});

// ─── create ──────────────────────────────────────────────────────

void test("create validates body", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.create(req as never, { title: "X" } as never),
    /caseId is required/,
  );
  await assert.rejects(
    () => controller.create(req as never, { caseId: CASE_ID } as never),
    /title is required/,
  );
});

void test("create requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () =>
      controller.create(
        {} as never,
        {
          caseId: CASE_ID,
          title: "X",
        } as never,
      ),
    UnauthorizedException,
  );
});

void test("create forwards input to service", async () => {
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      create: (_ctx: unknown, input: Record<string, unknown>) => {
        calledInput = input;
        return Promise.resolve(mockGdDto);
      },
    },
  });

  const result = await controller.create(
    req as never,
    {
      caseId: CASE_ID,
      title: "申請書",
      outputFormat: "pdf",
      templateId: "tpl-1",
    } as never,
  );
  assert.equal(result.id, GD_ID);
  assert.deepEqual(calledInput, {
    caseId: CASE_ID,
    title: "申請書",
    outputFormat: "pdf",
    templateId: "tpl-1",
    fileUrl: undefined,
    status: undefined,
  });
});

void test("create throws ForbiddenException when canEditCase denies", async () => {
  let createCalled = false;
  const controller = makeController({
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockGdDto);
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          title: "申請書",
        } as never,
      ),
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
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          title: "申請書",
        } as never,
      ),
    NotFoundException,
  );
});

void test("create throws BadRequestException when parent case is S9", async () => {
  let createCalled = false;
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    service: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockGdDto);
      },
    },
  });

  await assert.rejects(
    () =>
      controller.create(
        req as never,
        {
          caseId: CASE_ID,
          title: "申請書",
        } as never,
      ),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(createCalled, false);
});

// ─── update ──────────────────────────────────────────────────────

void test("update requires request context", async () => {
  const controller = makeController();
  await assert.rejects(
    () => controller.update({} as never, GD_ID, { status: "final" }),
    UnauthorizedException,
  );
});

void test("update throws NotFoundException when document is missing", async () => {
  const controller = makeController({
    service: { get: () => Promise.resolve(null) },
  });
  await assert.rejects(
    () => controller.update(req as never, GD_ID, { status: "final" }),
    NotFoundException,
  );
});

void test("update forwards input to service", async () => {
  let calledId: string | undefined;
  let calledInput: Record<string, unknown> | undefined;
  const controller = makeController({
    service: {
      update: (_ctx: unknown, id: string, input: Record<string, unknown>) => {
        calledId = id;
        calledInput = input;
        return Promise.resolve(mockGdDto);
      },
    },
  });

  await controller.update(req as never, GD_ID, {
    title: "更新版",
    status: "final",
  });
  assert.equal(calledId, GD_ID);
  assert.deepEqual(calledInput, {
    title: "更新版",
    outputFormat: undefined,
    fileUrl: undefined,
    status: "final",
  });
});

void test("update checks canEditCase on parent case", async () => {
  const controller = makeController({
    permissions: { canEditCase: () => false },
  });
  await assert.rejects(
    () => controller.update(req as never, GD_ID, { status: "final" }),
    ForbiddenException,
  );
});

void test("update throws BadRequestException when parent case is S9", async () => {
  const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };
  const controller = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
  });
  await assert.rejects(
    () => controller.update(req as never, GD_ID, { status: "final" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});
