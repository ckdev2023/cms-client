// ── Test Ownership ──────────────────────────────────────────────
// Owner: mutation response normalization (adaptCaseMutationResult,
//   adaptCaseTransitionResult).
// Does NOT test: list/detail adapters, write builders, or repository
//   orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseMutationResult,
  adaptCaseTransitionResult,
} from "./CaseAdapterMutationResults";

describe("adaptCaseMutationResult", () => {
  it("extracts id from valid response", () => {
    const result = adaptCaseMutationResult({ id: "case-001", stage: "S3" });
    expect(result).toEqual({ id: "case-001" });
  });

  it("returns null for non-object input", () => {
    expect(adaptCaseMutationResult(null)).toBeNull();
    expect(adaptCaseMutationResult("bad")).toBeNull();
    expect(adaptCaseMutationResult(42)).toBeNull();
  });

  it("returns null when id is missing", () => {
    expect(adaptCaseMutationResult({ stage: "S3" })).toBeNull();
  });

  it("returns null when id is empty string", () => {
    expect(adaptCaseMutationResult({ id: "" })).toBeNull();
  });

  it("returns null for array input", () => {
    expect(adaptCaseMutationResult([{ id: "case-001" }])).toBeNull();
  });
});

describe("adaptCaseTransitionResult", () => {
  it("delegates to adaptCaseMutationResult", () => {
    const result = adaptCaseTransitionResult({ id: "case-001" });
    expect(result).toEqual({ id: "case-001" });
  });

  it("returns null for invalid input", () => {
    expect(adaptCaseTransitionResult(null)).toBeNull();
  });
});
