import test from "node:test";
import assert from "node:assert/strict";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { CasesController } from "./cases.controller";
const viewerCtxReq = {
  requestContext: {
    orgId: "org-1",
    userId: "user-1",
    role: "viewer",
  },
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
const mockAggregate = {
  summary: {
    quotePrice: 500000,
    totalDue: 300000,
    totalReceived: 100000,
    unpaidAmount: 200000,
    depositPaid: true,
    finalPaymentPaid: false,
    billingRiskAck: {
      acknowledged: false,
      acknowledgedAt: null,
      acknowledgedBy: null,
      acknowledgedByDisplayName: null,
      reasonCode: null,
      reasonNote: null,
      evidenceUrl: null,
    },
    planCount: 3,
    paymentCount: 2,
    overduePlanCount: 1,
  },
  plans: [
    {
      id: "bp-1",
      caseId: "case-1",
      milestoneName: "签约金",
      amountDue: 100000,
      dueDate: "2026-02-01",
      status: "paid",
      gateEffectMode: "warn",
      remark: null,
      paidAmount: 100000,
      unpaidAmount: 0,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  recentPayments: [
    {
      id: "pr-1",
      billingPlanId: "bp-1",
      caseId: "case-1",
      amountReceived: 100000,
      receivedAt: "2026-02-01T00:00:00.000Z",
      paymentMethod: "bank_transfer",
      recordStatus: "valid",
      receiptStorageType: null,
      receiptRelativePathOrKey: null,
      note: null,
      voidReasonCode: null,
      voidReasonNote: null,
      voidedBy: null,
      voidedByDisplayName: null,
      voidedAt: null,
      reversedFromPaymentRecordId: null,
      recordedBy: "user-1",
      recordedByDisplayName: null,
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ],
  recentPaymentsTotal: 1,
};
// ── getBillingTabAggregate ──
void test("getBillingTabAggregate returns aggregate", async () => {
  const service = {
    getBillingTabAggregate: () => Promise.resolve(mockAggregate),
  };
  const controller = new CasesController(service, makePermissions());
  const result = await controller.getBillingTabAggregate(
    viewerCtxReq,
    "case-1",
  );
  const typed = result;
  assert.equal(typed.summary.quotePrice, 500000);
  assert.equal(typed.summary.totalDue, 300000);
  assert.equal(typed.summary.totalReceived, 100000);
  assert.equal(typed.summary.unpaidAmount, 200000);
  assert.equal(typed.summary.planCount, 3);
  assert.equal(typed.summary.paymentCount, 2);
  assert.equal(typed.summary.overduePlanCount, 1);
  assert.equal(typed.plans.length, 1);
  assert.equal(typed.recentPayments.length, 1);
  assert.equal(typed.recentPaymentsTotal, 1);
});
void test("getBillingTabAggregate throws when case not found", async () => {
  const service = {
    getBillingTabAggregate: () =>
      Promise.reject(new NotFoundException("Case not found")),
  };
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.getBillingTabAggregate(viewerCtxReq, "missing"),
    NotFoundException,
  );
});
void test("getBillingTabAggregate: missing requestContext throws UnauthorizedException", async () => {
  const service = {};
  const controller = new CasesController(service, makePermissions());
  await assert.rejects(
    () => controller.getBillingTabAggregate({}, "case-1"),
    UnauthorizedException,
  );
});
void test("getBillingTabAggregate: empty plans and payments", async () => {
  const emptyAggregate = {
    summary: {
      quotePrice: null,
      totalDue: 0,
      totalReceived: 0,
      unpaidAmount: 0,
      depositPaid: false,
      finalPaymentPaid: false,
      billingRiskAck: {
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: null,
        acknowledgedByDisplayName: null,
        reasonCode: null,
        reasonNote: null,
        evidenceUrl: null,
      },
      planCount: 0,
      paymentCount: 0,
      overduePlanCount: 0,
    },
    plans: [],
    recentPayments: [],
    recentPaymentsTotal: 0,
  };
  const service = {
    getBillingTabAggregate: () => Promise.resolve(emptyAggregate),
  };
  const controller = new CasesController(service, makePermissions());
  const result = await controller.getBillingTabAggregate(
    viewerCtxReq,
    "case-1",
  );
  const typed = result;
  assert.equal(typed.plans.length, 0);
  assert.equal(typed.recentPayments.length, 0);
  assert.equal(typed.recentPaymentsTotal, 0);
  assert.equal(typed.summary.planCount, 0);
});
void test("getBillingTabAggregate: recentPaymentsTotal reflects true total when > 50", async () => {
  const aggWith51 = {
    ...mockAggregate,
    recentPaymentsTotal: 51,
  };
  const service = {
    getBillingTabAggregate: () => Promise.resolve(aggWith51),
  };
  const controller = new CasesController(service, makePermissions());
  const result = await controller.getBillingTabAggregate(
    viewerCtxReq,
    "case-1",
  );
  const typed = result;
  assert.equal(typed.recentPaymentsTotal, 51);
  assert.equal(typed.recentPayments.length, 1);
});
//# sourceMappingURL=cases.controller.billing-tab-aggregate.test.js.map
