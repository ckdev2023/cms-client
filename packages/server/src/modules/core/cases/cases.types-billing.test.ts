import assert from "node:assert/strict";
import test from "node:test";

import type { BillingPlan, PaymentRecord } from "../model/billingEntities";
import {
  BILLING_ERROR_CODES,
  type BillingErrorCode,
  type CaseBillingPlanListInput,
  type CaseBillingPlanDto,
  type CaseBillingPlanListResult,
  type CaseBillingPlanCreateInput,
  type CaseBillingPlanUpdateInput,
  type CaseBillingPlanTransitionInput,
  type CasePaymentRecordListInput,
  type CasePaymentRecordDto,
  type CasePaymentRecordListResult,
  type CasePaymentRecordCreateInput,
  type CasePaymentRecordVoidInput,
  type CaseBillingGuardResult,
  type CaseBillingCacheSyncFields,
  type CaseBillingRiskAckInput,
  type CaseBillingRiskAckRecord,
  type CaseBillingSummaryFull,
  type CaseBillingTabAggregate,
  type CaseBillingTimelineAction,
  type CaseBillingMilestoneHint,
} from "./cases.types-billing";

// ─── BillingPlan DTO ───────────────────────────────────────────

void test("CaseBillingPlanDto is constructable from a BillingPlan entity with enrichment", () => {
  const entity: BillingPlan = {
    id: "bp-1",
    orgId: "org-1",
    caseId: "c-1",
    milestoneName: "签約金",
    amountDue: 300000,
    dueDate: "2026-06-01",
    status: "due",
    gateEffectMode: "warn",
    remark: null,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  };

  const dto: CaseBillingPlanDto = {
    id: entity.id,
    caseId: entity.caseId,
    milestoneName: entity.milestoneName,
    amountDue: entity.amountDue,
    dueDate: entity.dueDate,
    status: entity.status,
    gateEffectMode: entity.gateEffectMode,
    remark: entity.remark,
    paidAmount: 0,
    unpaidAmount: 300000,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };

  assert.equal(dto.id, "bp-1");
  assert.equal(dto.milestoneName, "签約金");
  assert.equal(dto.paidAmount, 0);
  assert.equal(dto.unpaidAmount, 300000);
});

void test("CaseBillingPlanDto reflects partial payment state", () => {
  const dto: CaseBillingPlanDto = {
    id: "bp-2",
    caseId: "c-1",
    milestoneName: "尾款",
    amountDue: 200000,
    dueDate: "2026-08-01",
    status: "partial",
    gateEffectMode: "warn",
    remark: "awaiting remainder",
    paidAmount: 80000,
    unpaidAmount: 120000,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-05-15T00:00:00Z",
  };

  assert.equal(dto.status, "partial");
  assert.equal(dto.paidAmount + dto.unpaidAmount, dto.amountDue);
});

void test("CaseBillingPlanListResult wraps items and total", () => {
  const result: CaseBillingPlanListResult = { items: [], total: 0 };
  assert.equal(result.items.length, 0);
  assert.equal(result.total, 0);
});

void test("CaseBillingPlanListInput requires caseId, other fields optional", () => {
  const minimal: CaseBillingPlanListInput = { caseId: "c-1" };
  assert.equal(minimal.caseId, "c-1");

  const full: CaseBillingPlanListInput = { caseId: "c-1", page: 1, limit: 20 };
  assert.equal(full.page, 1);
});

// ─── BillingPlan write inputs ──────────────────────────────────

void test("CaseBillingPlanCreateInput enforces P0 gate mode constraint", () => {
  const input: CaseBillingPlanCreateInput = {
    caseId: "c-1",
    milestoneName: "着手金",
    amountDue: 150000,
    gateEffectMode: "warn",
  };
  assert.equal(input.caseId, "c-1");
  assert.equal(input.gateEffectMode, "warn");

  const offMode: CaseBillingPlanCreateInput = {
    caseId: "c-1",
    amountDue: 0,
    gateEffectMode: "off",
  };
  assert.equal(offMode.gateEffectMode, "off");
});

void test("CaseBillingPlanUpdateInput allows partial updates", () => {
  const input: CaseBillingPlanUpdateInput = { amountDue: 180000 };
  assert.equal(input.amountDue, 180000);
  assert.equal(input.milestoneName, undefined);
});

void test("CaseBillingPlanTransitionInput covers valid transitions", () => {
  const transitions: {
    from: string;
    input: CaseBillingPlanTransitionInput;
  }[] = [
    { from: "due", input: { toStatus: "partial" } },
    { from: "due", input: { toStatus: "paid" } },
    { from: "due", input: { toStatus: "overdue" } },
    { from: "partial", input: { toStatus: "paid" } },
    { from: "overdue", input: { toStatus: "paid" } },
  ];
  assert.equal(transitions.length, 5);
});

// ─── PaymentRecord DTO ─────────────────────────────────────────

void test("CasePaymentRecordDto is constructable from a PaymentRecord entity with display names", () => {
  const entity: PaymentRecord = {
    id: "pr-1",
    orgId: "org-1",
    billingPlanId: "bp-1",
    caseId: "c-1",
    amountReceived: 150000,
    receivedAt: "2026-05-01T10:30:00Z",
    paymentMethod: "bank_transfer",
    recordStatus: "valid",
    receiptStorageType: null,
    receiptRelativePathOrKey: null,
    note: null,
    voidReasonCode: null,
    voidReasonNote: null,
    voidedBy: null,
    voidedAt: null,
    reversedFromPaymentRecordId: null,
    recordedBy: "u-1",
    createdAt: "2026-05-01T10:30:00Z",
  };

  const dto: CasePaymentRecordDto = {
    id: entity.id,
    billingPlanId: entity.billingPlanId,
    caseId: entity.caseId,
    amountReceived: entity.amountReceived,
    receivedAt: entity.receivedAt,
    paymentMethod: entity.paymentMethod,
    recordStatus: entity.recordStatus,
    receiptStorageType: entity.receiptStorageType,
    receiptRelativePathOrKey: entity.receiptRelativePathOrKey,
    note: entity.note,
    voidReasonCode: entity.voidReasonCode,
    voidReasonNote: entity.voidReasonNote,
    voidedBy: entity.voidedBy,
    voidedByDisplayName: null,
    voidedAt: entity.voidedAt,
    reversedFromPaymentRecordId: entity.reversedFromPaymentRecordId,
    recordedBy: entity.recordedBy,
    recordedByDisplayName: "田中太郎",
    createdAt: entity.createdAt,
  };

  assert.equal(dto.id, "pr-1");
  assert.equal(dto.recordedByDisplayName, "田中太郎");
  assert.equal(dto.voidedByDisplayName, null);
});

void test("CasePaymentRecordDto represents voided record", () => {
  const dto: CasePaymentRecordDto = {
    id: "pr-2",
    billingPlanId: "bp-1",
    caseId: "c-1",
    amountReceived: 50000,
    receivedAt: "2026-05-01T10:30:00Z",
    paymentMethod: "cash",
    recordStatus: "voided",
    receiptStorageType: null,
    receiptRelativePathOrKey: null,
    note: null,
    voidReasonCode: "duplicate_entry",
    voidReasonNote: "二重入金のため作廃",
    voidedBy: "u-mgr-1",
    voidedByDisplayName: "鈴木管理者",
    voidedAt: "2026-05-02T09:00:00Z",
    reversedFromPaymentRecordId: null,
    recordedBy: "u-1",
    recordedByDisplayName: "田中太郎",
    createdAt: "2026-05-01T10:30:00Z",
  };

  assert.equal(dto.recordStatus, "voided");
  assert.equal(dto.voidReasonCode, "duplicate_entry");
  assert.equal(dto.voidedByDisplayName, "鈴木管理者");
});

void test("CasePaymentRecordListResult wraps items and total", () => {
  const result: CasePaymentRecordListResult = { items: [], total: 0 };
  assert.equal(result.items.length, 0);
  assert.equal(result.total, 0);
});

void test("CasePaymentRecordListInput supports billingPlanId or caseId filter", () => {
  const byCaseId: CasePaymentRecordListInput = { caseId: "c-1" };
  assert.equal(byCaseId.caseId, "c-1");

  const byPlanId: CasePaymentRecordListInput = { billingPlanId: "bp-1" };
  assert.equal(byPlanId.billingPlanId, "bp-1");
});

// ─── PaymentRecord write inputs ────────────────────────────────

void test("CasePaymentRecordCreateInput with all fields", () => {
  const input: CasePaymentRecordCreateInput = {
    billingPlanId: "bp-1",
    amountReceived: 100000,
    receivedAt: "2026-05-01T10:30:00Z",
    paymentMethod: "bank_transfer",
    note: "5月分",
  };
  assert.equal(input.amountReceived, 100000);
});

void test("CasePaymentRecordVoidInput requires reasonCode", () => {
  const input: CasePaymentRecordVoidInput = {
    reasonCode: "duplicate_entry",
    reasonNote: "誤登録",
  };
  assert.equal(input.reasonCode, "duplicate_entry");
});

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
  };

  assert.equal(aggregate.summary.unpaidAmount, 0);
  assert.equal(aggregate.plans.length, 0);
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
    "case.billing_risk_acknowledged",
  ];
  assert.equal(actions.length, 6);
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
