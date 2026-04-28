import assert from "node:assert/strict";
import test from "node:test";

import type { BillingPlan, PaymentRecord } from "../model/billingEntities";
import {
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

void test("CaseBillingPlanDto supports org-wide list extension fields", () => {
  const dto: CaseBillingPlanDto = {
    id: "bp-3",
    caseId: "c-1",
    milestoneName: "着手金",
    amountDue: 300000,
    dueDate: "2026-06-01",
    status: "due",
    gateEffectMode: "warn",
    remark: null,
    paidAmount: 0,
    unpaidAmount: 300000,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
    caseNo: "CASE-2026-001",
    caseName: "在留資格変更",
    customerName: "山田太郎",
    groupId: "grp-1",
    ownerUserId: "u-1",
    ownerDisplayName: "田中一郎",
  };

  assert.equal(dto.caseNo, "CASE-2026-001");
  assert.equal(dto.customerName, "山田太郎");
  assert.equal(dto.ownerDisplayName, "田中一郎");
});

void test("CaseBillingPlanDto extension fields default to undefined when not provided", () => {
  const dto: CaseBillingPlanDto = {
    id: "bp-4",
    caseId: "c-1",
    milestoneName: null,
    amountDue: 100000,
    dueDate: null,
    status: "due",
    gateEffectMode: "off",
    remark: null,
    paidAmount: 0,
    unpaidAmount: 100000,
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-04-01T00:00:00Z",
  };

  assert.equal(dto.caseNo, undefined);
  assert.equal(dto.ownerDisplayName, undefined);
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

void test("CaseBillingPlanCreateInput accepts off | warn | block gate mode (D9)", () => {
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

  const blockMode: CaseBillingPlanCreateInput = {
    caseId: "c-1",
    amountDue: 200000,
    gateEffectMode: "block",
  };
  assert.equal(blockMode.gateEffectMode, "block");
});

void test("CaseBillingPlanUpdateInput allows partial updates", () => {
  const input: CaseBillingPlanUpdateInput = { amountDue: 180000 };
  assert.equal(input.amountDue, 180000);
  assert.equal(input.milestoneName, undefined);
});

void test("CaseBillingPlanUpdateInput accepts block gate mode (D9)", () => {
  const input: CaseBillingPlanUpdateInput = { gateEffectMode: "block" };
  assert.equal(input.gateEffectMode, "block");
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

void test("CasePaymentRecordDto represents reversed record (D10: voided_* columns reused)", () => {
  const dto: CasePaymentRecordDto = {
    id: "pr-3",
    billingPlanId: "bp-1",
    caseId: "c-1",
    amountReceived: 100000,
    receivedAt: "2026-05-01T10:30:00Z",
    paymentMethod: "bank_transfer",
    recordStatus: "reversed",
    receiptStorageType: null,
    receiptRelativePathOrKey: null,
    note: null,
    voidReasonCode: "amount_error",
    voidReasonNote: "金額誤りのため冲正",
    voidedBy: "u-mgr-1",
    voidedByDisplayName: "鈴木管理者",
    voidedAt: "2026-05-03T11:00:00Z",
    reversedFromPaymentRecordId: null,
    recordedBy: "u-1",
    recordedByDisplayName: "田中太郎",
    createdAt: "2026-05-01T10:30:00Z",
  };

  assert.equal(dto.recordStatus, "reversed");
  assert.equal(
    dto.voidedByDisplayName,
    "鈴木管理者",
    "D10: voidedByDisplayName represents reverse operator when recordStatus=reversed",
  );
  assert.equal(dto.voidReasonCode, "amount_error");
});

void test("CasePaymentRecordDto supports org-wide list extension fields", () => {
  const dto: CasePaymentRecordDto = {
    id: "pr-4",
    billingPlanId: "bp-1",
    caseId: "c-1",
    amountReceived: 50000,
    receivedAt: "2026-05-01T10:30:00Z",
    paymentMethod: "cash",
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
    recordedBy: "u-1",
    recordedByDisplayName: "田中太郎",
    createdAt: "2026-05-01T10:30:00Z",
    caseNo: "CASE-2026-002",
    caseName: "経営管理ビザ",
    milestoneName: "着手金",
  };

  assert.equal(dto.caseNo, "CASE-2026-002");
  assert.equal(dto.milestoneName, "着手金");
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
