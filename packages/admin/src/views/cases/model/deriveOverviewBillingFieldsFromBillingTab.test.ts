import { describe, expect, it } from "vitest";
import { deriveOverviewBillingFieldsFromBillingTab } from "./deriveOverviewBillingFieldsFromBillingTab";

describe("deriveOverviewBillingFieldsFromBillingTab", () => {
  it("uses billing.total when present", () => {
    expect(
      deriveOverviewBillingFieldsFromBillingTab({
        total: "¥150,000",
        received: "¥150,000",
        outstanding: "¥0",
        payments: [],
      }),
    ).toEqual({
      billingAmount: "¥150,000",
      billingMeta: "",
      billingMetaKey: "",
      billingMetaParams: undefined,
      billingStatusKey: "paid",
    });
  });

  it("falls back to received when total is dash but fully paid", () => {
    expect(
      deriveOverviewBillingFieldsFromBillingTab({
        total: "—",
        received: "¥150,000",
        outstanding: "¥0",
        payments: [],
      }),
    ).toEqual({
      billingAmount: "¥150,000",
      billingMeta: "",
      billingMetaKey: "",
      billingMetaParams: undefined,
      billingStatusKey: "paid",
    });
  });

  it("maps outstanding to unpaid meta", () => {
    expect(
      deriveOverviewBillingFieldsFromBillingTab({
        total: "¥200,000",
        received: "¥50,000",
        outstanding: "¥150,000",
        payments: [],
      }),
    ).toEqual({
      billingAmount: "¥200,000",
      billingMeta: "¥150,000",
      billingMetaKey: "cases.detail.unpaidLabel",
      billingMetaParams: { amount: "¥150,000" },
      billingStatusKey: "unpaid",
    });
  });
});
