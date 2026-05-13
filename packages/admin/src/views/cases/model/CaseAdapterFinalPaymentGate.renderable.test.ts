import { describe, expect, it } from "vitest";
import { isRenderableFinalPaymentGate } from "./CaseAdapterFinalPaymentGate";

describe("isRenderableFinalPaymentGate", () => {
  it("returns false for null/undefined", () => {
    expect(isRenderableFinalPaymentGate(null)).toBe(false);
    expect(isRenderableFinalPaymentGate(undefined)).toBe(false);
  });

  it("returns false for empty object", () => {
    expect(isRenderableFinalPaymentGate({} as never)).toBe(false);
  });

  it("returns false when blockers missing", () => {
    expect(
      isRenderableFinalPaymentGate({
        paymentCleared: false,
        finalPaymentMilestoneMatched: true,
        outstandingLabel: "",
        canAdvanceToCoe: false,
      } as never),
    ).toBe(false);
  });

  it("returns true for normalized gate from builder shape", () => {
    expect(
      isRenderableFinalPaymentGate({
        paymentCleared: false,
        finalPaymentMilestoneMatched: true,
        outstandingLabel: "¥1",
        canAdvanceToCoe: false,
        blockers: [{ code: "final_payment_outstanding", label: "x" }],
      }),
    ).toBe(true);
  });
});
