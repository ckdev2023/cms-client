import { describe, expect, it } from "vitest";
import {
  adaptCaseBillingData,
  buildCaseBillingTabAggregateUrl,
} from "./CaseAdapterValidationBilling";

function billingPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: "bp-001",
    milestoneName: "着手金",
    amountDue: 100000,
    paidAmount: 50000,
    status: "partial",
    dueDate: "2026-04-01",
    ...overrides,
  };
}

function paymentRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "pr-001",
    billingPlanId: "bp-001",
    amountReceived: 50000,
    receivedAt: "2026-04-10T10:00:00.000Z",
    recordStatus: "valid",
    milestoneName: "着手金",
    voidReasonCode: null,
    voidedByDisplayName: null,
    ...overrides,
  };
}

describe("adaptCaseBillingData — payments merge (§3.4)", () => {
  it("plans-only input still works (backward compat)", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
    })!;
    expect(result.payments).toHaveLength(1);
    expect(result.payments[0].kind).toBe("plan");
    expect(result.payments[0].billingPlanId).toBe("bp-001");
    expect(result.received).toBe("¥50,000");
  });

  it("merges plans and valid payments into unified rows", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: [paymentRecord()],
    })!;

    expect(result.payments).toHaveLength(2);
    const kinds = result.payments.map((r) => r.kind);
    expect(kinds).toContain("plan");
    expect(kinds).toContain("payment");
  });

  it("totalPaid from payments valid only — ignores plan.paidAmount", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ paidAmount: 999 })],
      payments: [paymentRecord({ amountReceived: 30000 })],
    })!;

    expect(result.received).toBe("¥30,000");
  });

  it("falls back to plan.paidAmount when no payments provided", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ paidAmount: 75000 })],
    })!;

    expect(result.received).toBe("¥75,000");
  });

  it("voided payment row has kind=voided, strikethrough=true, note", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: [
        paymentRecord({
          id: "pr-v",
          recordStatus: "voided",
          voidReasonCode: "duplicate",
          voidedByDisplayName: "管理者太郎",
        }),
      ],
    })!;

    const voided = result.payments.find((r) => r.kind === "voided");
    expect(voided).toBeDefined();
    expect(voided!.strikethrough).toBe(true);
    expect(voided!.type).toBe("作废入金");
    expect(voided!.note).toContain("duplicate");
    expect(voided!.note).toContain("管理者太郎");
  });

  it("reversed payment row has kind=reversed, strikethrough=true, operator in note (D10)", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: [
        paymentRecord({
          id: "pr-r",
          recordStatus: "reversed",
          voidReasonCode: "bank_error",
          voidedByDisplayName: "管理者次郎",
        }),
      ],
    })!;

    const reversed = result.payments.find((r) => r.kind === "reversed");
    expect(reversed).toBeDefined();
    expect(reversed!.strikethrough).toBe(true);
    expect(reversed!.type).toBe("冲正入金");
    expect(reversed!.note).toContain("bank_error");
    expect(reversed!.note).toContain("管理者次郎");
  });

  it("voided/reversed excluded from totalPaid sum", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ amountDue: 200000 })],
      payments: [
        paymentRecord({ amountReceived: 100000 }),
        paymentRecord({
          id: "pr-v",
          recordStatus: "voided",
          amountReceived: 50000,
        }),
        paymentRecord({
          id: "pr-r",
          recordStatus: "reversed",
          amountReceived: 30000,
        }),
      ],
    })!;

    expect(result.received).toBe("¥100,000");
    expect(result.outstanding).toBe("¥100,000");
  });

  it("rows sorted date desc, same date: payment before plan", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ dueDate: "2026-04-10" })],
      payments: [paymentRecord({ receivedAt: "2026-04-10T10:00:00.000Z" })],
    })!;

    expect(result.payments).toHaveLength(2);
    expect(result.payments[0].kind).toBe("payment");
    expect(result.payments[1].kind).toBe("plan");
  });

  it("earlier date comes after later date", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ dueDate: "2026-01-01" })],
      payments: [paymentRecord({ receivedAt: "2026-06-01T00:00:00.000Z" })],
    })!;

    expect(result.payments[0].date).toContain("2026");
    expect(result.payments[0].kind).toBe("payment");
    expect(result.payments[1].kind).toBe("plan");
  });

  it("empty payments array treated as no payments (fallback to paidAmount)", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan({ paidAmount: 60000 })],
      payments: [],
    })!;

    expect(result.received).toBe("¥60,000");
  });

  it("payments in { items } wrapper format accepted", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: { items: [paymentRecord()], total: 1 },
    })!;

    expect(result.payments).toHaveLength(2);
    const kinds = result.payments.map((r) => r.kind);
    expect(kinds).toContain("payment");
  });

  it("null/undefined payments treated as no payments", () => {
    const result1 = adaptCaseBillingData({
      plans: [billingPlan({ paidAmount: 40000 })],
      payments: null,
    })!;
    expect(result1.received).toBe("¥40,000");

    const result2 = adaptCaseBillingData({
      plans: [billingPlan({ paidAmount: 40000 })],
      payments: undefined,
    })!;
    expect(result2.received).toBe("¥40,000");
  });

  it("payment row milestoneName mapped from DTO", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: [paymentRecord({ milestoneName: "着手金" })],
    })!;

    const paymentRow = result.payments.find((r) => r.kind === "payment");
    expect(paymentRow!.milestoneName).toBe("着手金");
  });

  it("payment row uses billingPlanMilestoneName as fallback", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: [
        paymentRecord({
          milestoneName: null,
          billingPlanMilestoneName: "尾款",
        }),
      ],
    })!;

    const paymentRow = result.payments.find((r) => r.kind === "payment");
    expect(paymentRow!.milestoneName).toBe("尾款");
  });

  it("valid payment has status=paid, statusLabel=已結清", () => {
    const result = adaptCaseBillingData({
      plans: [billingPlan()],
      payments: [paymentRecord()],
    })!;

    const paymentRow = result.payments.find((r) => r.kind === "payment");
    expect(paymentRow!.status).toBe("paid");
    expect(paymentRow!.statusLabel).toBe("已結清");
  });

  it("plan rows always have kind=plan", () => {
    const result = adaptCaseBillingData({
      plans: [
        billingPlan({ status: "due" }),
        billingPlan({ id: "bp-002", status: "paid" }),
        billingPlan({ id: "bp-003", status: "overdue" }),
      ],
    })!;

    for (const row of result.payments) {
      expect(row.kind).toBe("plan");
    }
  });
});

describe("buildCaseBillingTabAggregateUrl", () => {
  it("builds correct URL", () => {
    expect(buildCaseBillingTabAggregateUrl("/api/cases", "case-001")).toBe(
      "/api/cases/case-001/billing-tab-aggregate",
    );
  });

  it("encodes special characters in caseId", () => {
    expect(
      buildCaseBillingTabAggregateUrl("/api/cases", "case/special&id"),
    ).toBe("/api/cases/case%2Fspecial%26id/billing-tab-aggregate");
  });
});
