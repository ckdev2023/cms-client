import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  BUSINESS_PHASES,
  type BusinessPhase,
  PHASE_TO_STAGE_DEFAULT,
  STAGE_TO_PHASE_DEFAULT,
  isTerminalPhase,
} from "./businessPhase";
import { P0_STAGES, isP0Stage } from "./cases.workflow-step";

void describe("PHASE_TO_STAGE_DEFAULT — phase→stage sync mapping", () => {
  void test("covers all 20 business phases", () => {
    for (const phase of BUSINESS_PHASES) {
      assert.ok(
        phase in PHASE_TO_STAGE_DEFAULT,
        `Missing stage mapping for phase ${phase}`,
      );
    }
  });

  void test("all mapped stages are valid P0 stages (S1-S9)", () => {
    for (const phase of BUSINESS_PHASES) {
      const stage = PHASE_TO_STAGE_DEFAULT[phase];
      assert.equal(
        isP0Stage(stage),
        true,
        `Phase ${phase} maps to invalid stage ${stage}`,
      );
    }
  });

  void test("consistent with STAGE_TO_PHASE_DEFAULT — default phase for each stage maps back to that stage", () => {
    for (const stage of P0_STAGES) {
      const defaultPhase = STAGE_TO_PHASE_DEFAULT[stage];
      assert.equal(
        PHASE_TO_STAGE_DEFAULT[defaultPhase],
        stage,
        `Default phase ${defaultPhase} for stage ${stage} does not map back`,
      );
    }
  });
});

void describe("non-terminal phase stage sync — 6 representative phases", () => {
  const nonTerminalCases: [BusinessPhase, string][] = [
    ["CONSULTING", "S1"],
    ["CONTRACTED", "S1"],
    ["WAITING_MATERIAL", "S2"],
    ["APPLYING", "S5"],
    ["APPROVED", "S6"],
    ["SUCCESS", "S8"],
  ];

  for (const [phase, expectedStage] of nonTerminalCases) {
    void test(`${phase} → ${expectedStage}`, () => {
      assert.equal(
        isTerminalPhase(phase),
        false,
        `${phase} should not be terminal`,
      );
      assert.equal(PHASE_TO_STAGE_DEFAULT[phase], expectedStage);
    });
  }
});

void describe("terminal phase stage sync — both terminal phases map to S9", () => {
  void test("CLOSED_SUCCESS → S9", () => {
    assert.equal(isTerminalPhase("CLOSED_SUCCESS"), true);
    assert.equal(PHASE_TO_STAGE_DEFAULT.CLOSED_SUCCESS, "S9");
  });

  void test("CLOSED_FAILED → S9", () => {
    assert.equal(isTerminalPhase("CLOSED_FAILED"), true);
    assert.equal(PHASE_TO_STAGE_DEFAULT.CLOSED_FAILED, "S9");
  });
});

void describe("SQL CASE WHEN consistency — grouped phases share same stage", () => {
  void test("S5 group: APPLYING, UNDER_REVIEW, NEED_SUPPLEMENT, SUPPLEMENT_PROCESSING", () => {
    const s5Phases: BusinessPhase[] = [
      "APPLYING",
      "UNDER_REVIEW",
      "NEED_SUPPLEMENT",
      "SUPPLEMENT_PROCESSING",
    ];
    for (const phase of s5Phases) {
      assert.equal(
        PHASE_TO_STAGE_DEFAULT[phase],
        "S5",
        `${phase} should map to S5`,
      );
    }
  });

  void test("S6 group: APPROVED, REJECTED", () => {
    assert.equal(PHASE_TO_STAGE_DEFAULT.APPROVED, "S6");
    assert.equal(PHASE_TO_STAGE_DEFAULT.REJECTED, "S6");
  });

  void test("S7 group: WAITING_PAYMENT, COE_SENT, VISA_APPLYING, VISA_REJECTED", () => {
    const s7Phases: BusinessPhase[] = [
      "WAITING_PAYMENT",
      "COE_SENT",
      "VISA_APPLYING",
      "VISA_REJECTED",
    ];
    for (const phase of s7Phases) {
      assert.equal(
        PHASE_TO_STAGE_DEFAULT[phase],
        "S7",
        `${phase} should map to S7`,
      );
    }
  });

  void test("S8 group: SUCCESS, RESIDENCE_PERIOD_RECORDED, RENEWAL_REMINDER_SCHEDULED", () => {
    const s8Phases: BusinessPhase[] = [
      "SUCCESS",
      "RESIDENCE_PERIOD_RECORDED",
      "RENEWAL_REMINDER_SCHEDULED",
    ];
    for (const phase of s8Phases) {
      assert.equal(
        PHASE_TO_STAGE_DEFAULT[phase],
        "S8",
        `${phase} should map to S8`,
      );
    }
  });
});
