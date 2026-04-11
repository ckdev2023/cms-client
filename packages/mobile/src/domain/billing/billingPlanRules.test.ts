import type { BillingPlanStatus } from "./BillingPlan";
import {
  isValidBillingTransition,
  isBillingTerminal,
  evaluateBillingGate,
  computeBillingSummary,
} from "./billingPlanRules";

describe("billing plan status transitions", () => {
  const VALID: [BillingPlanStatus, BillingPlanStatus][] = [
    ["due", "partial"],
    ["due", "paid"],
    ["due", "overdue"],
    ["partial", "paid"],
    ["partial", "overdue"],
    ["overdue", "partial"],
    ["overdue", "paid"],
  ];

  it.each(VALID)("allows %s → %s", (from, to) => {
    expect(isValidBillingTransition(from, to)).toBe(true);
  });

  const INVALID: [BillingPlanStatus, BillingPlanStatus][] = [
    ["paid", "due"],
    ["paid", "partial"],
    ["paid", "overdue"],
    ["due", "due"],
    ["partial", "due"],
  ];

  it.each(INVALID)("blocks %s → %s", (from, to) => {
    expect(isValidBillingTransition(from, to)).toBe(false);
  });

  it("paid is terminal", () => {
    expect(isBillingTerminal("paid")).toBe(true);
    expect(isBillingTerminal("due")).toBe(false);
    expect(isBillingTerminal("overdue")).toBe(false);
  });
});

describe("billing gate evaluation (P0 warn mode)", () => {
  it("returns pass when gate mode is off", () => {
    const summary = {
      totalDue: 1000,
      totalReceived: 0,
      unpaidAmount: 1000,
      depositPaid: false,
      finalPaymentPaid: false,
    };
    expect(evaluateBillingGate(summary, "off")).toBe("pass");
  });

  it("returns pass when unpaid is 0 regardless of mode", () => {
    const summary = {
      totalDue: 1000,
      totalReceived: 1000,
      unpaidAmount: 0,
      depositPaid: true,
      finalPaymentPaid: true,
    };
    expect(evaluateBillingGate(summary, "warn")).toBe("pass");
  });

  it("returns warn when unpaid > 0 and mode is warn", () => {
    const summary = {
      totalDue: 1000,
      totalReceived: 500,
      unpaidAmount: 500,
      depositPaid: true,
      finalPaymentPaid: false,
    };
    expect(evaluateBillingGate(summary, "warn")).toBe("warn");
  });
});

describe("computeBillingSummary", () => {
  it("sums due and received amounts", () => {
    const plans = [
      { amountDue: 500, status: "due" as const, milestoneName: "签約" },
      { amountDue: 700, status: "due" as const, milestoneName: "結果後" },
    ];
    const payments = [
      { amountReceived: 500, recordStatus: "valid" as const },
      { amountReceived: 100, recordStatus: "voided" as const },
    ];

    const summary = computeBillingSummary(plans, payments);
    expect(summary.totalDue).toBe(1200);
    expect(summary.totalReceived).toBe(500);
    expect(summary.unpaidAmount).toBe(700);
  });

  it("marks deposit as paid when all deposit plans are paid", () => {
    const plans = [
      { amountDue: 500, status: "paid" as const, milestoneName: "签約" },
      { amountDue: 700, status: "due" as const, milestoneName: "結果後" },
    ];
    const summary = computeBillingSummary(plans, []);
    expect(summary.depositPaid).toBe(true);
    expect(summary.finalPaymentPaid).toBe(false);
  });

  it("marks final payment as paid when all final plans are paid", () => {
    const plans = [
      { amountDue: 500, status: "paid" as const, milestoneName: "签約" },
      { amountDue: 700, status: "paid" as const, milestoneName: "結果後" },
    ];
    const summary = computeBillingSummary(plans, []);
    expect(summary.depositPaid).toBe(true);
    expect(summary.finalPaymentPaid).toBe(true);
  });

  it("excludes voided and reversed payments from total received", () => {
    const plans = [
      { amountDue: 1000, status: "due" as const, milestoneName: null },
    ];
    const payments = [
      { amountReceived: 400, recordStatus: "valid" as const },
      { amountReceived: 200, recordStatus: "voided" as const },
      { amountReceived: 100, recordStatus: "reversed" as const },
    ];

    const summary = computeBillingSummary(plans, payments);
    expect(summary.totalReceived).toBe(400);
    expect(summary.unpaidAmount).toBe(600);
  });

  it("handles no plans or payments", () => {
    const summary = computeBillingSummary([], []);
    expect(summary.totalDue).toBe(0);
    expect(summary.totalReceived).toBe(0);
    expect(summary.unpaidAmount).toBe(0);
    expect(summary.depositPaid).toBe(false);
    expect(summary.finalPaymentPaid).toBe(false);
  });
});
