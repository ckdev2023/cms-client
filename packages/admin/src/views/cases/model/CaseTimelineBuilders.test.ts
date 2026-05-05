import { describe, it, expect } from "vitest";
import { buildCaseTimelineMessageResult } from "./CaseTimelineBuilders";

describe("CaseTimelineBuilders", () => {
  describe("case.transitioned", () => {
    it("returns caseTransitioned key with from/to/phase params", () => {
      const result = buildCaseTimelineMessageResult("case.transitioned", {
        from: "S3",
        to: "S5",
        businessPhase: "APPROVED",
      });
      expect(result.key).toBe("cases.log.timeline.caseTransitioned");
      expect(result.params).toEqual({
        from: "S3",
        to: "S5",
        phase: "APPROVED",
      });
    });

    it("handles snake_case payload keys", () => {
      const result = buildCaseTimelineMessageResult("case.transitioned", {
        fromStage: "S1",
        toStage: "S2",
        business_phase: "MATERIAL_PREPARING",
      });
      expect(result.params).toEqual({
        from: "S1",
        to: "S2",
        phase: "MATERIAL_PREPARING",
      });
    });

    it("defaults to empty strings when fields are missing", () => {
      const result = buildCaseTimelineMessageResult("case.transitioned", {});
      expect(result.params).toEqual({ from: "", to: "", phase: "" });
    });
  });

  describe("residence_period.created", () => {
    it("returns residencePeriodCreated key with kind suffix", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        { kind: "initial" },
      );
      expect(result.key).toBe("cases.log.timeline.residencePeriodCreated");
      expect(result.params).toEqual({ suffix: "initial" });
    });

    it("falls back to type field", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        { type: "renewal" },
      );
      expect(result.params).toEqual({ suffix: "renewal" });
    });

    it("defaults to empty string when no kind/type", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        {},
      );
      expect(result.params).toEqual({ suffix: "" });
    });
  });

  describe("existing builders remain stable", () => {
    it("case.stage_changed still returns stageChange key", () => {
      const result = buildCaseTimelineMessageResult("case.stage_changed", {
        from: "S1",
        to: "S2",
      });
      expect(result.key).toBe("cases.log.timeline.stageChange");
    });

    it("unregistered action falls back gracefully", () => {
      const result = buildCaseTimelineMessageResult("unknown.event", {});
      expect(result.params?.fallback).toBe("unknown.event");
    });
  });
});
