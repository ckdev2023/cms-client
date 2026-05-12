import { describe, expect, it } from "vitest";

import {
  adaptBillingListResult,
  adaptBillingMutationResult,
  adaptBillingPlanNode,
  adaptBillingPlanNodes,
  adaptBillingSummary,
  adaptCaseBillingRow,
  adaptCollectionResult,
  adaptPaymentLogEntry,
  adaptPaymentLogResult,
} from "./BillingAdapters";

// ─── adaptCaseBillingRow ────────────────────────────────────────

describe("adaptCaseBillingRow", () => {
  const fullDto = {
    id: "bp-1",
    caseId: "case-1",
    milestoneName: "着手金",
    amountDue: 500000,
    dueDate: "2026-04-01",
    status: "partial",
    gateEffectMode: "off",
    remark: null,
    paidAmount: 200000,
    unpaidAmount: 300000,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-15T00:00:00Z",
    caseNo: "CAS-001",
    caseName: "テスト案件",
    customerName: "Global Corp",
    groupId: "tokyo-1",
    ownerUserId: "user-1",
    ownerDisplayName: "Suzuki",
  };

  it("maps paidAmount→amountReceived, unpaidAmount→amountOutstanding", () => {
    const row = adaptCaseBillingRow(fullDto);
    expect(row).not.toBeNull();
    expect(row!.caseId).toBe("case-1");
    expect(row!.amountReceived).toBe(200000);
    expect(row!.amountOutstanding).toBe(300000);
    expect(row!.amountDue).toBe(500000);
    expect(row!.billingRiskAcknowledged).toBe(false);
    expect(row!.billingRiskAcknowledgedAt).toBeNull();
    expect(row!.billingRiskAcknowledgedByDisplayName).toBeNull();
  });

  it("maps billingRiskAcknowledged fields when present", () => {
    const row = adaptCaseBillingRow({
      ...fullDto,
      billingRiskAcknowledged: true,
      billingRiskAcknowledgedAt: "2026-04-20T10:00:00Z",
      billingRiskAcknowledgedByDisplayName: "Admin",
    });
    expect(row).not.toBeNull();
    expect(row!.billingRiskAcknowledged).toBe(true);
    expect(row!.billingRiskAcknowledgedAt).toBe("2026-04-20T10:00:00Z");
    expect(row!.billingRiskAcknowledgedByDisplayName).toBe("Admin");
  });

  it("handles fully paid plan (paid=amountDue, unpaid=0)", () => {
    const row = adaptCaseBillingRow({
      ...fullDto,
      status: "paid",
      paidAmount: 500000,
      unpaidAmount: 0,
    });
    expect(row!.amountReceived).toBe(500000);
    expect(row!.amountOutstanding).toBe(0);
    expect(row!.status).toBe("paid");
  });

  it("handles zero-paid plan (paid=0, unpaid=amountDue)", () => {
    const row = adaptCaseBillingRow({
      ...fullDto,
      status: "due",
      paidAmount: 0,
      unpaidAmount: 500000,
    });
    expect(row!.amountReceived).toBe(0);
    expect(row!.amountOutstanding).toBe(500000);
  });

  it("falls back displayName fields to '—' when null", () => {
    const row = adaptCaseBillingRow({
      ...fullDto,
      caseName: null,
      caseNo: null,
      customerName: null,
      ownerDisplayName: null,
    });
    expect(row!.caseName).toBe("—");
    expect(row!.caseNo).toBe("—");
    expect(row!.client.name).toBe("—");
    expect(row!.owner).toBe("—");
  });

  it("falls back displayName fields to '—' when missing entirely", () => {
    const row = adaptCaseBillingRow({
      id: "bp-min",
      caseId: "case-min",
      amountDue: 100,
      paidAmount: 0,
      unpaidAmount: 100,
      status: "due",
    });
    expect(row!.caseName).toBe("—");
    expect(row!.caseNo).toBe("—");
    expect(row!.client.name).toBe("—");
    expect(row!.owner).toBe("—");
    expect(row!.caseId).toBe("case-min");
  });

  it("maps snake_case case_id to caseId", () => {
    const { caseId, ...rest } = fullDto;
    const row = adaptCaseBillingRow({
      ...rest,
      case_id: "case-from-snake",
    });
    expect(row!.caseId).not.toBe(caseId);
    expect(row!.caseId).toBe("case-from-snake");
  });

  it("does not use billing plan id as case id when case id fields are absent", () => {
    const row = adaptCaseBillingRow({
      id: "bp-only",
      amountDue: 100,
      paidAmount: 0,
      unpaidAmount: 100,
      status: "due",
    });
    expect(row!.caseId).toBe("");
  });

  it("produces nextNode for non-paid plans with milestoneName", () => {
    const row = adaptCaseBillingRow(fullDto);
    expect(row!.nextNode).not.toBeNull();
    expect(row!.nextNode!.name).toBe("着手金");
  });

  it("produces null nextNode for paid plans", () => {
    expect(
      adaptCaseBillingRow({ ...fullDto, status: "paid" })!.nextNode,
    ).toBeNull();
  });

  it("produces null nextNode when milestoneName is null", () => {
    expect(
      adaptCaseBillingRow({ ...fullDto, milestoneName: null })!.nextNode,
    ).toBeNull();
  });

  it("returns null for non-object/missing id", () => {
    expect(adaptCaseBillingRow(null)).toBeNull();
    expect(adaptCaseBillingRow("string")).toBeNull();
    expect(adaptCaseBillingRow([])).toBeNull();
    expect(adaptCaseBillingRow({ amountDue: 100 })).toBeNull();
  });
});

// ─── adaptPaymentLogEntry ───────────────────────────────────────

describe("adaptPaymentLogEntry", () => {
  const validDto = {
    id: "pr-1",
    billingPlanId: "bp-1",
    caseId: "case-1",
    amountReceived: 175000,
    receivedAt: "2026-04-01T10:00:00Z",
    paymentMethod: "bank_transfer",
    recordStatus: "valid",
    receiptStorageType: "s3",
    receiptRelativePathOrKey: "receipts/pr-1.pdf",
    note: "Initial deposit",
    voidReasonCode: null,
    voidReasonNote: null,
    voidedBy: null,
    voidedByDisplayName: null,
    voidedAt: null,
    reversedFromPaymentRecordId: null,
    recordedBy: "user-1",
    recordedByDisplayName: "Admin",
    createdAt: "2026-04-01T10:00:00Z",
    caseNo: "CAS-001",
    caseName: "テスト案件",
    milestoneName: "着手金",
  };

  it("maps valid record: operator = recordedByDisplayName", () => {
    const entry = adaptPaymentLogEntry(validDto);
    expect(entry!.operator).toBe("Admin");
    expect(entry!.recordStatus).toBe("valid");
    expect(entry!.amount).toBe(175000);
    expect(entry!.receipt).toBe(true);
    expect(entry!.voidedByDisplayName).toBeUndefined();
    expect(entry!.reasonCode).toBeUndefined();
  });

  it("maps voided record: operator = voidedByDisplayName", () => {
    const entry = adaptPaymentLogEntry({
      ...validDto,
      recordStatus: "voided",
      voidedByDisplayName: "Manager",
      voidReasonCode: "manual_void",
    });
    expect(entry!.operator).toBe("Manager");
    expect(entry!.recordStatus).toBe("voided");
    expect(entry!.voidedByDisplayName).toBe("Manager");
    expect(entry!.reasonCode).toBe("manual_void");
  });

  it("maps reversed record: operator = voidedByDisplayName (D10 reuse)", () => {
    const entry = adaptPaymentLogEntry({
      ...validDto,
      recordStatus: "reversed",
      voidedByDisplayName: "ReverseManager",
      voidReasonCode: "manual_reverse",
    });
    expect(entry!.operator).toBe("ReverseManager");
    expect(entry!.recordStatus).toBe("reversed");
    expect(entry!.voidedByDisplayName).toBe("ReverseManager");
    expect(entry!.reasonCode).toBe("manual_reverse");
  });

  it("falls back recordedByDisplayName to '—' (valid)", () => {
    const entry = adaptPaymentLogEntry({
      ...validDto,
      recordedByDisplayName: null,
    });
    expect(entry!.operator).toBe("—");
  });

  it("falls back voidedByDisplayName to '—' (voided)", () => {
    const entry = adaptPaymentLogEntry({
      ...validDto,
      recordStatus: "voided",
      voidedByDisplayName: null,
    });
    expect(entry!.operator).toBe("—");
  });

  it("falls back voidedByDisplayName to '—' (reversed — D10 mute)", () => {
    const entry = adaptPaymentLogEntry({
      ...validDto,
      recordStatus: "reversed",
      voidedByDisplayName: null,
    });
    expect(entry!.operator).toBe("—");
  });

  it("falls back caseNo/caseName/milestoneName to '—'", () => {
    const entry = adaptPaymentLogEntry({
      id: "pr-min",
      amountReceived: 1000,
      receivedAt: "2026-01-01",
      recordStatus: "valid",
      recordedByDisplayName: "Op",
    });
    expect(entry!.caseNo).toBe("—");
    expect(entry!.caseName).toBe("—");
    expect(entry!.node).toBe("—");
  });

  it("receipt=false when receiptStorageType is null", () => {
    const entry = adaptPaymentLogEntry({
      ...validDto,
      receiptStorageType: null,
      receiptRelativePathOrKey: null,
    });
    expect(entry!.receipt).toBe(false);
  });

  it("note falls back to empty string", () => {
    expect(adaptPaymentLogEntry({ ...validDto, note: null })!.note).toBe("");
  });

  it("returns null for non-object/missing id", () => {
    expect(adaptPaymentLogEntry(null)).toBeNull();
    expect(adaptPaymentLogEntry({ amountReceived: 100 })).toBeNull();
  });
});

// ─── adaptBillingSummary ────────────────────────────────────────

describe("adaptBillingSummary", () => {
  it("maps all four summary fields", () => {
    expect(
      adaptBillingSummary({
        totalDue: 1000000,
        totalReceived: 400000,
        totalOutstanding: 600000,
        overdueAmount: 200000,
      }),
    ).toEqual({
      totalDue: 1000000,
      totalReceived: 400000,
      totalOutstanding: 600000,
      overdueAmount: 200000,
    });
  });

  it("defaults missing numeric fields to 0", () => {
    expect(adaptBillingSummary({})).toEqual({
      totalDue: 0,
      totalReceived: 0,
      totalOutstanding: 0,
      overdueAmount: 0,
    });
  });

  it("returns null for non-object", () => {
    expect(adaptBillingSummary(null)).toBeNull();
    expect(adaptBillingSummary([])).toBeNull();
  });
});

// ─── adaptCollectionResult ──────────────────────────────────────

describe("adaptCollectionResult", () => {
  it("maps counts and details", () => {
    const result = adaptCollectionResult({
      success: 3,
      skipped: 1,
      failed: 0,
      details: [
        { caseNo: "CAS-001", result: "success", taskId: "t-1" },
        { caseNo: "CAS-002", result: "skipped", reason: "not-overdue" },
      ],
    });
    expect(result!.success).toBe(3);
    expect(result!.details).toHaveLength(2);
    expect(result!.details[0].taskId).toBe("t-1");
    expect(result!.details[1].reason).toBe("not-overdue");
  });

  it("handles empty details", () => {
    const r = adaptCollectionResult({
      success: 0,
      skipped: 0,
      failed: 0,
      details: [],
    });
    expect(r!.details).toEqual([]);
  });

  it("returns null for non-object", () => {
    expect(adaptCollectionResult(null)).toBeNull();
  });
});

// ─── adaptBillingPlanNode ───────────────────────────────────────

describe("adaptBillingPlanNode", () => {
  it("maps billing plan DTO to node", () => {
    expect(
      adaptBillingPlanNode({
        id: "bp-1",
        milestoneName: "着手金",
        amountDue: 350000,
        dueDate: "2026-04-01",
        status: "partial",
      }),
    ).toEqual({
      id: "bp-1",
      name: "着手金",
      amount: 350000,
      dueDate: "2026-04-01",
      status: "partial",
    });
  });

  it("falls back name to '—' when milestoneName is null", () => {
    expect(
      adaptBillingPlanNode({
        id: "bp-2",
        milestoneName: null,
        amountDue: 100,
        status: "due",
      })!.name,
    ).toBe("—");
  });

  it("returns null when id is missing", () => {
    expect(adaptBillingPlanNode({ amountDue: 100 })).toBeNull();
  });
});

// ─── List result adapters ───────────────────────────────────────

describe("adaptBillingListResult", () => {
  it("adapts items and total", () => {
    const r = adaptBillingListResult({
      items: [
        {
          id: "bp-1",
          amountDue: 100,
          paidAmount: 50,
          unpaidAmount: 50,
          status: "partial",
        },
      ],
      total: 1,
    });
    expect(r!.items).toHaveLength(1);
    expect(r!.items[0].amountReceived).toBe(50);
    expect(r!.total).toBe(1);
  });

  it("filters out invalid items", () => {
    const r = adaptBillingListResult({
      items: [
        { id: "bp-1", amountDue: 100, paidAmount: 0, unpaidAmount: 100 },
        null,
        42,
      ],
      total: 3,
    });
    expect(r!.items).toHaveLength(1);
  });

  it("returns null when items is missing", () => {
    expect(adaptBillingListResult({ total: 0 })).toBeNull();
  });
});

describe("adaptPaymentLogResult", () => {
  it("adapts items, entries alias, and total", () => {
    const r = adaptPaymentLogResult({
      items: [
        {
          id: "pr-1",
          amountReceived: 100,
          receivedAt: "2026-01-01",
          recordStatus: "valid",
          recordedByDisplayName: "Op",
        },
      ],
      total: 1,
    });
    expect(r!.items).toHaveLength(1);
    expect(r!.entries).toHaveLength(1);
    expect(r!.entries).toBe(r!.items);
    expect(r!.total).toBe(1);
  });

  it("returns null for non-object", () => {
    expect(adaptPaymentLogResult(null)).toBeNull();
  });
});

describe("adaptBillingPlanNodes", () => {
  it("extracts nodes from list response", () => {
    const nodes = adaptBillingPlanNodes({
      items: [
        { id: "bp-1", milestoneName: "着手金", amountDue: 100, status: "due" },
        { id: "bp-2", milestoneName: "尾款", amountDue: 200, status: "due" },
      ],
      total: 2,
    });
    expect(nodes).toHaveLength(2);
    expect(nodes![0].name).toBe("着手金");
  });
});

describe("adaptBillingMutationResult", () => {
  it("extracts id", () => {
    expect(adaptBillingMutationResult({ id: "pr-1" })).toEqual({ id: "pr-1" });
  });

  it("returns null when id missing or non-object", () => {
    expect(adaptBillingMutationResult({})).toBeNull();
    expect(adaptBillingMutationResult(null)).toBeNull();
  });
});
