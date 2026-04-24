// ── Test Ownership ──────────────────────────────────────────────
// Owner: write request-body builders — non-CRUD action family
//   (buildTransitionPayload, buildBillingRiskAckPayload,
//   buildPostApprovalPayload).
// Does NOT test: create / update builders (split into sibling test files),
//   serialization rule aggregates (→ serialization.test), response
//   mapping, URL construction, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  buildBillingRiskAckPayload,
  buildPostApprovalPayload,
  buildTransitionPayload,
} from "./CaseAdapterWriteBuilders";

// ─── buildTransitionPayload (p0-fe-002d-03) ─────────────────────

describe("buildTransitionPayload", () => {
  it("includes toStage and closeReason", () => {
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: "completed",
    });
    expect(payload).toEqual({ toStage: "S9", closeReason: "completed" });
  });

  it("omits closeReason when undefined", () => {
    const payload = buildTransitionPayload({ toStage: "S4" });
    expect(payload).toEqual({ toStage: "S4" });
    expect(payload).not.toHaveProperty("closeReason");
  });

  it("preserves null closeReason", () => {
    const payload = buildTransitionPayload({
      toStage: "S5",
      closeReason: null,
    });
    expect(payload.closeReason).toBeNull();
  });

  it("normalizes empty-string closeReason to null", () => {
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: "",
    });
    expect(payload.closeReason).toBeNull();
  });

  it("trims closeReason whitespace", () => {
    const payload = buildTransitionPayload({
      toStage: "S9",
      closeReason: "  success  ",
    });
    expect(payload.closeReason).toBe("success");
  });
});

// ─── buildBillingRiskAckPayload (p0-fe-002d-03) ─────────────────

describe("buildBillingRiskAckPayload", () => {
  it("includes all provided fields", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "client_confirmed",
      reasonNote: "phone call",
      evidenceUrl: "https://example.com/evidence.pdf",
    });
    expect(payload).toEqual({
      reasonCode: "client_confirmed",
      reasonNote: "phone call",
      evidenceUrl: "https://example.com/evidence.pdf",
    });
  });

  it("omits optional fields when undefined", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "client_confirmed",
    });
    expect(payload).toEqual({ reasonCode: "client_confirmed" });
    expect(payload).not.toHaveProperty("reasonNote");
    expect(payload).not.toHaveProperty("evidenceUrl");
  });

  it("omits empty-string optional fields", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "client_confirmed",
      reasonNote: "",
      evidenceUrl: "",
    });
    expect(payload).toEqual({ reasonCode: "client_confirmed" });
    expect(payload).not.toHaveProperty("reasonNote");
    expect(payload).not.toHaveProperty("evidenceUrl");
  });

  it("trims optional field whitespace", () => {
    const payload = buildBillingRiskAckPayload({
      reasonCode: "promise",
      reasonNote: "  phone call  ",
      evidenceUrl: " https://example.com ",
    });
    expect(payload.reasonNote).toBe("phone call");
    expect(payload.evidenceUrl).toBe("https://example.com");
  });
});

// ─── buildPostApprovalPayload (p0-fe-002d-03) ───────────────────

describe("buildPostApprovalPayload", () => {
  it("includes stage", () => {
    const payload = buildPostApprovalPayload({ stage: "entry_success" });
    expect(payload).toEqual({ stage: "entry_success" });
  });

  it("sends all valid post-approval stages", () => {
    for (const stage of [
      "waiting_final_payment",
      "coe_sent",
      "overseas_visa_applying",
      "entry_success",
    ]) {
      const payload = buildPostApprovalPayload({ stage });
      expect(payload).toEqual({ stage });
    }
  });
});
