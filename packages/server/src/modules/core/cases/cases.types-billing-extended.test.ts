import assert from "node:assert/strict";
import test from "node:test";

import {
  BILLING_ERROR_CODES,
  type BillingErrorCode,
  type CaseBillingGuardResult,
  type CaseBillingCacheSyncFields,
  type CaseBillingRiskAckInput,
  type CaseBillingRiskAckRecord,
  type CaseBillingSummaryFull,
  type CaseBillingTabAggregate,
  type CaseBillingTimelineAction,
  type CaseBillingMilestoneHint,
  type CaseBillingSummaryRangeQuery,
  type BillingListSummaryDto,
} from "./cases.types-billing";

// ─── BillingGuard ──────────────────────────────────────────────

void test("CaseBillingGuardResult null means no guard needed", () => {
  const result: CaseBillingGuardResult = null;
  assert.equal(result, null);
});

void test("CaseBillingGuardResult settled=true means guard passed", () => {
  const result: CaseBillingGuardResult = { settled: true };
  assert.equal(result.settled, true);
});

void test("CaseBillingGuardResult settled=false with warn allows risk ack flow", () => {
  const result: CaseBillingGuardResult = {
    settled: false,
    unpaid: 120000,
    gateEffectMode: "warn",
  };
  assert.equal(result.settled, false);
  assert.equal(result.gateEffectMode, "warn");
});

void test("CaseBillingGuardResult settled=false with block is P1 hard stop", () => {
  const result: CaseBillingGuardResult = {
    settled: false,
    unpaid: 200000,
    gateEffectMode: "block",
  };
  assert.equal(result.gateEffectMode, "block");
});

// ─── RiskAck ───────────────────────────────────────────────────

void test("CaseBillingRiskAckInput with all fields", () => {
  const input: CaseBillingRiskAckInput = {
    reasonCode: "client_promise",
    reasonNote: "客户承诺 6 月底前结清",
    evidenceUrl: "https://example.com/evidence.pdf",
  };
  assert.equal(input.reasonCode, "client_promise");
});

void test("CaseBillingRiskAckRecord represents acknowledged state", () => {
  const record: CaseBillingRiskAckRecord = {
    acknowledged: true,
    acknowledgedAt: "2026-05-01T12:00:00Z",
    acknowledgedBy: "u-1",
    acknowledgedByDisplayName: "田中太郎",
    reasonCode: "client_promise",
    reasonNote: "客户承诺 6 月底前结清",
    evidenceUrl: null,
  };
  assert.equal(record.acknowledged, true);
  assert.equal(record.acknowledgedByDisplayName, "田中太郎");
});

void test("CaseBillingRiskAckRecord represents unacknowledged state", () => {
  const record: CaseBillingRiskAckRecord = {
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
    acknowledgedByDisplayName: null,
    reasonCode: null,
    reasonNote: null,
    evidenceUrl: null,
  };
  assert.equal(record.acknowledged, false);
  assert.equal(record.acknowledgedAt, null);
});

// ─── BillingSummaryFull ────────────────────────────────────────

void test("CaseBillingSummaryFull covers aggregate tab header fields", () => {
  const summary: CaseBillingSummaryFull = {
    quotePrice: 500000,
    totalDue: 500000,
    totalReceived: 300000,
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
    planCount: 2,
    paymentCount: 3,
    overduePlanCount: 0,
  };

  assert.equal(summary.totalDue - summary.totalReceived, summary.unpaidAmount);
  assert.equal(summary.depositPaid, true);
  assert.equal(summary.finalPaymentPaid, false);
});

// ─── BillingTabAggregate ───────────────────────────────────────

void test("CaseBillingTabAggregate bundles summary + plans + payments", () => {
  const aggregate: CaseBillingTabAggregate = {
    summary: {
      quotePrice: 500000,
      totalDue: 500000,
      totalReceived: 500000,
      unpaidAmount: 0,
      depositPaid: true,
      finalPaymentPaid: true,
      billingRiskAck: {
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: null,
        acknowledgedByDisplayName: null,
        reasonCode: null,
        reasonNote: null,
        evidenceUrl: null,
      },
      planCount: 1,
      paymentCount: 1,
      overduePlanCount: 0,
    },
    plans: [],
    recentPayments: [],
    recentPaymentsTotal: 0,
  };

  assert.equal(aggregate.summary.unpaidAmount, 0);
  assert.equal(aggregate.plans.length, 0);
  assert.equal(aggregate.recentPaymentsTotal, 0);
});

void test("CaseBillingTabAggregate recentPaymentsTotal may exceed recentPayments length (D8: max 50)", () => {
  const aggregate: CaseBillingTabAggregate = {
    summary: {
      quotePrice: 1000000,
      totalDue: 1000000,
      totalReceived: 800000,
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
      paymentCount: 75,
      overduePlanCount: 1,
    },
    plans: [],
    recentPayments: [],
    recentPaymentsTotal: 75,
  };

  assert.equal(aggregate.recentPayments.length, 0);
  assert.equal(
    aggregate.recentPaymentsTotal,
    75,
    "D8: total reflects real count even when recentPayments is capped at 50",
  );
});

// ─── BillingCacheSyncFields ────────────────────────────────────

void test("CaseBillingCacheSyncFields maps to Case cache columns", () => {
  const fields: CaseBillingCacheSyncFields = {
    depositPaid: true,
    finalPaymentPaid: false,
    unpaidAmount: 120000,
  };
  assert.equal(fields.depositPaid, true);
  assert.equal(fields.unpaidAmount, 120000);
});

// ─── Error codes ───────────────────────────────────────────────

void test("BILLING_ERROR_CODES covers billing plan and payment record errors", () => {
  const bpCodes: BillingErrorCode[] = [
    BILLING_ERROR_CODES.BP_CASE_NOT_FOUND,
    BILLING_ERROR_CODES.BP_NOT_FOUND,
    BILLING_ERROR_CODES.BP_CASE_S9_READONLY,
    BILLING_ERROR_CODES.BP_INVALID_AMOUNT,
    BILLING_ERROR_CODES.BP_INVALID_GATE_MODE,
    BILLING_ERROR_CODES.BP_ALREADY_PAID,
    BILLING_ERROR_CODES.BP_TRANSITION_NOT_ALLOWED,
  ];
  assert.equal(bpCodes.length, 7);

  const prCodes: BillingErrorCode[] = [
    BILLING_ERROR_CODES.PR_BILLING_PLAN_NOT_FOUND,
    BILLING_ERROR_CODES.PR_NOT_FOUND,
    BILLING_ERROR_CODES.PR_INVALID_AMOUNT,
    BILLING_ERROR_CODES.PR_INVALID_PAYMENT_METHOD,
    BILLING_ERROR_CODES.PR_VOID_NOT_VALID,
    BILLING_ERROR_CODES.PR_VOID_REQUIRES_MANAGER,
    BILLING_ERROR_CODES.PR_VOID_REASON_REQUIRED,
  ];
  assert.equal(prCodes.length, 7);
});

// ─── Timeline action ──────────────────────────────────────────

void test("CaseBillingTimelineAction covers all billing timeline events", () => {
  const actions: CaseBillingTimelineAction[] = [
    "billing_plan.created",
    "billing_plan.updated",
    "billing_plan.transitioned",
    "payment_record.created",
    "payment_record.voided",
    "payment_record.reversed",
    "case.billing_risk_acknowledged",
    "case.collection_task_created",
  ];
  assert.equal(actions.length, 8);
});

// ─── BillingListSummaryDto / CaseBillingSummaryRangeQuery ──────

void test("CaseBillingSummaryRangeQuery all fields optional", () => {
  const empty: CaseBillingSummaryRangeQuery = {};
  assert.equal(empty.status, undefined);

  const full: CaseBillingSummaryRangeQuery = {
    status: "overdue",
    groupId: "grp-1",
    ownerId: "u-1",
    q: "签約金",
    from: "2026-01-01",
    to: "2026-12-31",
  };
  assert.equal(full.status, "overdue");
  assert.equal(full.q, "签約金");
});

void test("BillingListSummaryDto contains four aggregate indicators", () => {
  const dto: BillingListSummaryDto = {
    totalDue: 1000000,
    totalReceived: 700000,
    totalOutstanding: 300000,
    overdueAmount: 150000,
  };

  assert.equal(dto.totalOutstanding, 300000);
  assert.equal(dto.overdueAmount, 150000);
});

void test("BillingListSummaryDto totalOutstanding is clamped to zero", () => {
  const dto: BillingListSummaryDto = {
    totalDue: 500000,
    totalReceived: 600000,
    totalOutstanding: 0,
    overdueAmount: 0,
  };

  assert.equal(
    dto.totalOutstanding,
    0,
    "totalOutstanding = max(totalDue - totalReceived, 0)",
  );
});

// ─── MilestoneHint ─────────────────────────────────────────────

void test("CaseBillingMilestoneHint enumerates milestone categories", () => {
  const hints: CaseBillingMilestoneHint[] = [
    "deposit",
    "final_payment",
    "custom",
  ];
  assert.equal(hints.length, 3);
});
