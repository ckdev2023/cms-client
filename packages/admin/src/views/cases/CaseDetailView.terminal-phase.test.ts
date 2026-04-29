import { describe, it, expect } from "vitest";
import { computed, ref } from "vue";
import { isTerminalPhase } from "./model/useCasePhaseTransitionMenu";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";
import type { CaseDetail } from "./types";

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

  describe("isTerminalPhase computed (hook-level)", () => {
    function buildIsTerminalComputed(detail: CaseDetail) {
      const detailRef = ref<CaseDetail | null>(detail);
      return computed(() =>
        isTerminalPhase(detailRef.value?.businessPhase ?? ""),
      );
    }

    it("returns true for CLOSED_SUCCESS detail", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
        stage: "S9",
        stageCode: "S9",
      });
      const isTerminal = buildIsTerminalComputed(detail);
      expect(isTerminal.value).toBe(true);
    });

    it("returns true for CLOSED_FAILED detail", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_FAILED",
        stage: "S9",
        stageCode: "S9",
      });
      const isTerminal = buildIsTerminalComputed(detail);
      expect(isTerminal.value).toBe(true);
    });

    it("returns false for UNDER_REVIEW detail", () => {
      const detail = createMockDetail({ businessPhase: "UNDER_REVIEW" });
      const isTerminal = buildIsTerminalComputed(detail);
      expect(isTerminal.value).toBe(false);
    });

    it("returns false when detail is null", () => {
      const detailRef = ref<CaseDetail | null>(null);
      const isTerminal = computed(() =>
        isTerminalPhase(detailRef.value?.businessPhase ?? ""),
      );
      expect(isTerminal.value).toBe(false);
    });
  });

  describe("terminal i18n key derivation", () => {
    function deriveTerminalNextActionKey(businessPhase: string): string {
      return `cases.detail.terminalNextAction.${businessPhase === "CLOSED_SUCCESS" ? "success" : "failed"}`;
    }

    it("CLOSED_SUCCESS derives success key", () => {
      expect(deriveTerminalNextActionKey("CLOSED_SUCCESS")).toBe(
        "cases.detail.terminalNextAction.success",
      );
    });

    it("CLOSED_FAILED derives failed key", () => {
      expect(deriveTerminalNextActionKey("CLOSED_FAILED")).toBe(
        "cases.detail.terminalNextAction.failed",
      );
    });

    it("stage card shows S9 and terminal label key for CLOSED_SUCCESS", () => {
      const detail = createMockDetail({
        businessPhase: "CLOSED_SUCCESS",
        stage: "S1",
        stageCode: "S1",
      });
      const isTerminal = isTerminalPhase(detail.businessPhase);
      const displayStage = isTerminal ? "S9" : detail.stage;
      const metaKey = isTerminal ? "cases.detail.terminalStage.label" : null;
      expect(displayStage).toBe("S9");
      expect(metaKey).toBe("cases.detail.terminalStage.label");
    });

    it("stage card shows original stage for non-terminal phase", () => {
      const detail = createMockDetail({
        businessPhase: "UNDER_REVIEW",
        stage: "S3",
        stageCode: "S3",
      });
      const isTerminal = isTerminalPhase(detail.businessPhase);
      const displayStage = isTerminal ? "S9" : detail.stage;
      expect(displayStage).toBe("S3");
    });
  });
});
