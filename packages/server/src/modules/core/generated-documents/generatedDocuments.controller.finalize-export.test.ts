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
import type { GeneratedDocumentDto } from "../cases/cases.types-generated-docs";
import { CasesService } from "../cases/cases.service";
import { GeneratedDocumentsController } from "./generatedDocuments.controller";
import { GeneratedDocumentsService } from "./generatedDocuments.service";
import type { RedisClient } from "../../../infra/redis/createRedisClient";

const ORG_ID = "00000000-0000-4000-8000-000000000000";
const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER = "00000000-0000-4000-8000-000000000009";
const CASE_ID = "00000000-0000-4000-8000-000000000002";
const GD_ID = "00000000-0000-4000-8000-000000000005";

const staffReq = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "staff" as const,
    groupId: "g1",
  },
};
const managerReq = {
  requestContext: {
    orgId: ORG_ID,
    userId: USER_ID,
    role: "manager" as const,
    groupId: "g1",
  },
};
const assistantReq = {
  requestContext: {
    orgId: ORG_ID,
    userId: OTHER_USER,
    role: "staff" as const,
    groupId: "g1",
  },
};

const mockCase: Case = {
  id: CASE_ID,
  orgId: ORG_ID,
  customerId: "c-1",
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
  assistantUserId: OTHER_USER,
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

function gdEntity(
  overrides: Partial<GeneratedDocument> = {},
): GeneratedDocument {
  return {
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
    ...overrides,
  };
}

function gdDto(
  overrides: Partial<GeneratedDocumentDto> = {},
): GeneratedDocumentDto {
  return {
    id: GD_ID,
    caseId: CASE_ID,
    templateId: null,
    title: "申請書",
    versionNo: 1,
    outputFormat: "pdf",
    fileUrl: null,
    status: "final",
    generatedBy: USER_ID,
    generatedByDisplayName: "Test",
    approvedBy: USER_ID,
    approvedByDisplayName: "Test",
    generatedAt: "2026-01-01T00:00:00.000Z",
    approvedAt: "2026-01-02T00:00:00.000Z",
    templateVersionNoSnapshot: null,
    templateDocType: null,
    ...overrides,
  };
}

function perms(
  overrides: Partial<PermissionsService> = {},
): PermissionsService {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    canFinalizeCase: () => true,
    ...overrides,
  } as unknown as PermissionsService;
}

function cases(overrides: Partial<CasesService> = {}): CasesService {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  } as unknown as CasesService;
}

const fakeRedisClient = {
  isOpen: true,
  rPush: () => Promise.resolve(1),
  lPop: () => Promise.resolve(null),
  connect: () => Promise.resolve(),
} as unknown as RedisClient;

const fakeStorageAdapter = {
  upload: () => Promise.resolve(),
  download: () => Promise.resolve(Buffer.from("stub")),
  remove: () => Promise.resolve(),
  getSignedUrl: () => Promise.resolve("https://example.test/file"),
};

function ctrl(opts: {
  entity?: GeneratedDocument;
  svc?: Partial<GeneratedDocumentsService>;
  cs?: Partial<CasesService>;
  perm?: Partial<PermissionsService>;
}) {
  const entity = opts.entity ?? gdEntity();
  const svc = {
    get: () => Promise.resolve(entity),
    getDto: () => Promise.resolve(gdDto()),
    list: () => Promise.resolve({ items: [gdDto()], total: 1 }),
    create: () => Promise.resolve(gdDto()),
    update: () => Promise.resolve(gdDto()),
    writeTimeline: () => Promise.resolve(),
    ...opts.svc,
  } as unknown as GeneratedDocumentsService;
  return new GeneratedDocumentsController(
    svc,
    cases(opts.cs),
    perms(opts.perm),
    fakeRedisClient,
    fakeStorageAdapter,
  );
}

// ─── finalize: happy path ────────────────────────────────────────

void test("finalize calls update with status=final and skipTimelineWrite", async () => {
  let input: Record<string, unknown> | undefined;
  let opts: Record<string, unknown> | undefined;
  const c = ctrl({
    svc: {
      update: (
        _c: unknown,
        _id: string,
        i: Record<string, unknown>,
        o?: Record<string, unknown>,
      ) => {
        input = i;
        opts = o;
        return Promise.resolve(gdDto());
      },
    },
  });
  const r = await c.finalize(staffReq as never, GD_ID);
  assert.equal(r.status, "final");
  assert.deepEqual(input, { status: "final" });
  assert.deepEqual(opts, { skipTimelineWrite: true });
});

// ─── finalize: writes timeline on status change ──────────────────

void test("finalize writes finalized timeline when status changes", async () => {
  let tlInput: Record<string, unknown> | undefined;
  const c = ctrl({
    entity: gdEntity({ status: "draft" }),
    svc: {
      writeTimeline: (_c: unknown, i: Record<string, unknown>) => {
        tlInput = i;
        return Promise.resolve();
      },
    },
  });
  await c.finalize(staffReq as never, GD_ID);
  assert.ok(tlInput);
  assert.equal(tlInput.action, "generated_document.finalized");
  assert.equal(tlInput.generatedDocumentId, GD_ID);
});

// ─── finalize: idempotent (already final → no extra timeline) ────

void test("finalize skips timeline write when already final", async () => {
  let tlWritten = false;
  const c = ctrl({
    entity: gdEntity({ status: "final" }),
    svc: {
      writeTimeline: () => {
        tlWritten = true;
        return Promise.resolve();
      },
    },
  });
  await c.finalize(staffReq as never, GD_ID);
  assert.equal(tlWritten, false);
});

// ─── finalize: permission — owner ok ─────────────────────────────

void test("finalize allows case owner (staff)", async () => {
  const p = new PermissionsService();
  const c = ctrl({
    perm: {
      canEditCase: () => true,
      canFinalizeCase: (u, r) => p.canFinalizeCase(u, r as never, mockCase),
    },
  });
  const r = await c.finalize(staffReq as never, GD_ID);
  assert.equal(r.status, "final");
});

// ─── finalize: permission — manager ok ───────────────────────────

void test("finalize allows manager even if not owner", async () => {
  const p = new PermissionsService();
  const c = ctrl({
    perm: {
      canEditCase: () => true,
      canFinalizeCase: (u, r) => p.canFinalizeCase(u, r as never, mockCase),
    },
  });
  const r = await c.finalize(managerReq as never, GD_ID);
  assert.equal(r.status, "final");
});

// ─── finalize: permission — assistant denied ─────────────────────

void test("finalize rejects assistant (non-owner staff)", async () => {
  const p = new PermissionsService();
  const c = ctrl({
    perm: {
      canEditCase: () => true,
      canFinalizeCase: (u, r) => p.canFinalizeCase(u, r as never, mockCase),
    },
  });
  await assert.rejects(
    () => c.finalize(assistantReq as never, GD_ID),
    ForbiddenException,
  );
});

// ─── finalize: auth guard ────────────────────────────────────────

void test("finalize requires request context", async () => {
  const c = ctrl({});
  await assert.rejects(
    () => c.finalize({} as never, GD_ID),
    UnauthorizedException,
  );
});

void test("finalize throws NotFoundException when doc missing", async () => {
  const c = ctrl({ svc: { get: () => Promise.resolve(null) } });
  await assert.rejects(
    () => c.finalize(staffReq as never, GD_ID),
    NotFoundException,
  );
});

void test("finalize rejects S9 case", async () => {
  const s9: Case = { ...mockCase, stage: "S9", status: "S9" };
  const c = ctrl({ cs: { get: () => Promise.resolve(s9) } });
  await assert.rejects(
    () => c.finalize(staffReq as never, GD_ID),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});

// ─── export: happy path ─────────────────────────────────────────

void test("export calls update with status=exporting and skipTimelineWrite", async () => {
  let input: Record<string, unknown> | undefined;
  let opts: Record<string, unknown> | undefined;
  const c = ctrl({
    entity: gdEntity({ status: "final", outputFormat: "pdf" }),
    svc: {
      update: (
        _c: unknown,
        _id: string,
        i: Record<string, unknown>,
        o?: Record<string, unknown>,
      ) => {
        input = i;
        opts = o;
        return Promise.resolve(gdDto({ status: "exporting" }));
      },
    },
  });
  const r = await c.export(staffReq as never, GD_ID);
  assert.equal(r.status, "exporting");
  assert.ok(input, "update must have been called");
  assert.equal(input.status, "exporting");
  assert.equal(input.fileUrl, undefined);
  assert.deepEqual(opts, { skipTimelineWrite: true });
});

// ─── export: timeline written with export_queued action ─────────

void test("export writes export_queued timeline", async () => {
  const tlCalls: Record<string, unknown>[] = [];
  const c = ctrl({
    entity: gdEntity({ status: "final" }),
    svc: {
      update: () => Promise.resolve(gdDto({ status: "exporting" })),
      writeTimeline: (_c: unknown, i: Record<string, unknown>) => {
        tlCalls.push(i);
        return Promise.resolve();
      },
    },
  });
  await c.export(staffReq as never, GD_ID);
  assert.equal(tlCalls.length, 1);
  assert.equal(tlCalls[0].action, "generated_document.export_queued");
});

// ─── export: 409 when already exporting ──────────────────────────

void test("export returns 409 when already exporting", async () => {
  const c = ctrl({
    entity: gdEntity({ status: "exporting" }),
  });
  await assert.rejects(
    () => c.export(staffReq as never, GD_ID),
    (e) => {
      assert.ok(
        e instanceof Error && e.constructor.name === "ConflictException",
      );
      return true;
    },
  );
});

// ─── export: allows retry from export_failed ─────────────────────

void test("export allows retry from export_failed status", async () => {
  const c = ctrl({
    entity: gdEntity({ status: "export_failed" }),
    svc: {
      update: () => Promise.resolve(gdDto({ status: "exporting" })),
    },
  });
  const r = await c.export(staffReq as never, GD_ID);
  assert.equal(r.status, "exporting");
});

// ─── export: auth guard ──────────────────────────────────────────

void test("export requires request context", async () => {
  const c = ctrl({});
  await assert.rejects(
    () => c.export({} as never, GD_ID),
    UnauthorizedException,
  );
});

void test("export throws NotFoundException when doc missing", async () => {
  const c = ctrl({ svc: { get: () => Promise.resolve(null) } });
  await assert.rejects(
    () => c.export(staffReq as never, GD_ID),
    NotFoundException,
  );
});

void test("export rejects S9 case", async () => {
  const s9: Case = { ...mockCase, stage: "S9", status: "S9" };
  const c = ctrl({
    entity: gdEntity({ status: "final" }),
    cs: { get: () => Promise.resolve(s9) },
  });
  await assert.rejects(
    () => c.export(staffReq as never, GD_ID),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});

void test("export throws ForbiddenException when canEditCase denies", async () => {
  const c = ctrl({
    entity: gdEntity({ status: "final" }),
    perm: { canEditCase: () => false },
  });
  await assert.rejects(
    () => c.export(staffReq as never, GD_ID),
    ForbiddenException,
  );
});

// ─── export: timeline payload includes title ─────────────────────

void test("export timeline payload includes title in extra", async () => {
  let tlInput: Record<string, unknown> | undefined;
  const c = ctrl({
    entity: gdEntity({ status: "final", title: "申請書" }),
    svc: {
      update: () => Promise.resolve(gdDto({ status: "exporting" })),
      writeTimeline: (_c: unknown, i: Record<string, unknown>) => {
        tlInput = i;
        return Promise.resolve();
      },
    },
  });
  await c.export(staffReq as never, GD_ID);
  assert.ok(tlInput);
  const extra = tlInput.extra as Record<string, unknown>;
  assert.equal(extra.title, "申請書");
});
