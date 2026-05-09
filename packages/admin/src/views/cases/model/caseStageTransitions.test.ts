import { describe, it, expect } from "vitest";
import { CASE_STAGE_FORWARD_NEXT } from "./caseStageTransitions";

describe("CASE_STAGE_FORWARD_NEXT", () => {
  it("contains exactly S1–S5 forward edges", () => {
    expect(Object.keys(CASE_STAGE_FORWARD_NEXT).sort()).toEqual([
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
    ]);
  });

  it.each([
    ["S1", "S2"],
    ["S2", "S3"],
    ["S3", "S4"],
    ["S4", "S5"],
    ["S5", "S6"],
  ] as const)("%s → %s", (from, to) => {
    expect(CASE_STAGE_FORWARD_NEXT[from]).toBe(to);
  });

  it("does not include S6+ (post-submit stages)", () => {
    expect(CASE_STAGE_FORWARD_NEXT).not.toHaveProperty("S6");
    expect(CASE_STAGE_FORWARD_NEXT).not.toHaveProperty("S7");
    expect(CASE_STAGE_FORWARD_NEXT).not.toHaveProperty("S8");
    expect(CASE_STAGE_FORWARD_NEXT).not.toHaveProperty("S9");
  });
});
