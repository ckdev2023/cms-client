import { describe, expect, it } from "vitest";
import { BUSINESS_PHASES } from "../constantsBusinessPhase";
import { nextActionsForPhase } from "./CaseAdapterPhaseActions";

describe("nextActionsForPhase", () => {
  it("WAITING_PAYMENT → billing + deadlines", () => {
    const result = nextActionsForPhase("WAITING_PAYMENT");
    expect(result.primary.tab).toBe("billing");
    expect(result.primary.label).toBe("cases.coach.registerFinalPayment");
    expect(result.secondary.tab).toBe("deadlines");
    expect(result.secondary.label).toBe("cases.coach.sendCollectionReminder");
  });

  it("COE_SENT → messages + deadlines", () => {
    const result = nextActionsForPhase("COE_SENT");
    expect(result.primary.tab).toBe("messages");
    expect(result.secondary.tab).toBe("deadlines");
  });

  it("VISA_APPLYING → messages + deadlines", () => {
    const result = nextActionsForPhase("VISA_APPLYING");
    expect(result.primary.tab).toBe("messages");
    expect(result.secondary.tab).toBe("deadlines");
  });

  it("UNDER_REVIEW → messages + deadlines", () => {
    const result = nextActionsForPhase("UNDER_REVIEW");
    expect(result.primary.tab).toBe("messages");
    expect(result.secondary.tab).toBe("deadlines");
  });

  it("CONTRACTED → documents + tasks", () => {
    const result = nextActionsForPhase("CONTRACTED");
    expect(result.primary.tab).toBe("documents");
    expect(result.secondary.tab).toBe("tasks");
  });

  it("APPROVED → billing + documents", () => {
    const result = nextActionsForPhase("APPROVED");
    expect(result.primary.tab).toBe("billing");
    expect(result.secondary.tab).toBe("documents");
  });

  it("CLOSED_SUCCESS → log + billing", () => {
    const result = nextActionsForPhase("CLOSED_SUCCESS");
    expect(result.primary.tab).toBe("log");
    expect(result.secondary.tab).toBe("billing");
  });

  it("CLOSED_FAILED → log + billing", () => {
    const result = nextActionsForPhase("CLOSED_FAILED");
    expect(result.primary.tab).toBe("log");
    expect(result.secondary.tab).toBe("billing");
  });

  it("unknown phase falls back to documents + validation", () => {
    const result = nextActionsForPhase("NONEXISTENT_PHASE");
    expect(result.primary).toEqual({
      label: "cases.coach.docManagement",
      tab: "documents",
    });
    expect(result.secondary).toEqual({
      label: "cases.coach.runValidation",
      tab: "validation",
    });
  });

  it("every known BusinessPhaseId returns a valid result", () => {
    for (const phase of BUSINESS_PHASES) {
      const result = nextActionsForPhase(phase);
      expect(result.primary.label).toBeTruthy();
      expect(result.primary.tab).toBeTruthy();
      expect(result.secondary.label).toBeTruthy();
      expect(result.secondary.tab).toBeTruthy();
    }
  });

  it("stageId parameter is accepted without error", () => {
    const result = nextActionsForPhase("WAITING_PAYMENT", "S6");
    expect(result.primary.tab).toBe("billing");
  });

  it("returns independent copies (no shared references)", () => {
    const a = nextActionsForPhase("WAITING_PAYMENT");
    const b = nextActionsForPhase("WAITING_PAYMENT");
    expect(a).not.toBe(b);
    expect(a.primary).not.toBe(b.primary);
  });
});
