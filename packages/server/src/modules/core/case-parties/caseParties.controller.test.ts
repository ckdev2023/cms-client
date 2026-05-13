import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

import { PermissionsService } from "../auth/permissions.service";
import type { Case, CaseParty } from "../model/coreEntities";
import { CasesService } from "../cases/cases.service";
import { CasePartiesController } from "./caseParties.controller";
import { CasePartiesService } from "./caseParties.service";

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
  jurisdictionAuthority: null,
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const mockParty: CaseParty = {
  id: "party-1",
  orgId: "org-1",
  caseId: "case-1",
  partyType: "spouse",
  customerId: "cust-1",
  contactPersonId: null,
  relationToCase: "配偶",
  isPrimary: false,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const staffReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "staff" as const,
    groupId: "group-1",
  },
};

const viewerReq = {
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

function makeCasesService(overrides: Partial<CasesService> = {}): CasesService {
  return {
    get: () => Promise.resolve(mockCase),
    ...overrides,
  } as unknown as CasesService;
}

function makePartiesService(
  overrides: Partial<CasePartiesService> = {},
): CasePartiesService {
  return {
    create: () => Promise.resolve(mockParty),
    get: () => Promise.resolve(mockParty),
    list: () => Promise.resolve({ items: [mockParty], total: 1 }),
    update: () => Promise.resolve(mockParty),
    hardDelete: () => Promise.resolve(),
    ...overrides,
  } as unknown as CasePartiesService;
}

function makeController(
  opts: {
    parties?: Partial<CasePartiesService>;
    cases?: Partial<CasesService>;
    permissions?: Partial<PermissionsService>;
  } = {},
): CasePartiesController {
  return new CasePartiesController(
    makePartiesService(opts.parties),
    makeCasesService(opts.cases),
    makePermissions(opts.permissions),
  );
}

// ---------------------------------------------------------------------------
// list — caseId required
// ---------------------------------------------------------------------------

void test("list throws BadRequestException when caseId is missing", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () => ctrl.list(viewerReq as never, {}),
    BadRequestException,
  );
});

void test("list throws BadRequestException when caseId is empty string", async () => {
  const ctrl = makeController();
  await assert.rejects(
    () => ctrl.list(viewerReq as never, { caseId: "" }),
    BadRequestException,
  );
});

void test("list returns data when caseId is provided and canViewCase allows", async () => {
  const ctrl = makeController();
  const result = await ctrl.list(viewerReq as never, { caseId: "case-1" });
  assert.equal(result.total, 1);
  assert.equal(result.items.length, 1);
});

void test("list throws NotFoundException when parent case does not exist", async () => {
  const ctrl = makeController({
    cases: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () => ctrl.list(viewerReq as never, { caseId: "nonexistent" }),
    NotFoundException,
  );
});

void test("list throws ForbiddenException when canViewCase denies", async () => {
  const ctrl = makeController({
    permissions: { canViewCase: () => false },
  });

  await assert.rejects(
    () => ctrl.list(viewerReq as never, { caseId: "case-1" }),
    ForbiddenException,
  );
});

// ---------------------------------------------------------------------------
// create — canEditCase guard
// ---------------------------------------------------------------------------

void test("create checks canEditCase before delegating", async () => {
  let createCalled = false;
  const ctrl = makeController({
    parties: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockParty);
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () =>
      ctrl.create(staffReq as never, {
        caseId: "case-1",
        partyType: "spouse",
        customerId: "cust-1",
      }),
    ForbiddenException,
  );
  assert.equal(createCalled, false);
});

void test("create proceeds when canEditCase allows", async () => {
  let createCalled = false;
  const ctrl = makeController({
    parties: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockParty);
      },
    },
  });

  await ctrl.create(staffReq as never, {
    caseId: "case-1",
    partyType: "spouse",
    customerId: "cust-1",
  });
  assert.equal(createCalled, true);
});

void test("create throws NotFoundException when parent case does not exist", async () => {
  const ctrl = makeController({
    cases: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () =>
      ctrl.create(staffReq as never, {
        caseId: "nonexistent",
        partyType: "spouse",
        customerId: "cust-1",
      }),
    NotFoundException,
  );
});

// ---------------------------------------------------------------------------
// update — canEditCase guard via party's parent case
// ---------------------------------------------------------------------------

void test("update checks canEditCase on parent case before delegating", async () => {
  let updateCalled = false;
  const ctrl = makeController({
    parties: {
      get: () => Promise.resolve(mockParty),
      update: () => {
        updateCalled = true;
        return Promise.resolve(mockParty);
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () => ctrl.update(staffReq as never, "party-1", { partyType: "child" }),
    ForbiddenException,
  );
  assert.equal(updateCalled, false);
});

void test("update proceeds when canEditCase allows", async () => {
  let updateCalled = false;
  const ctrl = makeController({
    parties: {
      get: () => Promise.resolve(mockParty),
      update: () => {
        updateCalled = true;
        return Promise.resolve(mockParty);
      },
    },
  });

  await ctrl.update(staffReq as never, "party-1", { partyType: "child" });
  assert.equal(updateCalled, true);
});

void test("update throws NotFoundException when party does not exist", async () => {
  const ctrl = makeController({
    parties: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () => ctrl.update(staffReq as never, "nonexistent", { partyType: "child" }),
    NotFoundException,
  );
});

// ---------------------------------------------------------------------------
// delete — canEditCase guard via party's parent case
// ---------------------------------------------------------------------------

void test("delete checks canEditCase on parent case before delegating", async () => {
  let deleteCalled = false;
  const ctrl = makeController({
    parties: {
      get: () => Promise.resolve(mockParty),
      hardDelete: () => {
        deleteCalled = true;
        return Promise.resolve();
      },
    },
    permissions: { canEditCase: () => false },
  });

  await assert.rejects(
    () => ctrl.delete(staffReq as never, "party-1"),
    ForbiddenException,
  );
  assert.equal(deleteCalled, false);
});

void test("delete proceeds when canEditCase allows", async () => {
  let deleteCalled = false;
  const ctrl = makeController({
    parties: {
      get: () => Promise.resolve(mockParty),
      hardDelete: () => {
        deleteCalled = true;
        return Promise.resolve();
      },
    },
  });

  const result = await ctrl.delete(staffReq as never, "party-1");
  assert.equal(result.ok, true);
  assert.equal(deleteCalled, true);
});

void test("delete throws NotFoundException when party does not exist", async () => {
  const ctrl = makeController({
    parties: { get: () => Promise.resolve(null) },
  });

  await assert.rejects(
    () => ctrl.delete(staffReq as never, "nonexistent"),
    NotFoundException,
  );
});

// ---------------------------------------------------------------------------
// §p0-sv-008: S9 write guard — case-parties inherit parent case's archived state
// ---------------------------------------------------------------------------

const archivedCase: Case = { ...mockCase, stage: "S9", status: "S9" };

void test("create throws BadRequestException when parent case is S9 (archived)", async () => {
  let createCalled = false;
  const ctrl = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    parties: {
      create: () => {
        createCalled = true;
        return Promise.resolve(mockParty);
      },
    },
  });

  await assert.rejects(
    () =>
      ctrl.create(staffReq as never, {
        caseId: "case-1",
        partyType: "spouse",
        customerId: "cust-1",
      }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(createCalled, false);
});

void test("update throws BadRequestException when parent case is S9 (archived)", async () => {
  let updateCalled = false;
  const ctrl = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    parties: {
      get: () => Promise.resolve(mockParty),
      update: () => {
        updateCalled = true;
        return Promise.resolve(mockParty);
      },
    },
  });

  await assert.rejects(
    () => ctrl.update(staffReq as never, "party-1", { partyType: "child" }),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(updateCalled, false);
});

void test("delete throws BadRequestException when parent case is S9 (archived)", async () => {
  let deleteCalled = false;
  const ctrl = makeController({
    cases: { get: () => Promise.resolve(archivedCase) },
    parties: {
      get: () => Promise.resolve(mockParty),
      hardDelete: () => {
        deleteCalled = true;
        return Promise.resolve();
      },
    },
  });

  await assert.rejects(
    () => ctrl.delete(staffReq as never, "party-1"),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
  assert.equal(deleteCalled, false);
});
