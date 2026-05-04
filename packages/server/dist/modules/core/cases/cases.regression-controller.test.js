/**
 * P0 回归矩阵 — §3 S9 只读 + §4 权限 + §5 可见性 + §6 聚合 DTO
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { PermissionsService } from "../auth/permissions.service";
import { CasesController } from "./cases.controller";
const TS = "2026-01-01T00:00:00.000Z";
const BASE = {
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
function mc(o = {}) {
  return { ...BASE, ...o };
}
function reqCtx(role, opts = {}) {
  return {
    requestContext: {
      orgId: "org-1",
      userId: opts.userId ?? "owner-1",
      role,
      ...(opts.groupId ? { groupId: opts.groupId } : {}),
    },
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
const realPerms = new PermissionsService();
// ═══════════════════════════════════════════════════════════════
// §3 S9 全局只读
// ═══════════════════════════════════════════════════════════════
void test("§3 S9: PATCH update rejected", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    update: () => Promise.reject(new BadRequestException("CASE_S9_READONLY")),
  };
  const ctrl = new CasesController(service, stubPerms());
  await assert.rejects(
    () => ctrl.update(reqCtx("staff"), "case-1", { caseName: "x" }),
    BadRequestException,
  );
});
void test("§3 S9: POST transition rejected", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    transition: () =>
      Promise.reject(new BadRequestException("CASE_S9_READONLY")),
  };
  const ctrl = new CasesController(service, stubPerms());
  await assert.rejects(
    () => ctrl.transition(reqCtx("staff"), "case-1", { toStage: "S8" }),
    BadRequestException,
  );
});
void test("§3 S9: POST billing-risk-ack rejected", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    acknowledgeBillingRisk: () =>
      Promise.reject(new BadRequestException("CASE_S9_READONLY")),
  };
  const ctrl = new CasesController(service, stubPerms());
  await assert.rejects(
    () =>
      ctrl.acknowledgeBillingRisk(reqCtx("staff"), "case-1", {
        reasonCode: "t",
      }),
    BadRequestException,
  );
});
void test("§3 S9: POST post-approval-stage rejected", async () => {
  const service = {
    assertCanEditCase: () => Promise.resolve(),
    updatePostApprovalStage: () =>
      Promise.reject(new BadRequestException("CASE_S9_READONLY")),
  };
  const ctrl = new CasesController(service, stubPerms());
  await assert.rejects(
    () =>
      ctrl.updatePostApprovalStage(reqCtx("staff"), "case-1", {
        stage: "coe_sent",
      }),
    BadRequestException,
  );
});
// ═══════════════════════════════════════════════════════════════
// §4 权限矩阵
// ═══════════════════════════════════════════════════════════════
void test("§4 GET case: viewer non-participant denied", async () => {
  const other = mc({ ownerUserId: "x", assistantUserId: null, groupId: "x" });
  const service = {
    get: () => Promise.resolve(other),
  };
  const ctrl = new CasesController(service, realPerms);
  await assert.rejects(
    () => ctrl.get(reqCtx("viewer", { userId: "v1" }), "case-1"),
    ForbiddenException,
  );
});
void test("§4 staff same-group: view yes, edit no", () => {
  const c = mc({ groupId: "g1", ownerUserId: "other", assistantUserId: null });
  assert.equal(realPerms.canViewCase("s-x", "staff", "g1", c), true);
  assert.equal(realPerms.canEditCase("s-x", "staff", "g1", c), false);
});
void test("§4 manager: all actions on any case", () => {
  const c = mc({ ownerUserId: "other", groupId: "other-group" });
  assert.equal(realPerms.canViewCase("m", "manager", undefined, c), true);
  assert.equal(realPerms.canEditCase("m", "manager", undefined, c), true);
  assert.equal(realPerms.canExportCase("m", "manager", undefined, c), true);
  assert.equal(realPerms.canAuditCase("m", "manager", undefined, c), true);
});
void test("§4 staff export: owner yes, assistant no", () => {
  const c = mc();
  assert.equal(realPerms.canExportCase("owner-1", "staff", "group-1", c), true);
  assert.equal(
    realPerms.canExportCase("assistant-1", "staff", "group-1", c),
    false,
  );
});
void test("§4 viewer: edit/export/audit always denied", () => {
  const c = mc();
  assert.equal(realPerms.canEditCase("owner-1", "viewer", "group-1", c), false);
  assert.equal(
    realPerms.canExportCase("owner-1", "viewer", "group-1", c),
    false,
  );
  assert.equal(
    realPerms.canAuditCase("owner-1", "viewer", "group-1", c),
    false,
  );
});
void test("§4 missing requestContext → 401 on write paths", async () => {
  const ctrl = new CasesController({}, stubPerms());
  const noCtx = {};
  await assert.rejects(
    () => ctrl.transition(noCtx, "c", { toStage: "S2" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => ctrl.acknowledgeBillingRisk(noCtx, "c", { reasonCode: "t" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => ctrl.updatePostApprovalStage(noCtx, "c", { stage: "coe_sent" }),
    UnauthorizedException,
  );
  await assert.rejects(
    () => ctrl.getAggregate(noCtx, "c"),
    UnauthorizedException,
  );
});
void test("§4 create denied for viewer", async () => {
  const service = {
    create: () => Promise.resolve(BASE),
  };
  const ctrl = new CasesController(service, realPerms);
  await assert.rejects(
    () =>
      ctrl.create(reqCtx("viewer"), {
        customerId: "c",
        caseTypeCode: "v",
        ownerUserId: "u",
      }),
    ForbiddenException,
  );
});
void test("§4 staff non-participant: transition denied", async () => {
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    transition: () => Promise.resolve(mc()),
  };
  const ctrl = new CasesController(service, realPerms);
  await assert.rejects(
    () =>
      ctrl.transition(
        reqCtx("staff", { userId: "s-x", groupId: "g" }),
        "case-1",
        { toStage: "S2" },
      ),
    ForbiddenException,
  );
});
void test("§4 staff non-participant: update denied", async () => {
  const service = {
    assertCanEditCase: () =>
      Promise.reject(
        new ForbiddenException("Insufficient permissions to edit case"),
      ),
    update: () => Promise.resolve(mc()),
  };
  const ctrl = new CasesController(service, realPerms);
  await assert.rejects(
    () =>
      ctrl.update(reqCtx("staff", { userId: "s-x", groupId: "g" }), "case-1", {
        caseName: "t",
      }),
    ForbiddenException,
  );
});
// ═══════════════════════════════════════════════════════════════
// §5 可见性过滤
// ═══════════════════════════════════════════════════════════════
void test("§5 list: admin tier", async () => {
  let cap;
  const service = {
    list: (_, i) => {
      cap = i;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  await new CasesController(service, stubPerms()).list(
    reqCtx("manager", { groupId: "g" }),
    {},
  );
  assert.ok(cap);
  assert.equal(cap.visibility.roleTier, "admin");
});
void test("§5 list: staff tier includes groupId", async () => {
  let cap;
  const service = {
    list: (_, i) => {
      cap = i;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  await new CasesController(service, stubPerms()).list(
    reqCtx("staff", { groupId: "g1" }),
    {},
  );
  assert.ok(cap);
  const v = cap.visibility;
  assert.equal(v.roleTier, "staff");
  assert.equal(v.groupId, "g1");
});
void test("§5 list: viewer tier", async () => {
  let cap;
  const service = {
    list: (_, i) => {
      cap = i;
      return Promise.resolve({ items: [], total: 0 });
    },
  };
  await new CasesController(service, stubPerms()).list(reqCtx("viewer"), {});
  assert.ok(cap);
  assert.equal(cap.visibility.roleTier, "viewer");
});
void test("§5 view=summary dispatches to listSummary", async () => {
  let called = false;
  const service = {
    listSummary: (_, i) => {
      called = true;
      assert.ok(i.visibility);
      return Promise.resolve({ items: [], total: 0, page: 1, limit: 50 });
    },
    list: () => Promise.resolve({ items: [], total: 0 }),
  };
  await new CasesController(service, stubPerms()).list(
    reqCtx("staff", { groupId: "g" }),
    { view: "summary" },
  );
  assert.equal(called, true);
});
// ═══════════════════════════════════════════════════════════════
// §6 聚合 DTO
// ═══════════════════════════════════════════════════════════════
function makeAgg(c = BASE) {
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
void test("§6 getAggregate: canViewCase denied → Forbidden", async () => {
  const ctrl = new CasesController(
    {
      getDetailAggregate: () => Promise.resolve(makeAgg()),
    },
    stubPerms({ canViewCase: () => false }),
  );
  await assert.rejects(
    () => ctrl.getAggregate(reqCtx("viewer"), "c"),
    ForbiddenException,
  );
});
void test("§6 getAggregate: real perms deny non-participant viewer", async () => {
  const other = mc({ ownerUserId: "x", assistantUserId: null, groupId: "x" });
  const ctrl = new CasesController(
    {
      getDetailAggregate: () => Promise.resolve(makeAgg(other)),
    },
    realPerms,
  );
  await assert.rejects(
    () => ctrl.getAggregate(reqCtx("viewer", { userId: "v" }), "c"),
    ForbiddenException,
  );
});
void test("§6 getAggregate: not found → BadRequest", async () => {
  const ctrl = new CasesController(
    {
      getDetailAggregate: () => Promise.resolve(null),
    },
    stubPerms(),
  );
  await assert.rejects(
    () => ctrl.getAggregate(reqCtx("viewer"), "x"),
    BadRequestException,
  );
});
//# sourceMappingURL=cases.regression-controller.test.js.map
