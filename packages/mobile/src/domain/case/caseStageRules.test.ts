import type { CaseStage } from "./Case";
import {
  isValidStageTransition,
  isTerminalStage,
  nextStages,
  canInitiateSupplement,
  isGateATransition,
  isGateBTransition,
  isGateCTransition,
} from "./caseStageRules";

describe("P0 case stage transitions (S1–S9)", () => {
  const HAPPY_PATH: [CaseStage, CaseStage][] = [
    ["S1", "S2"],
    ["S2", "S3"],
    ["S3", "S4"],
    ["S4", "S5"],
    ["S5", "S6"],
    ["S6", "S7"],
    ["S7", "S8"],
    ["S8", "S9"],
  ];

  it.each(HAPPY_PATH)("allows %s → %s (happy path)", (from, to) => {
    expect(isValidStageTransition(from, to)).toBe(true);
  });

  it("allows S3 → S2 (revision required, back to collecting)", () => {
    expect(isValidStageTransition("S3", "S2")).toBe(true);
  });

  it("allows S5 → S4 (validation failed, back to documents)", () => {
    expect(isValidStageTransition("S5", "S4")).toBe(true);
  });

  it("allows S5 → S3 (review rejection: materials issue)", () => {
    expect(isValidStageTransition("S5", "S3")).toBe(true);
  });

  const ILLEGAL_PAIRS: [CaseStage, CaseStage][] = [
    ["S1", "S3"],
    ["S1", "S7"],
    ["S2", "S4"],
    ["S4", "S6"],
    ["S6", "S8"],
    ["S7", "S6"],
    ["S8", "S7"],
    ["S9", "S1"],
    ["S9", "S8"],
  ];

  it.each(ILLEGAL_PAIRS)("blocks %s → %s", (from, to) => {
    expect(isValidStageTransition(from, to)).toBe(false);
  });
});

describe("S9 is terminal", () => {
  it("S9 has no next stages", () => {
    expect(isTerminalStage("S9")).toBe(true);
    expect(nextStages("S9")).toEqual([]);
  });

  it("S1–S8 are not terminal", () => {
    const nonTerminal: CaseStage[] = [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S7",
      "S8",
    ];
    for (const s of nonTerminal) {
      expect(isTerminalStage(s)).toBe(false);
    }
  });
});

describe("supplement cycle at S7", () => {
  it("can initiate supplement only at S7", () => {
    expect(canInitiateSupplement("S7")).toBe(true);
  });

  it("cannot initiate supplement at other stages", () => {
    const others: CaseStage[] = [
      "S1",
      "S2",
      "S3",
      "S4",
      "S5",
      "S6",
      "S8",
      "S9",
    ];
    for (const s of others) {
      expect(canInitiateSupplement(s)).toBe(false);
    }
  });

  it("S7 does not transition to S7 (supplement stays in S7, no stage change)", () => {
    expect(isValidStageTransition("S7", "S7")).toBe(false);
  });

  it("S7 only moves forward to S8", () => {
    expect(nextStages("S7")).toEqual(["S8"]);
  });
});

describe("Gate identification", () => {
  it("Gate-A is S3 → S4", () => {
    expect(isGateATransition("S3", "S4")).toBe(true);
    expect(isGateATransition("S2", "S4")).toBe(false);
  });

  it("Gate-B is S4 → S5", () => {
    expect(isGateBTransition("S4", "S5")).toBe(true);
    expect(isGateBTransition("S3", "S5")).toBe(false);
  });

  it("Gate-C is S6 → S7", () => {
    expect(isGateCTransition("S6", "S7")).toBe(true);
    expect(isGateCTransition("S5", "S7")).toBe(false);
  });
});
