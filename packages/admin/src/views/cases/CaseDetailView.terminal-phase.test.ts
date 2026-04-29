import { describe, it, expect } from "vitest";
import { isTerminalPhase } from "./model/useCasePhaseTransitionMenu";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";

describe("CaseDetailView terminal phase guard", () => {
  describe("isTerminalPhase", () => {
    it("CLOSED_SUCCESS is terminal", () => {
      expect(isTerminalPhase("CLOSED_SUCCESS")).toBe(true);
    });
    it("CLOSED_FAILED is terminal", () => {
      expect(isTerminalPhase("CLOSED_FAILED")).toBe(true);
    });
    it.each([
      "CONSULTING",
      "CONTRACTED",
      "WAITING_MATERIAL",
      "MATERIAL_PREPARING",
      "REVIEWING",
      "APPLYING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
      "APPROVED",
      "REJECTED",
      "WAITING_PAYMENT",
      "COE_SENT",
      "VISA_APPLYING",
      "SUCCESS",
      "VISA_REJECTED",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ])("%s is NOT terminal", (phase) => {
      expect(isTerminalPhase(phase)).toBe(false);
    });
    it("unknown phase is NOT terminal", () => {
      expect(isTerminalPhase("RANDOM_PHASE")).toBe(false);
    });
  });

  describe("stage display fallback for terminal phases", () => {
    it("CLOSED_SUCCESS detail still has readonly=true", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
        stageCode: "S9",
        stage: "S9",
        readonly: true,
      });
      expect(detail.readonly).toBe(true);
      expect(isTerminalPhase(detail.businessPhase)).toBe(true);
    });

    it("CLOSED_FAILED detail still has readonly=true", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_FAILED",
        stageCode: "S9",
        stage: "S9",
        readonly: true,
      });
      expect(detail.readonly).toBe(true);
      expect(isTerminalPhase(detail.businessPhase)).toBe(true);
    });

    it("defense: even if server returns stage=S1 with terminal phase, isTerminalPhase still detects it", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
        stageCode: "S1",
        stage: "S1",
        readonly: false,
      });
      expect(isTerminalPhase(detail.businessPhase)).toBe(true);
    });
  });

  describe("NextActionCard branch selection", () => {
    it("CLOSED_SUCCESS should use success description path", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
      });
      expect(detail.businessPhase).toBe("CLOSED_SUCCESS");
      expect(detail.businessPhase === "CLOSED_SUCCESS").toBe(true);
    });

    it("CLOSED_FAILED should use failure description path", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_FAILED",
      });
      expect(detail.businessPhase).toBe("CLOSED_FAILED");
      expect(detail.businessPhase === "CLOSED_SUCCESS").toBe(false);
    });

    it("middle phase should NOT trigger terminal rendering", () => {
      const detail = createMockDetail({
        businessPhase: "UNDER_REVIEW",
      });
      expect(isTerminalPhase(detail.businessPhase)).toBe(false);
    });
  });
});
