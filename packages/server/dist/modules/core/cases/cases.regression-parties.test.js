/**
 * P0 回归矩阵 — §7 Case-parties + §12 resolveRoleTier
 */
import test from "node:test";
import assert from "node:assert/strict";
import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { resolveRoleTier } from "../auth/permissions.service";
import { CasePartiesController } from "../case-parties/caseParties.controller";
const BASE = {
  id: "case-1",
  orgId: "org-1",
  customerId: "customer-1",
  caseTypeCode: "visa",
  status: "S1",
  stage: "S1",
  groupId: "group-1",
  ownerUserId: "owner-1",
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
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
function mc(o = {}) {
  return { ...BASE, ...o };
}
const PARTY = {
  id: "party-1",
  orgId: "org-1",
  caseId: "case-1",
  partyType: "applicant",
  customerId: "cust-1",
  contactPersonId: null,
  relationToCase: "本人",
  isPrimary: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};
const S9_CASE = mc({ stage: "S9", status: "S9" });
function reqCtx(role) {
  return {
    requestContext: { orgId: "org-1", userId: "owner-1", role },
  };
}
function stubPerms(o = {}) {
  return {
    canViewCase: () => true,
    canEditCase: () => true,
    canExportCase: () => true,
    canAuditCase: () => true,
    canCreateCase: () => true,
    canPerformCaseAction: () => true,
    ...o,
  };
}
// ═══════════════════════════════════════════════════════════════
// §7 Case-parties
// ═══════════════════════════════════════════════════════════════
function cpCtrl(opts) {
  const ps = {
    create: () => Promise.resolve(PARTY),
    get: () => Promise.resolve(PARTY),
    list: () => Promise.resolve({ items: [PARTY], total: 1 }),
    update: () => Promise.resolve(PARTY),
    hardDelete: () => Promise.resolve(),
    ...opts.parties,
  };
  const cs = {
    get: () => Promise.resolve(BASE),
    ...opts.cases,
  };
  return new CasePartiesController(ps, cs, stubPerms(opts.permissions));
}
void test("§7 list: missing caseId → BadRequest", async () => {
  await assert.rejects(
    () => cpCtrl({}).list(reqCtx("viewer"), {}),
    BadRequestException,
  );
});
void test("§7 list: canViewCase denied → Forbidden", async () => {
  await assert.rejects(
    () =>
      cpCtrl({ permissions: { canViewCase: () => false } }).list(
        reqCtx("viewer"),
        { caseId: "c" },
      ),
    ForbiddenException,
  );
});
void test("§7 create: S9 parent → BadRequest", async () => {
  await assert.rejects(
    () =>
      cpCtrl({ cases: { get: () => Promise.resolve(S9_CASE) } }).create(
        reqCtx("staff"),
        { caseId: "c", partyType: "s", customerId: "c" },
      ),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});
void test("§7 update: S9 parent → BadRequest", async () => {
  await assert.rejects(
    () =>
      cpCtrl({ cases: { get: () => Promise.resolve(S9_CASE) } }).update(
        reqCtx("staff"),
        "p",
        { partyType: "c" },
      ),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});
void test("§7 delete: S9 parent → BadRequest", async () => {
  await assert.rejects(
    () =>
      cpCtrl({ cases: { get: () => Promise.resolve(S9_CASE) } }).delete(
        reqCtx("staff"),
        "p",
      ),
    (e) => {
      assert.ok(e instanceof BadRequestException);
      assert.ok(e.message.includes("S9"));
      return true;
    },
  );
});
void test("§7 create: canEditCase denied → Forbidden", async () => {
  await assert.rejects(
    () =>
      cpCtrl({ permissions: { canEditCase: () => false } }).create(
        reqCtx("staff"),
        { caseId: "c", partyType: "s", customerId: "c" },
      ),
    ForbiddenException,
  );
});
// ═══════════════════════════════════════════════════════════════
// §12 resolveRoleTier 回归
// ═══════════════════════════════════════════════════════════════
void test("§12 resolveRoleTier mapping", () => {
  assert.equal(resolveRoleTier("owner"), "admin");
  assert.equal(resolveRoleTier("manager"), "admin");
  assert.equal(resolveRoleTier("staff"), "staff");
  assert.equal(resolveRoleTier("viewer"), "viewer");
});
//# sourceMappingURL=cases.regression-parties.test.js.map
