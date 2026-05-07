import { describe, expect, it } from "vitest";
import { buildLeadListSearchParams } from "./LeadAdapterWriteBuilders";

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
