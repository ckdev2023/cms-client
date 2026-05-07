import { describe, expect, it } from "vitest";
import {
  buildLeadDedupParams,
  buildLeadListSearchParams,
} from "./LeadAdapterWriteBuilders";

describe("buildLeadListSearchParams — tags multi-value (R4-A-1)", () => {
  it("appends multiple tags= params for each tag", () => {
    const sp = buildLeadListSearchParams({
      scope: "mine",
      tags: ["VIP", "urgent"],
      page: 1,
      limit: 20,
    });
    expect(sp.getAll("tags")).toEqual(["VIP", "urgent"]);
  });
  it("omits tags param when array is empty", () => {
    const sp = buildLeadListSearchParams({
      scope: "mine",
      tags: [],
      page: 1,
      limit: 20,
    });
    expect(sp.has("tags")).toBe(false);
  });
  it("omits tags param when undefined", () => {
    const sp = buildLeadListSearchParams({
      scope: "mine",
      page: 1,
      limit: 20,
    });
    expect(sp.has("tags")).toBe(false);
  });
  it("trims whitespace from tag values", () => {
    expect(
      buildLeadListSearchParams({ tags: ["  VIP  ", "urgent"] }).getAll("tags"),
    ).toEqual(["VIP", "urgent"]);
  });
  it("skips empty-string tags after trim", () => {
    expect(
      buildLeadListSearchParams({ tags: ["VIP", "  ", ""] }).getAll("tags"),
    ).toEqual(["VIP"]);
  });
});

describe("buildLeadDedupParams — excludeLeadId (R-FLOW5-A-4)", () => {
  it("appends leadId param when provided", () => {
    const sp = buildLeadDedupParams({
      phone: "09055556666",
      email: "r-flow-04@example.com",
      leadId: "35ed6148-00de-48cf-8924-15c787554b75",
    });
    expect(sp.get("leadId")).toBe("35ed6148-00de-48cf-8924-15c787554b75");
  });

  it("omits leadId param when undefined", () => {
    const sp = buildLeadDedupParams({ phone: "09055556666" });
    expect(sp.has("leadId")).toBe(false);
  });

  it("omits leadId param when empty after trim", () => {
    const sp = buildLeadDedupParams({ phone: "09055556666", leadId: "   " });
    expect(sp.has("leadId")).toBe(false);
  });

  it("trims whitespace from leadId value", () => {
    const sp = buildLeadDedupParams({
      phone: "09055556666",
      leadId: "  abc-123  ",
    });
    expect(sp.get("leadId")).toBe("abc-123");
  });

  it("omits phone/email when undefined while keeping leadId", () => {
    const sp = buildLeadDedupParams({ leadId: "abc-123" });
    expect(sp.has("phone")).toBe(false);
    expect(sp.has("email")).toBe(false);
    expect(sp.get("leadId")).toBe("abc-123");
  });
});
