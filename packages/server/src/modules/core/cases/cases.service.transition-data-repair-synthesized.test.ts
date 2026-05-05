import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { isBusinessPhase, isTerminalPhase } from "./businessPhase";

function shouldMarkDataRepair(
  fromStage: string,
  currentBusinessPhase: string,
): boolean {
  return (
    fromStage === "S1" &&
    isBusinessPhase(currentBusinessPhase) &&
    isTerminalPhase(currentBusinessPhase)
  );
}

void describe("transition data-repair synthesized flag", () => {
  void test("S1 + CLOSED_SUCCESS → synthesized=data_repair", () => {
    assert.equal(shouldMarkDataRepair("S1", "CLOSED_SUCCESS"), true);
  });

  void test("S1 + CLOSED_FAILED → synthesized=data_repair", () => {
    assert.equal(shouldMarkDataRepair("S1", "CLOSED_FAILED"), true);
  });

  void test("S1 + CONSULTING (non-terminal) → no mark", () => {
    assert.equal(shouldMarkDataRepair("S1", "CONSULTING"), false);
  });

  void test("S1 + APPROVED (non-terminal) → no mark", () => {
    assert.equal(shouldMarkDataRepair("S1", "APPROVED"), false);
  });

  void test("S3 + CLOSED_FAILED (not S1) → no mark", () => {
    assert.equal(shouldMarkDataRepair("S3", "CLOSED_FAILED"), false);
  });

  void test("S8 + CLOSED_SUCCESS (not S1) → no mark", () => {
    assert.equal(shouldMarkDataRepair("S8", "CLOSED_SUCCESS"), false);
  });

  void test("S1 + empty string → no mark", () => {
    assert.equal(shouldMarkDataRepair("S1", ""), false);
  });

  void test("S1 + garbage string → no mark", () => {
    assert.equal(shouldMarkDataRepair("S1", "NOT_A_PHASE"), false);
  });
});
