import { describe, expect, it } from "vitest";
import type { LocationQuery } from "vue-router";
import { resumeConvertDeepLinkOutcome } from "./leadResumeConvertCaseGate";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";

function sampleLead(key: keyof typeof LEAD_DETAIL_SAMPLES) {
  return LEAD_DETAIL_SAMPLES[key];
}

describe("leadResumeConvertCaseGate", () => {
  it("opens case dialog when signed but no case yet", () => {
    const lead = sampleLead("signed");
    expect(lead.conversion.convertedCase).toBeNull();
    const q: LocationQuery = { tab: "conversion", resumeConvert: "1" };
    expect(resumeConvertDeepLinkOutcome(lead, q)).toBe("open_case_dialog");
  });

  it("strip_only when converted_case already exists (no dialog)", () => {
    const lead = sampleLead("converted-case");
    expect(lead.conversion.convertedCase).not.toBeNull();
    const q: LocationQuery = { tab: "conversion", resumeConvert: "1" };
    expect(resumeConvertDeepLinkOutcome(lead, q)).toBe("strip_only");
  });

  it("ignore without resumeConvert", () => {
    const lead = sampleLead("signed");
    expect(resumeConvertDeepLinkOutcome(lead, { tab: "conversion" })).toBe(
      "ignore",
    );
  });

  it("ignore when tab is not conversion (do not strip resumeConvert)", () => {
    const lead = sampleLead("converted-case");
    expect(
      resumeConvertDeepLinkOutcome(lead, {
        tab: "info",
        resumeConvert: "1",
      }),
    ).toBe("ignore");
  });

  it("ignore when lead not loaded", () => {
    const q: LocationQuery = { tab: "conversion", resumeConvert: "1" };
    expect(resumeConvertDeepLinkOutcome(undefined, q)).toBe("ignore");
  });
});
