import { describe, expect, it } from "vitest";
import { adaptLeadDetailAggregate } from "./LeadAdapterMappers";

describe("adaptBasicInfo — source field priority (R3-D-2)", () => {
  const srcRaw = (o: Record<string, unknown>) => ({
    lead: { id: "LEAD-SRC", name: "Test", status: "new", ...o },
    followups: [],
    logs: [],
  });
  const detailSource = (o: Record<string, unknown>) =>
    adaptLeadDetailAggregate(srcRaw(o))?.detail.info;

  it("prefers sourceChannel over source/sourceLabel", () => {
    expect(
      detailSource({
        sourceChannel: "web",
        source: "admin",
        sourceLabel: "ウェブ",
      })?.source,
    ).toBe("web");
  });
  it("falls back to source when sourceChannel absent", () => {
    expect(
      detailSource({ source: "referral", sourceLabel: "介绍" })?.source,
    ).toBe("referral");
  });
  it("falls back to sourceLabel when both absent", () => {
    expect(detailSource({ sourceLabel: "ウェブ" })?.source).toBe("ウェブ");
  });
  it("maps createdVia from server source field", () => {
    expect(
      detailSource({ source: "admin", sourceChannel: "web" })?.createdVia,
    ).toBe("admin");
  });
  it("returns empty createdVia when source absent", () => {
    expect(detailSource({ sourceChannel: "web" })?.createdVia).toBe("");
  });
});
