import { describe, expect, it } from "vitest";

import { adaptBillingRiskAckStatus } from "./BillingAdapters";

describe("adaptBillingRiskAckStatus", () => {
  it("maps acknowledged state", () => {
    expect(
      adaptBillingRiskAckStatus({
        acknowledged: true,
        acknowledgedAt: "2026-04-01T00:00:00Z",
        acknowledgedByDisplayName: "Manager",
        reasonCode: "customer_promise",
        reasonNote: "一周内补缴",
        evidenceUrl: "https://example.com/evidence",
      }),
    ).toEqual({
      acknowledged: true,
      acknowledgedAt: "2026-04-01T00:00:00Z",
      acknowledgedByDisplayName: "Manager",
      reasonCode: "customer_promise",
      reasonNote: "一周内补缴",
      evidenceUrl: "https://example.com/evidence",
    });
  });

  it("maps unacknowledged state with nulls", () => {
    const s = adaptBillingRiskAckStatus({
      acknowledged: false,
      acknowledgedAt: null,
    });
    expect(s!.acknowledged).toBe(false);
    expect(s!.acknowledgedAt).toBeNull();
  });

  it("returns null for non-object", () => {
    expect(adaptBillingRiskAckStatus(null)).toBeNull();
  });
});
