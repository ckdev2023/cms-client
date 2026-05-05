import { describe, it, expect } from "vitest";
import { buildCaseTimelineMessageResult } from "./CaseCommsTimelineBuilders";

describe("CaseCommsTimelineBuilders", () => {
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

    it("defaults to empty string when no kind/type", () => {
      const result = buildCaseTimelineMessageResult(
        "residence_period.created",
        {},
      );
      expect(result.params).toEqual({ suffix: "" });
    });
  });
});
